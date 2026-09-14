import type { SessionEntry, SessionStore } from "./SessionStore";
import { persistMineAction } from "@/features/mine-action/persist";
import { buildMineState } from "@/features/mine-action/build-state";
import { persistOffMapHeroEnergies } from "@/lib/modules/heroes/repository.server";

const FLUSH_INTERVAL_MS = 5_000;

// Retry backoff steps in ms. After the last step retries continue at that
// interval until the entry is evicted or the flush finally succeeds.
const RETRY_BACKOFF_MS = [5_000, 10_000, 20_000, 30_000];

interface RetryEntry {
  wallet:    string;
  attempts:  number;
  nextRetry: number; // unix-ms
}

// -------------------------------------------------------------------------
// Operational metrics — in-process counters surfaced via getMetrics() so
// that dashboards or health-check endpoints can alert on sustained failures.
// These are process-local (not persisted) — sufficient for alerting during a
// running session without adding a metrics store dependency.
// -------------------------------------------------------------------------
interface FlushMetrics {
  /** Total number of flush attempts across all wallets since process start. */
  flushAttempts:      number;
  /** Successful flushes (dirty → clean). */
  flushSuccesses:     number;
  /** Flush failures that triggered a retry schedule. */
  flushFailures:      number;
  /** Successful retries (flush succeeded after at least one prior failure). */
  retrySuccesses:     number;
  /** Retry attempts that also failed (increments per-failure, not per-wallet). */
  retryFailures:      number;
  /** Current number of wallets in the retry backoff queue. */
  retryQueueDepth:    number;
}

function cloneState<T>(value: T): T {
  return structuredClone(value);
}

export class FlushScheduler {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  // wallets that failed a flush and are waiting for a retry
  private retryQueue = new Map<string, RetryEntry>();
  // In-process operational counters (Phase 4)
  private metrics: FlushMetrics = {
    flushAttempts:   0,
    flushSuccesses:  0,
    flushFailures:   0,
    retrySuccesses:  0,
    retryFailures:   0,
    retryQueueDepth: 0,
  };

  constructor(private readonly store: SessionStore) {}

  start(): void {
    if (this.intervalId !== null) return;
    this.intervalId = setInterval(() => {
      this.tickRetryQueue().catch((err) =>
        console.error("[FlushScheduler] retry tick failed:", err),
      );
      this.flushAll().catch((error) =>
        console.error("[FlushScheduler] periodic flush failed:", error),
      );
    }, FLUSH_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId !== null) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  /**
   * Returns a snapshot of the operational flush metrics.
   * Intended for health-check endpoints or dashboards — a sustained increase
   * in retryFailures or a growing retryQueueDepth signals a DB connectivity
   * problem and should trigger an alert.
   */
  getMetrics(): Readonly<FlushMetrics> {
    return { ...this.metrics, retryQueueDepth: this.retryQueue.size };
  }

  /** Enqueue a wallet for retried flushing after a failed attempt. */
  scheduleRetry(wallet: string): void {
    const existing = this.retryQueue.get(wallet);
    const attempts = existing ? existing.attempts : 0;
    const delay = RETRY_BACKOFF_MS[Math.min(attempts, RETRY_BACKOFF_MS.length - 1)];
    this.retryQueue.set(wallet, { wallet, attempts: attempts + 1, nextRetry: Date.now() + delay });
    this.metrics.flushFailures += 1;
    console.warn(
      `[FlushScheduler] retry #${attempts + 1} scheduled for ${wallet} in ${delay}ms` +
      ` (total failures: ${this.metrics.flushFailures}, queue depth: ${this.retryQueue.size})`,
    );
  }

  /** Called on every interval tick — fires any retries that are due. */
  private async tickRetryQueue(): Promise<void> {
    const now = Date.now();
    const due = Array.from(this.retryQueue.values()).filter(r => r.nextRetry <= now);
    for (const r of due) {
      const entry = this.store.get(r.wallet);
      if (!entry || !entry.dirty) {
        // Session gone or already clean — no longer needs retrying.
        this.retryQueue.delete(r.wallet);
        continue;
      }
      try {
        await this.flushOne(entry);
        this.retryQueue.delete(r.wallet);
        this.metrics.retrySuccesses += 1;
        console.log(
          `[FlushScheduler] retry succeeded for ${r.wallet} after ${r.attempts} attempt(s)` +
          ` (total retry successes: ${this.metrics.retrySuccesses})`,
        );
      } catch (err) {
        this.metrics.retryFailures += 1;
        console.error(
          `[FlushScheduler] retry #${r.attempts} failed for ${r.wallet}` +
          ` (total retry failures: ${this.metrics.retryFailures}):`,
          err,
        );
        // Re-schedule: compute next delay from the CURRENT attempt count so we
        // don't double-increment (scheduleRetry reads existing.attempts from the
        // map, which already has the incremented value from the previous call).
        const nextDelay = RETRY_BACKOFF_MS[Math.min(r.attempts, RETRY_BACKOFF_MS.length - 1)];
        this.retryQueue.set(r.wallet, {
          wallet:    r.wallet,
          attempts:  r.attempts + 1,
          nextRetry: Date.now() + nextDelay,
        });
        console.warn(
          `[FlushScheduler] retry #${r.attempts + 1} scheduled for ${r.wallet}` +
          ` in ${nextDelay}ms (queue depth: ${this.retryQueue.size})`,
        );
      }
    }
  }

  async flushAll(): Promise<void> {
    const tasks = Array.from(this.store.all(), (entry) =>
      entry.dirty ? this.flushOne(entry) : Promise.resolve(),
    );
    await Promise.allSettled(tasks);
  }

  /** Queue a flush behind any write already running for this wallet. */
  async flushOne(entry: SessionEntry): Promise<void> {
    const previous = entry.flushPromise ?? Promise.resolve();
    const queued = previous
      .catch(() => undefined)
      .then(() => this.performFlush(entry));
    entry.flushPromise = queued;

    try {
      await queued;
    } finally {
      if (entry.flushPromise === queued) entry.flushPromise = null;
    }
  }

  private async performFlush(entry: SessionEntry): Promise<void> {
    if (!entry.dirty) return;

    const prevState = entry.lastFlushedState;
    if (!prevState) {
      console.error(
        `[FlushScheduler] missing canonical baseline for ${entry.wallet} (isNew=${entry.isNew})`,
      );
      // New-map insertion needs an explicit persistence path. Never manufacture
      // version zero for a live persisted session.
      return;
    }

    // Capture both values before awaiting. A hit accepted while persistence is
    // in flight changes entry.revision and remains dirty for the queued flush.
    const revision = entry.revision;
    const snapshot = cloneState(entry.state);
    const baseline = cloneState(prevState);
    const stageComplete =
      snapshot.totalNodes > 0 && snapshot.destroyedNodes >= snapshot.totalNodes;

    const result = await persistMineAction({
      prevState: baseline,
      nextState: snapshot,
      stageComplete,
    });

    // Never retry a conflict by writing this stale absolute snapshot over a
    // newly loaded baseline. Event-aware handlers replay their original action
    // against fresh canonical state; aggregate flushes remain dirty and visible.
    if (result.status === "conflict") {
      const freshBaseline = await buildMineState(entry.wallet);
      console.warn(
        `[FlushScheduler] conflict for ${entry.wallet}; stale snapshot not retried` +
          (freshBaseline ? ` (canonical version ${freshBaseline.mapVersion})` : ""),
      );
    }

    if (result.status !== "ok" || !result.committedState) {
      console.error(
        `[FlushScheduler] persistence ${result.status} for ${entry.wallet}:`,
        result.errors,
      );
      // Keep dirty=true so the next cycle retries. Do NOT update lastFlushedState
      // on failure — leaving it as-is means the next attempt diffs from the last
      // known-good baseline rather than from potentially-stale failed data.
      return;
    }

    entry.lastFlushedState = cloneState(result.committedState);

    // -----------------------------------------------------------------
    // Phase 5 — Flush Consolidation: second leg.
    //
    // persistMineAction only persists energies for heroes currently ON the
    // map (entry.state.heroes). Heroes that were undeployed during this
    // session window have their energies tracked in entry.heroEnergy but are
    // NOT in entry.state.heroes — they would be silently skipped and their
    // in-memory energy lost until the next undeploy write or DB reload.
    //
    // After the primary write (map + coins + on-map heroes) succeeds, collect
    // every heroEnergy entry whose key is absent from entry.state.heroes and
    // persist them in a single parallel batch. This write is best-effort: a
    // failure here does NOT set dirty=false and does NOT mark the flush as
    // failed — the next cycle will retry the energy values (they don't change
    // unless the hero is deployed again, so the retry is idempotent and cheap).
    // -----------------------------------------------------------------
    const onMapHeroIds = new Set(Object.keys(entry.state.heroes));
    const offMapEntries = Array.from(entry.heroEnergy.entries())
      .filter(([heroId]) => !onMapHeroIds.has(heroId))
      .map(([heroId, energy]) => ({ heroId, energy }));

    if (offMapEntries.length > 0) {
      try {
        await persistOffMapHeroEnergies(entry.wallet, offMapEntries);
      } catch (offMapErr) {
        // Non-fatal: the next periodic flush will retry. Log so it is visible
        // in dashboards — sustained failures here signal a DB connectivity issue.
        console.error(
          `[FlushScheduler] off-map hero energy flush failed for ${entry.wallet}` +
          ` (${offMapEntries.length} hero(es)):`,
          offMapErr,
        );
        // Do NOT abort — the primary write succeeded; keep going to clear dirty.
      }
    }

    if (result.stageAdvanced) {
      // The committed state is the freshly-generated next stage. Snap in-memory
      // state to it so subsequent flushes diff against the correct baseline and
      // hits that arrive before the client reloads apply to the new map.
      entry.state = cloneState(result.committedState);
      entry.dirty = false;
      entry.revision = 0;
      entry.stageAdvanced = true;
    } else if (entry.revision === revision) {
      entry.dirty = false;
    }
    // If entry.revision > revision, more mutations arrived during the flush.
    // dirty remains true so the next scheduled cycle picks them up.
  }
}
