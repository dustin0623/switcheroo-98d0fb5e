export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface PlayerDto {
  /** Solana address that owns this account. */
  address: string;
  username: string;
  registrationTime: number;
  xp: number;
  level: number;
  hash: number;
  sparks: number;
  vault: number;
  vaultStaked: number;
  notoriety: number;
  totalBurned: number;
  statLevels: {
    hashRate: number;
    hackPower: number;
    security: number;
    luck: number;
    firewall: number;
    exploit: number;
  };
  lastTickAt: number;
  lastSinkAt: number;
  claimCharges: number;
  lastClaimRegenAt: number;
  raidCharges: number;
  lastRaidRegenAt: number;
  totalClaimed: number;
  totalMined: number;
  raids: number;
  raidWins: number;
  totalStolen: number;
  bestHashRate: number;
  protectionUntil: number;
}

export interface ItemDto {
  itemNumber: number;
  owner: string;
  name: string;
  slot: string;
  rarity: string;
  level: number;
  stats: Record<string, number>;
  equipped: boolean;
  salvaged: boolean;
  image: string;
  createdAt: number;
  lastTransfer: number;
}

export interface ListingDto {
  seller: string;
  /** Hydrated item for the listing; null when the item record is missing. */
  item?: ItemDto | null;
  itemNumber: number;
  price: number;
  status: "active" | "sold" | "cancelled";
  soldTo?: string;
  soldAt?: number;
  listedAt: number;
}

export interface TickResult {
  ok: boolean;
  mined?: number;
  vault?: number;
  error?: string;
}

export interface ClaimResult {
  ok: boolean;
  amount?: number;
  error?: string;
}

export interface ChestResult {
  ok: boolean;
  item?: ItemDto;
  error?: string;
}

export interface UpgradeResult {
  ok: boolean;
  error?: string;
}

export interface RaidResult {
  ok: boolean;
  success?: boolean;
  stolen?: number;
  xp?: number;
  error?: string;
}

export interface LogDto {
  _id?: string;
  type: string;
  wallet: string;
  target?: string;
  amount?: number;
  seed?: string;
  txHash?: string;
  error?: string;
  data?: Record<string, unknown>;
  createdAt: number;
}

export type TxType = "withdrawal" | "deposit" | "market_purchase";

export interface PendingTxDto {
  id: string;
  type: TxType;
  status: "pending" | "failed" | "dead";
  signature: string;
  amount: number;
  itemNumber: number | null;
  retryCount: number;
  error: string | null;
  refunded: boolean;
  createdAt: number;
}

export interface SettledTxDto {
  id: string;
  type: TxType;
  txHash: string;
  amount: number;
  processedAt: number;
  metadata: Record<string, unknown> | null;
}
