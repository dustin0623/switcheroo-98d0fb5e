import { Copy, ExternalLink, Flame, Star, Vault } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RARITY_META, SLOT_META, STAT_META } from "@/features/constants/game";
import { levelProgress } from "@/features/game/level";
import { Progress } from "@/components/ui/progress";
import { StatUpgradeCard } from "@/components/game/StatUpgradeCard";
import { useGameStats } from "@/hooks/useGameStats";
import { formatHash, formatInt, formatPercent } from "@/lib/format";
import { slotIcon, statIcon } from "@/lib/icons";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { shortAddress, useAuthStore } from "@/features/stores/authStore";
import { usePlayerStore } from "@/features/stores/playerStore";


export function ProfilePage() {
  const { total, base, vault, capacity, fillPercent, perSecond, vaultStaked, notoriety, equippedItems } = useGameStats();

  const player = usePlayerStore((state) => state);
  const address = useAuthStore((state) => state.address);
  const username = useAuthStore((state) => state.username) ?? "Miner";

  const progress = levelProgress(player.xp);
  const initials = username.slice(0, 2).toUpperCase();
  const memberSince = player.lastTickAt ? new Date(player.lastTickAt).getFullYear() : new Date().getFullYear();

  const copyAddress = () => {
    if (!address) return;
    void navigator.clipboard.writeText(address);
    notify("Wallet address copied", "success");
  };

  const summary = [
    { label: "Level", value: formatInt(progress.level) },
    { label: "Claims", value: `${formatHash(player.totalClaimed, 0)} HASH` },
    { label: "Attacks", value: formatInt(player.raids) },
    { label: "Member since", value: String(memberSince) },
  ];

  return (
    <div className="space-y-6">
      {/* HiveXPH-style profile header */}
      <section className="overflow-hidden rounded-3xl border border-border/60 bg-card">
        <div className="relative h-32 bg-gradient-to-tr from-primary/25 via-accent/20 to-secondary sm:h-44">
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
        </div>

        <div className="relative -mt-14 flex flex-col gap-4 px-5 pb-5 sm:-mt-16 sm:flex-row sm:items-end sm:px-7">
          <div className="size-24 shrink-0 rounded-full bg-gradient-to-tr from-primary via-accent to-success p-[3px] shadow-xl sm:size-28">
            <div className="grid size-full place-items-center overflow-hidden rounded-full border-4 border-card bg-secondary text-xl font-semibold text-primary-foreground">
              {initials}
            </div>
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{username}</h1>
              <span
                className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-1 text-xs font-semibold leading-none text-warning"
                title={`Level ${progress.level}`}
              >
                <Star className="size-3 fill-current" />
                {progress.level}
              </span>
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="font-mono text-xs text-foreground/80">
                {address ? shortAddress(address, 6) : "Not connected"}
              </span>
              <span>Claims: {formatHash(player.totalClaimed, 0)}</span>
              <span>Attacks: {formatInt(player.raids)}</span>
            </p>
            <div className="mt-3 flex max-w-sm items-center gap-2">
              <Progress value={progress.percent} className="h-2.5 flex-1" />
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                {formatInt(progress.intoLevel)}/{formatInt(progress.levelSpan)} XP
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 pb-1">
            <Button variant="secondary" size="sm" onClick={copyAddress} disabled={!address}>
              <Copy className="size-4" />
              Copy address
            </Button>
            <Button variant="secondary" size="sm" asChild disabled={!address}>
              <a
                href={`https://solscan.io/account/${address ?? ""}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="size-4" />
                View on Solscan
              </a>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-border/60 border-t border-border/60 sm:grid-cols-4 sm:divide-x">
          {summary.map((item) => (
            <div key={item.label} className="px-5 py-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stat summary — div cards like the dashboard */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">Stats</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatUpgradeCard
            title="Vault"
            value={formatHash(vault, 0)}
            unit="HASH"
            icon={Vault}
            meta={
              <div className="space-y-1">
                <div>
                  of {formatHash(capacity, 0)} capacity · {formatPercent(fillPercent, 1)} full
                </div>
                <div className="text-primary">{formatHash(perSecond, 4)} HASH / sec</div>
              </div>
            }
          />

          <StatUpgradeCard
            title="Vault size"
            value={formatHash(capacity, 0)}
            unit="HASH"
            icon={Vault}
            meta={
              <div className="space-y-1">
                <div>
                  In vault:{" "}
                  <span className="text-foreground tabular-nums">{formatHash(vaultStaked)} HASH</span>
                </div>
                <div className="text-primary">+{base.luck.toFixed(3)}% Luck</div>
                <div className="text-primary">+{(base.firewall - 1).toFixed(3)}% Firewall</div>
              </div>
            }
          />

          <StatUpgradeCard
            title="Notoriety"
            value={formatInt(notoriety)}
            icon={Flame}
            meta={
              <div className="space-y-1">
                <div>Send HASH to Notoriety to unlock Exploit and future content.</div>
                <div className="text-primary">+{(base.exploit - 1).toFixed(3)}% Exploit</div>
              </div>
            }
          />

          {(["hashRate", "hackPower", "security"] as const).map((key) => {
            const Icon = statIcon(key);
            const level = base[key];
            const bonus = total[key] - level;
            return (
              <StatUpgradeCard
                key={key}
                title={STAT_META[key].label}
                value={formatInt(total[key])}
                icon={Icon}
                meta={
                  <div className="space-y-1">
                    <div>
                      Base {formatInt(level)} · Gear{" "}
                      <span className="text-success">+{formatInt(bonus)}</span>
                    </div>
                    <div>
                      {key === "hashRate"
                        ? `${formatHash(perSecond, 4)} HASH/sec`
                        : key === "hackPower"
                          ? `Can raid targets with Security below ${formatInt(total[key])}`
                          : `Blocks raiders with Hack Power up to ${formatInt(total[key])}`}
                    </div>
                  </div>
                }
              />
            );
          })}
        </div>
      </section>


      {/* Equipped gear */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">
          Equipped gear{" "}
          <span className="text-muted-foreground">
            ({equippedItems.length} / {Object.keys(SLOT_META).length})
          </span>
        </h2>
        {equippedItems.length === 0 ? (
          <p className="card-soft border-dashed p-4 text-sm text-muted-foreground">
            No gear equipped.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {equippedItems.map((item) => {
              const Icon = slotIcon(item.slot);
              const rarity = RARITY_META[item.rarity];
              return (
                <div
                  key={item.id}
                  className={cn("card-soft flex items-center gap-3 p-3 ring-1 ring-inset", rarity.ringClass)}
                >
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-xl",
                      rarity.bgClass,
                      rarity.textClass,
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {SLOT_META[item.slot].label}
                    </p>
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className={cn("text-[11px] font-medium", rarity.textClass)}>
                      {rarity.label} · Lv {item.level}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Lifetime record */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">Lifetime record</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Wallet", value: `${formatHash(player.wallet)} HASH` },
            { label: "Best hash rate", value: `${formatInt(player.bestHashRate)} H/s` },
            {
              label: "Raid wins",
              value: `${formatInt(player.raidWins)}`,
              hint:
                player.raids > 0
                  ? `${formatPercent((player.raidWins / player.raids) * 100)} win rate`
                  : "No raids yet",
            },
            { label: "HASH stolen", value: formatHash(player.totalStolen, 0) },
          ].map((item) => (
            <div key={item.label} className="card-soft p-4">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {item.label}
              </p>
              <p className="text-lg font-bold tabular-nums">{item.value}</p>
              {item.hint ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">{item.hint}</p>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
