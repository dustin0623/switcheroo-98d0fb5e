import { formatHash } from "@/lib/format";
import type { LogDto } from "@/lib/api/types";
import type { ActivityEntry } from "@/features/types/game";

const num = (value: unknown): number => (typeof value === "number" ? value : 0);
const str = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

export type MarketAction = "bought" | "sold" | "listed" | "cancelled";

export interface MarketLogRow {
  id: string;
  action: MarketAction | string;
  itemNumber: number;
  name: string;
  rarity?: string | undefined;
  price: number;
  fee: number;
  counterparty?: string | undefined;
  wallet: string;
  at: number;
}

export function toMarketRow(log: LogDto, index: number): MarketLogRow {
  const data = log.data ?? {};
  return {
    id: log._id ?? `${log.createdAt}-${index}`,
    action: str(data["action"]) ?? "trade",
    itemNumber: num(data["itemNumber"]),
    name: str(data["name"]) ?? `Item #${num(data["itemNumber"])}`,
    rarity: str(data["rarity"]),
    price: num(data["price"]),
    fee: num(data["fee"]),
    counterparty: log.target,
    wallet: log.wallet,
    at: log.createdAt,
  };
}

export function marketLogMessage(row: MarketLogRow): string {
  const price = `${formatHash(row.price)} HASH`;
  if (row.action === "bought") return `Bought ${row.name} for ${price}`;
  if (row.action === "sold") return `Sold ${row.name} for ${price}`;
  if (row.action === "listed") return `Listed ${row.name} for ${price}`;
  if (row.action === "cancelled") return `Cancelled listing for ${row.name}`;
  return `${row.name} — ${price}`;
}

/** Turns a server gameplay log into an activity-feed entry. */
export function toActivityEntry(log: LogDto, index: number): ActivityEntry {
  const data = log.data ?? {};
  const amount = log.amount ?? 0;
  let message: string;
  let kind: ActivityEntry["kind"] = "info";

  switch (log.type) {
    case "claim":
      message = `Claimed ${formatHash(amount)} HASH from the vault`;
      kind = "success";
      break;
    case "mining":
      message = `Mined ${formatHash(amount)} HASH`;
      break;
    case "chest":
      message = `Opened a chest and found ${str(data["name"]) ?? "new gear"}`;
      kind = "loot";
      break;
    case "burn":
      message = `Committed ${formatHash(Math.abs(amount))} HASH to Notoriety`;
      kind = "danger";
      break;
    case "raid": {
      const won = data["success"] === true;
      message = won
        ? `Raid on ${log.target ?? "a rival"} succeeded — stole ${formatHash(Math.abs(amount))} HASH`
        : `Raid on ${log.target ?? "a rival"} failed`;
      kind = won ? "success" : "danger";
      break;
    }
    case "upgrade":
    case "stat_upgrade":
      message = `Upgraded ${str(data["stat"]) ?? "a stat"}`;
      kind = "success";
      break;
    default:
      message = str(data["message"]) ?? log.type;
  }

  return { id: log._id ?? `${log.createdAt}-${index}`, message, kind, at: log.createdAt };
}