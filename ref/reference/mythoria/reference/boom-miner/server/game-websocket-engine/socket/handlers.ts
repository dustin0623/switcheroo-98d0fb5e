/**
 * server/game-websocket-engine/socket/handlers.ts
 *
 * Registers all Socket.IO event handlers for one connected socket.
 * Called once per connection from index.ts after auth middleware passes.
 *
 * Responsibilities:
 *  - Load session state from DB on connect (or resume from SessionBackfill).
 *  - Validate and apply mine:hit events in real time (optimistic, no DB write).
 *  - Increment mapVersion per-hit and mark session dirty.
 *  - On stage complete: flush immediately, rebuild from DB, push new map.
 *  - Handle session:sync, session:complete, and disconnect (Phase E).
 */

import type { Socket, Server } from "socket.io";
import type { SessionStore } from "../session/SessionStore";
import type { FlushScheduler } from "../session/FlushScheduler";
import { WS_EVENTS } from "./events";
import type {
  MineHitPayload,
  MineHitAckPayload,
  MineHitRejectPayload,
  HeroUndeployPayload,
  BombDetonatePayload,
  BombDetonateAckPayload,
  BombDetonateRejectPayload,
  HeroDeployPayload,
  HeroDeployAckPayload,
  HeroDeployRejectPayload,
  PlayerStatePayload,
} from "./events";
import { findPlayerByWallet } from "@/lib/modules/players/repository.server";
import { buildMineState } from "@/features/mine-action/build-state";
import { mineHit } from "@/features/events/mine-hit/action";
import { bombDetonate, type BombDetonateEnvelope } from "@/features/events/bomb-detonate/action";
import { heroDeploy } from "@/features/events/hero-deploy/action";
import { heroUndeploy } from "@/features/events/hero-undeploy/action";
import { getHeroesByWallet, setHeroOnMap, setHeroOffMap, catchUpOfflineRegen } from "@/lib/modules/heroes/repository.server";
import type { IHero } from "@/lib/modules/heroes/types.server";
import type { RosterHero } from "@/features/store/gameStore";
import { HERO_RARITY_DEFS, type HeroRarity } from "@/features/types/HeroRarity";
import type { MineState, HeroEnergyState } from "@/features/mine-action/types";
import type { SyncLogResponse } from "@/features/types/sync";
import type { WalletAuthority } from "../authority/WalletAuthority";

/**
 * How long a disconnected player's room is kept in memory before eviction.
 * During this window a reconnect resumes the exact live state with no DB read.
 * After it, the room is dropped and a later reconnect rebuilds from the
 * already-flushed stage_maps fallback (same map).
 */
const ROOM_RETENTION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Maps the server-internal MineState shape to the SyncLogResponse["canonicalState"]
 * shape expected by the client's MapManager.applyServerState().
 * Key difference: MineState nodes use `coinReward`, canonicalState expects `coins`.
 */
function toCanonicalState(s: MineState): SyncLogResponse["canonicalState"] {
  const nodes: SyncLogResponse["canonicalState"]["nodes"] = {};
  for (const [key, n] of Object.entries(s.nodes)) {
    nodes[key] = {
      x:         n.x,
      y:         n.y,
      kind:      n.kind,
      rarity:    n.rarity,
      maxHp:     n.maxHp,
      hp:        n.hp,
      coins:     n.coinReward,
      destroyed: n.destroyed,
    };
  }
  const heroes: SyncLogResponse["canonicalState"]["heroes"] = {};
  for (const [id, h] of Object.entries(s.heroes)) {
    heroes[id] = { currentEnergy: h.currentEnergy, maxEnergy: h.maxEnergy };
  }
  return {
    nodes,
    heroes,
    coins:          s.coins,
    stage:          s.stage,
    totalNodes:     s.totalNodes,
    destroyedNodes: s.destroyedNodes,
  };
}

/**
 * Maps a lean IHero doc into the RosterHero shape the pure heroDeploy /
 * heroUndeploy event functions expect. Only the fields those functions read
 * (id, owner, onMap, currentEnergy) truly matter, but we build the full shape
 * so the types line up with the shared event contracts.
 */
function toRosterHero(h: IHero): RosterHero {
  return {
    id:            String(h._id),
    name:          h.name,
    minted_number: h.minted_number,
    description:   "",
    image:         null,
    owner:         h.ownerWallet,
    level:         h.level,
    rarity:        h.rarity ?? null,
    attributes: {
      power:       h.attributes.power,
      speed:       h.attributes.speed,
      stamina:     h.attributes.stamina,
      bomb_number: h.attributes.bombNumber,
      bomb_range:  h.attributes.bombRange,
    },
    market: {
      listed:  h.market.listed,
      price:   h.market.price,
      seller:  h.market.seller,
      created: h.market.created,
      sold:    h.market.sold,
    },
    type:          h.type,
    rarityLabel:   HERO_RARITY_DEFS[h.rarity as HeroRarity]?.label ?? h.rarity,
    currentEnergy: h.currentEnergy,
    maxEnergy:     h.maxEnergy,
    onMap:         h.onMap,
  };
}

export async function registerHandlers(
  socket:    Socket,
  io:        Server,
  store:     SessionStore,
  flusher:   FlushScheduler,
  authority: WalletAuthority,
): Promise<void> {
  const wallet = socket.data.wallet as string;
  const lease = await authority.acquire(wallet);
  if (!lease) {
    socket.emit(WS_EVENTS.SESSION_ERROR, { message: "WALLET_ACTIVE_ELSEWHERE" });
    socket.disconnect(true);
    return;
  }

  // ------------------------------------------------------------------
  // 1. Load session state on connect from stage_maps (canonical source of truth).
  //    Also load the full hero roster once — no further DB reads needed for
  //    heroes during the session lifetime.
  // ------------------------------------------------------------------
  const [dbState, dbHeroes] = await Promise.all([
    buildMineState(wallet),
    getHeroesByWallet(wallet),
  ]);

  if (!dbState) {
    socket.emit(WS_EVENTS.SESSION_ERROR, { message: "MAP_NOT_FOUND" });
    socket.disconnect(true);
    return;
  }

  // Build the in-memory hero pool from the one DB read.
  const heroRoster = new Map<string, IHero>(
    dbHeroes.map((h) => [String(h._id), h]),
  );
  const heroEnergy = new Map<string, number>(
    dbHeroes.map((h) => [String(h._id), h.currentEnergy]),
  );

  const resolvedState = dbState;

  let initialState = resolvedState;

  // Resume-or-replace: reuse any retained room for this wallet.
  //  - Reconnect after a network drop: the old socket is already gone, the room
  //    was retained in memory, and we resume from its live state (DB untouched).
  //  - Second browser tab: the old socket is still live, so we kick it first to
  //    prevent duplicate energy consumption and split SessionStore entries.
  // Either way the in-memory room is the source of truth; DB is only a fallback
  // for when no room exists (see buildMineState above).
  // Final hero roster/energy used when creating the session entry.
  // On reconnect we reuse the existing room's maps (already in-memory and
  // up-to-date) rather than the freshly loaded DB snapshot.
  let sessionHeroRoster = heroRoster;
  let sessionHeroEnergy = heroEnergy;

  const existing = store.get(wallet);
  if (existing && existing.socketId !== socket.id) {
    // Cancel any pending grace-period eviction — the player is back.
    if (existing.evictTimer) {
      clearTimeout(existing.evictTimer);
      existing.evictTimer = undefined;
    }
    existing.disconnected = false;

    const oldSocket = io.sockets.sockets.get(existing.socketId);
    if (oldSocket) {
      oldSocket.emit(WS_EVENTS.SESSION_ERROR, { message: "REPLACED_BY_NEW_TAB" });
      oldSocket.disconnect(true);
    }
    // Flush pending dirty state from the evicted session before dropping it.
    if (existing.dirty) {
      await flusher.flushOne(existing).catch((err) =>
        console.error(`[handlers] pre-eviction flush failed for ${wallet}:`, err),
      );
    }
    // The evicted session's in-memory state is newer than what we read from DB.
    // Use it directly so the new tab picks up the unflushed hits.
    // Also carry forward the in-memory hero roster/energy — they reflect any
    // mid-session energy deductions not yet flushed.
    initialState = existing.stageAdvanced
      ? (await buildMineState(wallet)) ?? existing.state
      : structuredClone(existing.state);
    sessionHeroRoster = existing.heroRoster;
    sessionHeroEnergy = existing.heroEnergy;
    store.delete(wallet);
    console.log(`[handlers] wallet ${wallet} — evicted previous tab (socketId: ${existing.socketId})`);
  }

  store.set(wallet, {
    wallet,
    state:            initialState,
    dirty:            false,
    revision:         0,
    flushPromise:     null,
    lease,
    socketId:         socket.id,
    connectedAt:      Date.now(),
    lastActionAt:     initialState.lastActionAt ?? 0,
    lastFlushedState: structuredClone(initialState),
    isNew:            false,
    lastRegenAt:      Date.now(),
    lastSeq:          0,
    lastAckPayload:   null,
    heroRoster:       sessionHeroRoster,
    heroEnergy:       sessionHeroEnergy,
  });

  // Apply offline regen catch-up for resting heroes before pushing state.
  // The RegenScheduler only ticks while a session is live; heroes that were
  // depleted before the player logged out need their energy topped up by
  // however much time has elapsed since the last regen write (lastRegenAt).
  // We await this so the very first SESSION_STATE push has correct energy.
  await catchUpOfflineRegen(wallet).catch((err) =>
    console.error(`[handlers] catchUpOfflineRegen failed for ${wallet}:`, err),
  );

  // Reload hero energies from DB after the catch-up write so the in-memory
  // heroEnergy map and heroRoster reflect the updated values. Without this
  // the session entry's heroEnergy map still holds the pre-catch-up snapshot,
  // meaning subsequent deploys would use stale depleted energy and Phase 3's
  // setHeroOffMap would re-bury the correct value with the old one.
  // Also sync on-map hero energies into initialState.heroes so the first
  // SESSION_STATE push reflects the correct values without a round trip.
  const entry = store.get(wallet);
  if (entry) {
    try {
      const refreshedHeroes = await getHeroesByWallet(wallet);
      for (const h of refreshedHeroes) {
        const hid = String(h._id);
        // Update the in-memory energy map with the post-catch-up DB value.
        entry.heroEnergy.set(hid, h.currentEnergy);
        // Update the roster so toRosterHero() reads fresh energy too.
        entry.heroRoster.set(hid, h);
        // If this hero is currently on the map, patch initialState too.
        if (entry.state.heroes[hid] !== undefined) {
          entry.state.heroes[hid] = {
            ...entry.state.heroes[hid],
            currentEnergy: h.currentEnergy,
          };
        }
      }
    } catch (err) {
      console.error(`[handlers] post-catch-up hero refresh failed for ${wallet}:`, err);
      // Non-fatal — the DB values are correct; only the in-memory map is stale.
    }
  }

  // Push canonical state to client immediately on connect.
  // Resting hero energies are served by the bootstrap HTTP route (which reads
  // directly from DB), so they already reflect the just-applied catch-up regen.
  // Only on-map heroes live in initialState.heroes, so no patch is needed here.
  // Shape as SyncLogResponse["canonicalState"] so the client's MapManager
  // applyServerState() receives the expected field names (coins, not coinReward).
  const currentEntry = store.get(wallet);
  socket.emit(WS_EVENTS.SESSION_STATE, { canonicalState: toCanonicalState(currentEntry?.state ?? initialState) });

  // ------------------------------------------------------------------
  // 2. mine:hit — validate and apply a single bomb hit.
  // ------------------------------------------------------------------
  socket.on(WS_EVENTS.MINE_HIT, async (payload: MineHitPayload) => {
    const entry = store.get(wallet);
    if (!entry) {
      const reject: MineHitRejectPayload = { seq: payload.seq, code: "SESSION_GONE", reason: "Session not found" };
      socket.emit(WS_EVENTS.MINE_HIT_REJECT, reject);
      return;
    }

    let shouldAdvanceStage = false;
    const previousOperation = entry.flushPromise ?? Promise.resolve();
    const mutation = previousOperation.catch(() => undefined).then(async () => {
      if (store.get(wallet) !== entry) return;

      const now = Date.now();
      const result = mineHit({
        state: entry.state,
        action: { type: "node.hit", heroId: payload.heroId, nodeKey: payload.nodeKey },
        createdAt: now,
      });

      if (!result.ok) {
        const reject: MineHitRejectPayload = {
          seq: payload.seq,
          code: result.code ?? "REJECTED",
          reason: result.error ?? "Hit rejected",
        };
        socket.emit(WS_EVENTS.MINE_HIT_REJECT, reject);
        return;
      }

      const nextState: MineState = {
        ...result.newState!,
        mapVersion: entry.state.mapVersion + 1,
        lastActionAt: now,
      };

      entry.state = nextState;
      entry.revision += 1;
      entry.dirty = true;
      entry.lastActionAt = now;
      shouldAdvanceStage = result.stageComplete;

      const ack: MineHitAckPayload = {
        seq: payload.seq,
        coinsEarned: result.coinsEarned,
        destroyed: result.destroyed,
        stageComplete: result.stageComplete,
        nodeHp: nextState.nodes[payload.nodeKey]?.hp ?? 0,
        eventType: result.eventType,
      };
      socket.emit(WS_EVENTS.MINE_HIT_ACK, ack);

      const heroAfterHit = nextState.heroes[payload.heroId];
      if (heroAfterHit && heroAfterHit.currentEnergy <= 0) {
        const undeploy: HeroUndeployPayload = { heroId: payload.heroId };
        socket.emit(WS_EVENTS.HERO_UNDEPLOY, undeploy);
      }
    });

    entry.flushPromise = mutation;
    try {
      await mutation;
    } finally {
      if (entry.flushPromise === mutation) entry.flushPromise = null;
    }

    if (shouldAdvanceStage) {
      await flusher.flushOne(entry);
      if (entry.stageAdvanced && entry.lastFlushedState) {
        entry.stageAdvanced = false;
        entry.state = structuredClone(entry.lastFlushedState);
        entry.dirty = false;
        socket.emit(WS_EVENTS.SESSION_STATE, { canonicalState: toCanonicalState(entry.state) });
      }
    }
  });

  // ------------------------------------------------------------------
  // 2b. bomb:detonate — validate and apply a whole bomb blast.
  //     One detonation = 1 energy + `power` damage to every node hit.
  //     This is the canonical unit of play; mine:hit is kept for compat.
  // ------------------------------------------------------------------
  socket.on(WS_EVENTS.BOMB_DETONATE, async (payload: BombDetonatePayload) => {
    const sessionId = socket.data.sessionId as string;
    if (payload.sessionId !== sessionId) {
      const reject: BombDetonateRejectPayload = {
        sessionId,
        seq: payload.seq,
        code: "SESSION_MISMATCH",
        reason: "Event does not belong to this authenticated gameplay session",
      };
      socket.emit(WS_EVENTS.BOMB_DETONATE_REJECT, reject);
      return;
    }

    const entry = store.get(wallet);
    if (!entry) {
      const reject: BombDetonateRejectPayload = { sessionId, seq: payload.seq, code: "SESSION_GONE", reason: "Session not found" };
      socket.emit(WS_EVENTS.BOMB_DETONATE_REJECT, reject);
      return;
    }

    const previousOperation = entry.flushPromise ?? Promise.resolve();
    const mutation = previousOperation.catch(() => undefined).then(async () => {
      if (store.get(wallet) !== entry) return;

      // --- In-memory dedup (replaces game_event_journal) ---
      // If the client retries after a lost ACK, the seq will equal lastSeq.
      // Resend the cached ACK without re-running the simulation.
      if (payload.seq <= entry.lastSeq) {
        if (entry.lastAckPayload && payload.seq === entry.lastSeq) {
          socket.emit(WS_EVENTS.BOMB_DETONATE_ACK, entry.lastAckPayload);
        } else {
          socket.emit(WS_EVENTS.BOMB_DETONATE_REJECT, {
            sessionId,
            seq: payload.seq,
            code: "STALE_SEQUENCE",
            reason: "Sequence is older than last accepted event",
          } satisfies BombDetonateRejectPayload);
        }
        return;
      }

      const MAX_FUTURE_SEQ_GAP = 1_000;
      if (payload.seq > entry.lastSeq + MAX_FUTURE_SEQ_GAP) {
        socket.emit(WS_EVENTS.BOMB_DETONATE_REJECT, {
          sessionId,
          seq: payload.seq,
          code: "FUTURE_SEQUENCE",
          reason: "Sequence is unreasonably far ahead of last accepted event",
        } satisfies BombDetonateRejectPayload);
        return;
      }

      const now = Date.now();
      const envelope: BombDetonateEnvelope = {
        wallet,
        sessionId,
        seq: payload.seq,
        type: "bomb.detonate",
        heroId: payload.heroId,
        nodeKeys: [...new Set(payload.nodeKeys)],
        createdAt: now,
      };

      const prevState = structuredClone(entry.state);

      const result = bombDetonate({
        state: entry.state,
        action: envelope,
        createdAt: envelope.createdAt,
      });

      if (!result.ok) {
        const reject: BombDetonateRejectPayload = {
          sessionId,
          seq: payload.seq,
          code: result.code ?? "REJECTED",
          reason: result.error ?? "Detonation rejected",
        };
        socket.emit(WS_EVENTS.BOMB_DETONATE_REJECT, reject);
        return;
      }

      const nextState: MineState = {
        ...result.newState!,
        mapVersion: entry.state.mapVersion + 1,
        lastActionAt: now,
      };

      entry.state = nextState;
      entry.revision += 1;
      entry.dirty = true;
      entry.lastActionAt = now;

      if (result.heroEnergy <= 0) {
        const undeploy: HeroUndeployPayload = { heroId: payload.heroId };
        socket.emit(WS_EVENTS.HERO_UNDEPLOY, undeploy);
      }

      const renewedLease = await authority.renew(entry.lease);
      if (!renewedLease || store.get(wallet) !== entry) {
        // Roll back optimistic mutation — authority is gone
        entry.state = prevState;
        entry.revision = Math.max(0, entry.revision - 1);
        entry.dirty = false;
        socket.emit(WS_EVENTS.BOMB_DETONATE_REJECT, {
          sessionId,
          seq: payload.seq,
          code: "STALE_AUTHORITY",
          reason: "Wallet authority changed; reconnect before retrying",
        } satisfies BombDetonateRejectPayload);
        return;
      }
      entry.lease = renewedLease;

      const ack: BombDetonateAckPayload = {
        sessionId,
        seq: payload.seq,
        durability: "in-memory",
        mapVersion: result.stageComplete ? 0 : nextState.mapVersion,
        coinsTotal: nextState.coins,
        stage: result.stageComplete ? nextState.stage + 1 : nextState.stage,
        heroId: payload.heroId,
        heroEnergy: result.heroEnergy,
        destroyedKeys: result.destroyedKeys,
        stageComplete: result.stageComplete,
      };

      // Advance in-memory dedup cursor BEFORE emitting the ACK
      entry.lastSeq = payload.seq;
      entry.lastAckPayload = ack;

      socket.emit(WS_EVENTS.BOMB_DETONATE_ACK, ack);

      // On stage complete, flush immediately and broadcast the new canonical state
      if (result.stageComplete) {
        await flusher.flushOne(entry).catch((err) =>
          console.error(`[handlers] stage-complete flush failed for ${wallet}:`, err),
        );
        const canonical = await buildMineState(wallet);
        if (canonical && store.get(wallet) === entry) {
          entry.state = structuredClone(canonical);
          entry.lastFlushedState = structuredClone(canonical);
          entry.dirty = false;
          entry.lastSeq = 0;
          entry.lastAckPayload = null;
          socket.emit(WS_EVENTS.SESSION_STATE, { canonicalState: toCanonicalState(canonical) });
        }
      }
    });

    entry.flushPromise = mutation;
    try {
      await mutation;
    } finally {
      if (entry.flushPromise === mutation) entry.flushPromise = null;
    }
  });

  // ------------------------------------------------------------------
  // 2c. hero:deploy — deploy (onMap:true) or recall (onMap:false) a hero.
  //     Validates against the live DB roster, persists onMap, and mutates the
  //     in-memory room so the deployed hero immediately starts/stops mining
  //     and burning energy. The room is the source of truth; DB is the flush
  //     target + fallback.
  // ------------------------------------------------------------------
  socket.on(WS_EVENTS.HERO_DEPLOY, async (payload: HeroDeployPayload) => {
    const entry = store.get(wallet);
    if (!entry) {
      const reject: HeroDeployRejectPayload = {
        seq: payload.seq, heroId: payload.heroId, onMap: payload.onMap,
        code: "SESSION_GONE", reason: "Session not found",
      };
      socket.emit(WS_EVENTS.HERO_DEPLOY_REJECT, reject);
      return;
    }

    // Serialize behind any in-flight mutation so the roster read and the
    // energy accounting can't interleave with a concurrent detonation.
    const previousOperation = entry.flushPromise ?? Promise.resolve();
    const mutation = previousOperation.catch(() => undefined).then(async () => {
      if (store.get(wallet) !== entry) return;

      // Validate against the in-memory hero roster loaded at session start.
      // No DB read required — the roster is the authoritative stat pool for
      // the entire session lifetime.
      const roster = Array.from(entry.heroRoster.values()).map(toRosterHero);
      // Reflect the current in-memory energy so the deploy functions see the
      // latest value (may differ from the DB if a flush hasn't fired yet).
      for (const rh of roster) {
        const liveEnergy = entry.heroEnergy.get(rh.id);
        if (liveEnergy !== undefined) rh.currentEnergy = liveEnergy;
      }
      const eventResult = payload.onMap
        ? heroDeploy({ state: { wallet, heroes: roster }, action: { heroId: payload.heroId } })
        : heroUndeploy({ state: { wallet, heroes: roster }, action: { heroId: payload.heroId } });

      if (!eventResult.ok) {
        const reject: HeroDeployRejectPayload = {
          seq: payload.seq, heroId: payload.heroId, onMap: payload.onMap,
          code: eventResult.code ?? "DEPLOY_REJECTED", reason: eventResult.error ?? "Deploy rejected",
        };
        socket.emit(WS_EVENTS.HERO_DEPLOY_REJECT, reject);
        return;
      }

      const heroId = payload.heroId;

      if (!payload.onMap) {
        // ---------------------------------------------------------------
        // UNDEPLOY — immediate targeted DB write before ACK (Phase 3).
        //
        // Energy must be durable right now: if the player closes the tab
        // immediately after this ACK, the periodic flush may never fire
        // and the hero's energy would revert to the last-persisted value,
        // granting free recovery. Writing synchronously here closes the gap.
        //
        // setHeroOffMap does NOT re-validate energy/MAX_ON_MAP — validation
        // already happened in the heroUndeploy event above. It only writes
        // the authoritative depleted energy alongside onMap=false.
        // ---------------------------------------------------------------
        const liveEnergy = entry.heroEnergy.get(heroId) ?? 0;
        const persisted = await setHeroOffMap(wallet, heroId, liveEnergy);
        if (!persisted) {
          const reject: HeroDeployRejectPayload = {
            seq: payload.seq, heroId, onMap: false,
            code: "STALE_STATE", reason: "Hero not found — please retry",
          };
          socket.emit(WS_EVENTS.HERO_DEPLOY_REJECT, reject);
          return;
        }

        // Remove from in-memory state so energy stops burning.
        const nextHeroes = { ...entry.state.heroes };
        delete nextHeroes[heroId];
        entry.state = { ...entry.state, heroes: nextHeroes };
        // heroEnergy map retains the value — resting energy is still tracked
        // so the flush can persist the correct value for off-map heroes too.
        // Mark dirty so the next periodic flush picks up the rest of state
        // (coins, map nodes) without needing a separate flush call here.
        // Note: we do NOT set dirty=false — the periodic flush still handles
        // the rest of the session state.
        entry.dirty = true;
        entry.revision += 1;

        const ack: HeroDeployAckPayload = {
          seq: payload.seq, heroId, onMap: false, currentEnergy: liveEnergy,
        };
        socket.emit(WS_EVENTS.HERO_DEPLOY_ACK, ack);
        return;
      }

      // ---------------------------------------------------------------
      // DEPLOY — repository re-checks energy threshold + MAX_ON_MAP.
      // ---------------------------------------------------------------
      const hero = await setHeroOnMap(wallet, payload.heroId, true);
      if (!hero) {
        const reject: HeroDeployRejectPayload = {
          seq: payload.seq, heroId, onMap: true,
          code: "STALE_STATE", reason: "Deploy state changed — please retry",
        };
        socket.emit(WS_EVENTS.HERO_DEPLOY_REJECT, reject);
        return;
      }

      // Use the in-memory energy (may be lower than DB if flush hasn't fired).
      const liveEnergy = entry.heroEnergy.get(heroId) ?? hero.currentEnergy;
      const energyState: HeroEnergyState = {
        _id:           heroId,
        currentEnergy: liveEnergy,
        maxEnergy:     hero.maxEnergy,
        power:         Math.max(1, hero.attributes?.power ?? 1),
        lastActionAt:  0,
      };
      entry.state = { ...entry.state, heroes: { ...entry.state.heroes, [heroId]: energyState } };
      // Keep heroEnergy map in sync — it's now reflecting the on-map hero.
      entry.heroEnergy.set(heroId, liveEnergy);

      const ack: HeroDeployAckPayload = {
        seq: payload.seq, heroId, onMap: hero.onMap, currentEnergy: liveEnergy,
      };
      socket.emit(WS_EVENTS.HERO_DEPLOY_ACK, ack);
    });

    entry.flushPromise = mutation;
    try {
      await mutation;
    } finally {
      if (entry.flushPromise === mutation) entry.flushPromise = null;
    }
  });

  // ------------------------------------------------------------------
  // 3. session:sync — push current canonical state on demand.
  // ------------------------------------------------------------------
  socket.on(WS_EVENTS.SESSION_SYNC, () => {
    const entry = store.get(wallet);
    if (!entry) return;
    socket.emit(WS_EVENTS.SESSION_STATE, { canonicalState: toCanonicalState(entry.state) });
  });

  // ------------------------------------------------------------------
  // 3b. player:sync — authoritative off-map economy + roster push.
  //     Read-only: never mutates the in-memory mine session. The client fires
  //     this after its poller detects a settled mint/withdrawal, and we reply
  //     with fresh coins + stage + roster straight from the DB so balance and
  //     hero list can't drift from server truth.
  // ------------------------------------------------------------------
  socket.on(WS_EVENTS.PLAYER_SYNC, async () => {
    try {
      const [player, freshHeroes] = await Promise.all([
        findPlayerByWallet(wallet),
        getHeroesByWallet(wallet),
      ]);

      // Refresh the in-memory hero pool — a mint or withdrawal may have added
      // or removed heroes since the session started.
      const sessionEntry = store.get(wallet);
      if (sessionEntry) {
        for (const h of freshHeroes) {
          const hid = String(h._id);
          sessionEntry.heroRoster.set(hid, h);
          // Only update heroEnergy if we don't already have a live (lower) value.
          // This preserves any mid-session energy deductions not yet flushed.
          if (!sessionEntry.heroEnergy.has(hid)) {
            sessionEntry.heroEnergy.set(hid, h.currentEnergy);
          }
        }
      }

      const syncPayload: PlayerStatePayload = {
        coins:  (player as { coins?: number } | null)?.coins ?? 0,
        stage:  (player as { stage?: number } | null)?.stage ?? 1,
        heroes: freshHeroes.map(toRosterHero),
      };
      socket.emit(WS_EVENTS.PLAYER_STATE, syncPayload);
    } catch (err) {
      console.error(`[handlers] player:sync failed for ${wallet}:`, err);
    }
  });

  // ------------------------------------------------------------------
  // 4. session:complete — stage cleared, flush immediately.
  // ------------------------------------------------------------------
  socket.on(WS_EVENTS.SESSION_COMPLETE, async () => {
    const entry = store.get(wallet);
    if (!entry) return;
    try {
      await flusher.flushOne(entry);
      console.log(`[handlers] wallet ${wallet} session:complete — immediate flush done`);
    } catch (err) {
      console.error(`[handlers] session:complete flush failed for ${wallet}:`, err);
    }
  });

  // ------------------------------------------------------------------
  // 5. disconnect — flush dirty state, then RETAIN the room so the player
  //    can reconnect into the exact same live map. The room (and its live
  //    MineState) stays in memory as the source of truth; the stage_maps DB
  //    doc is only a fallback. To avoid an unbounded memory leak for players
  //    who never return, the room is evicted after a grace period — by then
  //    the disconnect flush has already persisted the identical map to DB, so
  //    a later reconnect rebuilds the same state from the fallback.
  // ------------------------------------------------------------------
  socket.on("disconnect", async (reason: string) => {
    console.log(`[handlers] wallet ${wallet} disconnected (${reason})`);
    const entry = store.get(wallet);

    if (entry && entry.dirty) {
      try {
        await flusher.flushOne(entry);
        console.log(`[handlers] disconnect flush succeeded for ${wallet}`);
      } catch (err) {
        // Flush failed — schedule a retry via the FlushScheduler backoff queue.
        // The room stays dirty so the eviction guard won't release it until the
        // retry succeeds and clears dirty=false.
        console.error(`[handlers] disconnect flush failed for ${wallet} — queuing retry:`, err);
        flusher.scheduleRetry(wallet);
      }
    }

    // Only arm retention if this socket is still the active one (a reconnect or
    // new tab may have already replaced the room with a fresh entry).
    const current = store.get(wallet);
    if (!current || current.socketId !== socket.id) return;

    current.disconnected = true;
    if (current.evictTimer) clearTimeout(current.evictTimer);
    current.evictTimer = setTimeout(() => {
      void (async () => {
        const still = store.get(wallet);
        // Never discard dirty or in-flight state. The retry queue in
        // FlushScheduler will keep attempting to flush — once it succeeds and
        // dirty is cleared the next eviction tick will be allowed through.
        if (!still || still.socketId !== socket.id || !still.disconnected) return;
        if (still.dirty || still.flushPromise) {
          // Re-arm the timer so we check again after another grace period
          // rather than orphaning the room forever on a dirty state.
          console.warn(`[handlers] wallet ${wallet} still dirty at eviction deadline — extending retention`);
          current.evictTimer = setTimeout(() => {
            void (async () => {
              const retry = store.get(wallet);
              if (!retry || retry.socketId !== socket.id || !retry.disconnected) return;
              if (retry.dirty || retry.flushPromise) {
                console.error(`[handlers] wallet ${wallet} could not be flushed within extended retention — evicting anyway to prevent memory leak`);
              } else {
                // Clean now — fall through to normal release below.
              }
              if (!(await authority.assertCurrent(retry.lease))) return;
              store.delete(wallet);
              await authority.release(wallet, retry.lease.fencingToken);
              console.log(`[handlers] wallet room evicted after extended retention for ${wallet}`);
            })().catch((error) => console.error("[handlers] extended eviction failed:", error));
          }, ROOM_RETENTION_MS);
          return;
        }
        if (!(await authority.assertCurrent(still.lease))) return;
        store.delete(wallet);
        await authority.release(wallet, still.lease.fencingToken);
        console.log(`[handlers] wallet room evicted after ${ROOM_RETENTION_MS}ms grace period`);
      })().catch((error) => console.error("[handlers] room eviction failed:", error));
    }, ROOM_RETENTION_MS);
    console.log(`[handlers] wallet ${wallet} room retained for reconnect (${ROOM_RETENTION_MS}ms grace)`);
  });
}
