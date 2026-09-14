import { Link } from "@tanstack/react-router";
import {
  Boxes,
  Flame,
  Pickaxe,
  Server,
  ShoppingBag,
  Sword,
  Timer,
  Wallet,
} from "lucide-react";

import {
  CHARGE_REGEN_MS,
  CHESTS,
  CHEST_KEYS,
  PURCHASABLE_CHEST_KEYS,
  CHEST_LADDERS,
  DECAY_FLOOR,
  DECAY_GRACE_DAYS,
  MARKET_FEE_BPS,
  MAX_CLAIM_CHARGES,
  MAX_RAID_CHARGES,
  RARITY_KEYS,
  RARITY_META,
  SLOT_KEYS,
  SLOT_META,
  STAT_KEYS,
  STAT_META,
  VAULT_BASE_CAPACITY,
  VAULT_CAPACITY_PER_LEVEL,
  HASHRATE_SOFTCAP,
  HASHRATE_SOFTCAP_RATE,
} from "@/features/constants/game";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "getting-started", label: "Getting started" },
  { id: "mining", label: "Mining & vault" },
  { id: "stats", label: "Stats" },
  { id: "gear", label: "Gear & rarity" },
  { id: "chests", label: "Chests & odds" },
  { id: "raiding", label: "Raiding" },
  { id: "market", label: "Marketplace" },
  { id: "burning", label: "Notoriety" },
];

function ladderOdds(chest: (typeof CHEST_KEYS)[number]) {
  const ladder = CHEST_LADDERS[chest];
  let prev = 0;
  return ladder.map((step) => {
    const max = Number.isFinite(step.max) ? step.max : 100_000;
    const pct = ((max - prev) / 100_000) * 100;
    prev = max;
    return { rarity: step.rarity, pct };
  });
}

function Section({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold md:text-xl">
        <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function WikiPage() {
  const regenHours = Math.round(CHARGE_REGEN_MS / 3_600_000);

  return (
    <div className="space-y-10 pb-16 pt-4">
      <header className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 md:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Documentation</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-4xl">CryptoCore Wiki</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Everything about the $HASH economy: how mining rates are calculated, what each stat does, chest drop odds,
          raid mechanics and marketplace fees.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-full border border-border/60 bg-card/60 px-3 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              {section.label}
            </a>
          ))}
        </div>
      </header>

      <Section id="getting-started" icon={Wallet} title="Getting started">
        <p>
          Connect a Solana wallet or start in demo mode, claim a miner tag, and your rig begins producing $HASH
          immediately. Progress is tied to your wallet address once connected.
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Connect a wallet (or play demo mode locally).</li>
          <li>Pick a username — this is what rivals see on raid targets and market listings.</li>
          <li>Claim vault output, spend $HASH on stat upgrades, then open chests for gear.</li>
        </ol>
      </Section>

      <Section id="mining" icon={Pickaxe} title="Mining & vault">
        <p>
          Your rig mines continuously. Output accrues into your vault until you claim it — once the vault is full,
          production is wasted, so claim regularly.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Vault capacity: <strong className="text-foreground">{VAULT_BASE_CAPACITY} hours</strong> of output, plus{" "}
            {VAULT_CAPACITY_PER_LEVEL} hour per vault level.
          </li>
          <li>
            Hash Rate above <strong className="text-foreground">{HASHRATE_SOFTCAP}</strong> is softcapped and counts
            for {HASHRATE_SOFTCAP_RATE * 100}% per point.
          </li>
          <li>
            Idle decay: full rate for {DECAY_GRACE_DAYS} days of inactivity, then -10% per week down to a{" "}
            {DECAY_FLOOR * 100}% floor.
          </li>
          <li>
            Claiming costs a charge. You hold up to {MAX_CLAIM_CHARGES} claim charges and one regenerates every{" "}
            {regenHours} hours.
          </li>
        </ul>
      </Section>

      <Section id="stats" icon={Server} title="Stats">
        <div className="grid gap-3 sm:grid-cols-2">
          {STAT_KEYS.map((key) => (
            <div key={key} className="rounded-xl border border-border bg-card/50 p-4">
              <p className="text-sm font-semibold text-foreground">{STAT_META[key].label}</p>
              <p className="mt-1 text-xs">{STAT_META[key].description}</p>
            </div>
          ))}
        </div>
        <p>
          Stat upgrades are permanent and priced on a curve — each level costs more $HASH than the last. Mining is
          calibrated so the next upgrade is roughly a few hours of output away.
        </p>
      </Section>

      <Section id="gear" icon={Boxes} title="Gear & rarity">
        <p>Your rig has six equipment slots. Each equipped item adds its rolled stats to your totals.</p>
        <div className="flex flex-wrap gap-2">
          {SLOT_KEYS.map((slot) => (
            <span
              key={slot}
              className="rounded-md border border-border/60 bg-card/60 px-2.5 py-1 text-[11px] font-medium text-foreground"
            >
              {SLOT_META[slot].label}
            </span>
          ))}
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Rarity</th>
                <th className="px-3 py-2">Stat roll range</th>
              </tr>
            </thead>
            <tbody>
              {RARITY_KEYS.map((rarity) => (
                <tr key={rarity} className="border-t border-border/60">
                  <td className={cn("px-3 py-2 font-semibold", RARITY_META[rarity].textClass)}>
                    {RARITY_META[rarity].label}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {RARITY_META[rarity].min} – {RARITY_META[rarity].max}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="chests" icon={Boxes} title="Chests & odds">
        <p>
          Chests are bought with $HASH and roll a random slot, rarity and stat spread. Luck nudges the roll toward
          higher rarities.
        </p>
        <div className="space-y-3">
          {PURCHASABLE_CHEST_KEYS.map((chest) => (
            <div key={chest} className="rounded-xl border border-border bg-card/50 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{CHESTS[chest].label}</p>
                <p className="font-mono text-xs text-primary">{CHESTS[chest].price.toLocaleString()} HASH</p>
              </div>
              <p className="mt-1 text-xs">{CHESTS[chest].blurb}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ladderOdds(chest).map((step) => (
                  <span
                    key={step.rarity}
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[11px] font-medium",
                      RARITY_META[step.rarity].bgClass,
                      RARITY_META[step.rarity].textClass,
                    )}
                  >
                    {RARITY_META[step.rarity].label} {step.pct % 1 === 0 ? step.pct : step.pct.toFixed(2)}%
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="raiding" icon={Sword} title="Raiding">
        <p>
          Raids let you steal unclaimed vault $HASH from rivals. Hack Power raises your success chance, while the
          defender&apos;s Security and Firewall work against you. Exploit sets the minimum share stolen on a win.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Up to {MAX_RAID_CHARGES} raid charges, one regenerating every {regenHours} hours.</li>
          <li>A rival cannot be raided again immediately — a short cooldown applies per target.</li>
          <li>Every raid is logged with its seed, so outcomes are verifiable.</li>
        </ul>
      </Section>

      <Section id="market" icon={ShoppingBag} title="Marketplace">
        <p>
          List spare gear for $HASH or buy upgrades from other miners. Sales pay a fee of{" "}
          <strong className="text-foreground">{MARKET_FEE_BPS / 100}%</strong>, which is removed from circulation as a
          sink.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/marketplace">Open marketplace</Link>
        </Button>
      </Section>

      <Section id="burning" icon={Flame} title="Notoriety">
        <p>
          Committing in-game $HASH to Notoriety permanently spends it and raises your Notoriety score. Higher
          Notoriety unlocks Exploit bonuses and ranks you against other miners.
        </p>
        <p className="flex items-center gap-2 text-xs">
          <Timer className="size-3.5 text-primary" />
          This is an in-game sink, not an on-chain token burn — no tokens are destroyed on the blockchain. The
          committed $HASH is removed from your balance and cannot be recovered.
        </p>
      </Section>
    </div>
  );
}
