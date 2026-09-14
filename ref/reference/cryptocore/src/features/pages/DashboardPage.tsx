import { Flame, Vault } from "lucide-react";
import { useState } from "react";

import { BurnModal } from "@/components/game/BurnModal";
import { PlayerLevelHeader } from "@/components/game/PlayerLevelHeader";
import { PageHeader } from "@/components/layout/PageHeader";
import { RigSlotsSection } from "@/components/game/RigSlotsSection";
import { StatUpgradeModal } from "@/components/game/StatUpgradeModal";
import {
  StatTableModal,
  StatUpgradeCard,
  UpgradeTableModal,
} from "@/components/game/StatUpgradeCard";
import { VaultCard } from "@/components/game/VaultCard";
import { VaultStakeModal } from "@/components/game/VaultStakeModal";
import { STAT_META } from "@/features/constants/game";
import { RaidTable } from "@/components/game/RaidTable";
import {
  DERIVED_STAT_KEYS,
  EXPLOIT_TABLE,
  FIREWALL_TABLE,
  LUCK_TABLE,
  UPGRADEABLE_STAT_KEYS,
  upgradeCost,
  statValueFromLevel,
  type BonusTable,
} from "@/features/game/stats";
import { useGameStats } from "@/hooks/useGameStats";
import { msUntilNextDecayStep } from "@/features/game/mining";
import { formatHash, formatInt, formatPercent } from "@/lib/format";
import { statIcon } from "@/lib/icons";
import { notify } from "@/lib/notify";
import { useAuthStore } from "@/features/stores/authStore";
import { usePlayerStore } from "@/features/stores/playerStore";

const DERIVED_TABLES: Record<string, { table: BonusTable; unit: string }> = {
  luck: { table: LUCK_TABLE, unit: "HASH in vault" },
  firewall: { table: FIREWALL_TABLE, unit: "HASH in vault" },
  exploit: { table: EXPLOIT_TABLE, unit: "Notoriety" },
};

export function DashboardPage() {
  const {
    wallet,
    vault,
    capacity,
    fillPercent,
    perSecond,
    secondsToFull,
    total,
    base,
    levels,
    claims,
    vaultStaked,
    notoriety,
    decay,
  } = useGameStats();
  const claim = usePlayerStore((state) => state.claim);
  const xp = usePlayerStore((state) => state.xp);
  const lastSinkAt = usePlayerStore((state) => state.lastSinkAt);
  const username = useAuthStore((state) => state.username);

  const [claiming, setClaiming] = useState(false);

  const handleClaim = async () => {
    if (claims.current <= 0) {
      notify("No claim charges left — one regenerates every 4 hours", "danger");
      return;
    }
    setClaiming(true);
    const claimed = await claim();
    setClaiming(false);
    if (claimed <= 0) return;
    window.setTimeout(() => setClaiming(false), 450);
    notify(`+${formatHash(claimed)} HASH claimed`, "success");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your rig, vault, permanent stats and raid targets."
      />
      <PlayerLevelHeader username={username ?? "Miner"} xp={xp} />

      <VaultCard
        vault={vault}
        capacity={capacity}
        fillPercent={fillPercent}
        perSecond={perSecond}
        secondsToFull={secondsToFull}
        onClaim={handleClaim}
        claiming={claiming}
        charges={claims.current}
        maxCharges={claims.max}
        msUntilNextCharge={claims.msUntilNext}
        decay={decay}
        msUntilNextDecay={msUntilNextDecayStep(lastSinkAt)}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <StatUpgradeCard
          title="Vault size"
          value={formatHash(capacity, 0)}
          unit="HASH"
          icon={Vault}
          meta={
            <div className="space-y-1">
              <div>
                In vault:{" "}
                <span className="text-foreground tabular-nums">
                  {formatHash(vaultStaked)} HASH
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-primary">+{base.luck.toFixed(3)}%</span>
                <span>Luck</span>
                <StatTableModal
                  title="Luck stats"
                  unitLabel="HASH in vault"
                  rows={LUCK_TABLE}
                  current={vaultStaked}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-primary">+{(base.firewall - 1).toFixed(3)}%</span>
                <span>Firewall</span>
                <StatTableModal
                  title="Firewall stats"
                  unitLabel="HASH in vault"
                  rows={FIREWALL_TABLE}
                  current={vaultStaked}
                />
              </div>
            </div>
          }
          action={
            <VaultStakeModal wallet={wallet} vaultStaked={vaultStaked} hashRate={total.hashRate} />
          }
        />

        <StatUpgradeCard
          title="Notoriety"
          value={formatHash(notoriety, 0)}
          icon={Flame}
          meta={
            <div className="space-y-1">
              <div>Send HASH to Notoriety to unlock Exploit and future content.</div>
              <div className="flex items-center gap-1.5">
                <span className="text-primary">+{(base.exploit - 1).toFixed(3)}%</span>
                <span>Exploit</span>
                <StatTableModal
                  title="Exploit stats"
                  unitLabel="Notoriety"
                  rows={EXPLOIT_TABLE}
                  current={notoriety}
                />
              </div>
            </div>
          }
          action={<BurnModal wallet={wallet} notoriety={notoriety} />}
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Permanent stats</h2>
            <p className="text-xs text-muted-foreground">
              Upgrades are permanent and cost level squared HASH. Gear bonuses stack on top.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {UPGRADEABLE_STAT_KEYS.map((key) => {
            const level = levels[key];
            const baseValue = base[key];
            const bonus = total[key] - baseValue;
            const derived =
              key === "hashRate"
                ? `${formatHash(perSecond, 4)} HASH/sec · ${formatHash(capacity, 0)} vault capacity`
                : key === "hackPower"
                  ? `Can raid targets with Security below ${formatInt(total[key])}`
                  : `Blocks raiders with Hack Power up to ${formatInt(total[key])}`;
            return (
              <StatUpgradeCard
                key={key}
                title={STAT_META[key].label}
                value={formatInt(total[key])}
                icon={statIcon(key)}
                meta={
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5">
                      Lv {formatInt(level)} · Base {formatInt(baseValue)} · Gear{" "}
                      <span className="text-success">+{formatInt(bonus)}</span>
                      <UpgradeTableModal
                        title={`${STAT_META[key].label} upgrades`}
                        currentLevel={level}
                        computeCost={upgradeCost}
                        formatValue={(lvl) => formatInt(statValueFromLevel(key, lvl) + bonus)}
                      />
                    </span>
                    <div>{derived}</div>
                  </div>
                }
                action={
                  <StatUpgradeModal
                    statKey={key}
                    label={STAT_META[key].label}
                    currentLevel={level}
                    gearBonus={bonus}
                    wallet={wallet}
                  />
                }
              />
            );
          })}
          {DERIVED_STAT_KEYS.map((key) => {
            const source = DERIVED_TABLES[key] ?? { table: LUCK_TABLE, unit: "HASH in vault" };
            const current = key === "exploit" ? notoriety : vaultStaked;
            return (
              <StatUpgradeCard
                key={key}
                title={STAT_META[key].label}
                value={formatPercent(total[key], 2)}
                icon={statIcon(key)}
                meta={
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      Base {formatPercent(base[key], 2)} · Gear{" "}
                      <span className="text-success">
                        +{formatPercent(Math.max(0, total[key] - base[key]), 2)}
                      </span>
                      <StatTableModal
                        title={`${STAT_META[key].label} stats`}
                        unitLabel={source.unit}
                        rows={source.table}
                        current={current}
                      />
                    </div>
                    <div>
                      {key === "exploit"
                        ? `${formatHash(notoriety, 0)} Notoriety — send HASH to raise`
                        : `${formatHash(vaultStaked, 0)} HASH in vault — increase vault to raise`}
                    </div>
                  </div>
                }
              />
            );
          })}
        </div>
      </section>

      <RigSlotsSection />

      <RaidTable />
    </div>
  );
}
