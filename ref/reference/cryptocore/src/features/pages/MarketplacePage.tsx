import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, ServerOff, Store, User } from "lucide-react";

import { ConnectWalletModal } from "@/components/auth/ConnectWalletModal";
import { EquipmentCard } from "@/components/game/EquipmentCard";
import { MarketSalesHistory } from "@/components/game/MarketSalesHistory";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RARITY_KEYS, RARITY_META, SLOT_KEYS, SLOT_META } from "@/features/constants/game";
import { MARKET_FEE } from "@/features/stores/marketplaceStore";
import { usePlayerStore } from "@/features/stores/playerStore";
import { useAuthStore } from "@/features/stores/authStore";
import { useHydrated } from "@/hooks/useHydrated";
import { getMarketListings } from "@/lib/api/client";
import type { ListingDto } from "@/lib/api/types";
import { formatHash } from "@/lib/format";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { equipmentScore } from "@/features/game/stats";
import type { Equipment, Rarity, SlotKey, StatRoll } from "@/features/types/game";

type SortKey = "price" | "score" | "level" | "listed";

interface ServerListing {
  id: string;
  itemNumber: number;
  item: Equipment;
  price: number;
  seller: string;
  listedAt: number;
}

/** Maps a server listing DTO into the shape the equipment card renders. */
function toServerListing(listing: ListingDto): ServerListing | null {
  const item = listing.item;
  if (!item) return null;
  return {
    id: `listing-${listing.itemNumber}`,
    itemNumber: listing.itemNumber,
    price: listing.price,
    seller: listing.seller,
    listedAt: listing.listedAt,
    item: {
      id: String(item.itemNumber),
      name: item.name,
      slot: item.slot as SlotKey,
      rarity: item.rarity as Rarity,
      stats: item.stats as StatRoll,
      level: item.level,
      equipped: false,
      createdAt: item.createdAt,
    },
  };
}

export function MarketplacePage() {
  const wallet = usePlayerStore((state) => state.wallet);
  const hydrated = useHydrated();
  const mode = useAuthStore((state) => state.mode);
  const walletConnected =
    useAuthStore((state) => state.mode === "wallet" && state.address !== null) && hydrated;
  const isDemo = hydrated && mode === "demo";
  const [connectOpen, setConnectOpen] = useState(false);

  const [listings, setListings] = useState<ServerListing[]>([]);
  const [status, setStatus] = useState<"loading" | "online" | "offline">("loading");
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [slot, setSlot] = useState<SlotKey | "all">("all");
  const [rarities, setRarities] = useState<Rarity[]>([]);
  const [sort, setSort] = useState<SortKey>("listed");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [ownOnly, setOwnOnly] = useState(false);

  const address = useAuthStore((state) => state.address);

  const load = useCallback(async () => {
    const result = await getMarketListings("newest", 100);
    if (!result.ok || !result.listings) {
      setStatus("offline");
      return;
    }
    setListings(result.listings.map(toServerListing).filter((l): l is ServerListing => l !== null));
    setStatus("online");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggleRarity = (rarity: Rarity) =>
    setRarities((prev) =>
      prev.includes(rarity) ? prev.filter((r) => r !== rarity) : [...prev, rarity],
    );

  const handleSort = (key: SortKey) => {
    if (sort === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setSortDir("asc");
    }
  };

  const handleBuy = (listing: ServerListing) => {
    if (!walletConnected) {
      setConnectOpen(true);
      return;
    }
    if (wallet < listing.price) {
      notify("Not enough HASH to buy this item", "danger");
      return;
    }
    notify(
      `Purchases settle on-chain. Deposit HASH and confirm the payment for ${listing.item.name}.`,
      "info",
    );
  };

  const filtered = useMemo(() => {
    const cap = Number(maxPrice);
    const query = search.trim().toLowerCase();
    const priceCap = maxPrice.trim() && Number.isFinite(cap) ? cap : undefined;
    return listings
      .filter((listing) => {
        if (query && !listing.item.name.toLowerCase().includes(query)) return false;
        if (slot !== "all" && listing.item.slot !== slot) return false;
        if (rarities.length && !rarities.includes(listing.item.rarity)) return false;
        if (priceCap !== undefined && listing.price > priceCap) return false;
        if (ownOnly && (!address || listing.seller !== address)) return false;
        return true;
      })
      .sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        if (sort === "price") return (a.price - b.price) * dir;
        if (sort === "level") return (a.item.level - b.item.level) * dir;
        if (sort === "score") return (equipmentScore(a.item) - equipmentScore(b.item)) * dir;
        return (a.listedAt - b.listedAt) * dir;
      });
  }, [listings, search, maxPrice, slot, rarities, sort, sortDir, ownOnly, address]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace"
        description="Live listings from other miners. Buying and selling require a connected wallet."
      />

      {isDemo && status === "online" ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
          You are in demo mode. These are real listings from the live market — connect a wallet to
          buy, and note that demo gear cannot be sold.
        </div>
      ) : null}

      <div className="card-soft space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search listings"
            aria-label="Search listings"
          />
          <Input
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value.replace(/[^\d]/g, ""))}
            placeholder="Max price (HASH)"
            inputMode="numeric"
            aria-label="Max price"
            className="sm:max-w-48"
          />
          <Button
            variant="secondary"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="shrink-0 gap-2"
          >
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(["all", ...SLOT_KEYS] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSlot(key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                slot === key
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {key === "all" ? "All slots" : SLOT_META[key].label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Rarity
          </span>
          {RARITY_KEYS.map((rarity) => (
            <button
              key={rarity}
              type="button"
              onClick={() => toggleRarity(rarity)}
              className={cn(
                "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                rarities.includes(rarity)
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {RARITY_META[rarity].label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Sort
            </span>
            {(
              [
                ["listed", "Listed"],
                ["price", "Price"],
                ["score", "Score"],
                ["level", "Level"],
              ] as [SortKey, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleSort(key)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                  sort === key
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {label} {sort === key && (sortDir === "asc" ? "↑" : "↓")}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOwnOnly((prev) => !prev)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
              ownOnly
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <User className="size-3.5" />
            {ownOnly ? "Your listings" : "All listings"}
          </button>
        </div>
      </div>

      {status === "loading" ? (
        <p className="card-soft p-8 text-center text-sm text-muted-foreground">
          Loading live listings…
        </p>
      ) : status === "offline" ? (
        <div className="card-soft flex flex-col items-center gap-3 p-10 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-destructive/15 text-destructive">
            <ServerOff className="size-6" />
          </span>
          <div>
            <p className="text-sm font-semibold">Server offline</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The marketplace could not reach the game server, so no listings can be shown right
              now. Try again in a moment.
            </p>
          </div>
          <Button variant="outline" onClick={() => void handleRefresh()} disabled={refreshing}>
            Retry
          </Button>
        </div>
      ) : filtered.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((listing) => {
            const isOwn = Boolean(address) && listing.seller === address;
            const canAfford = wallet >= listing.price;
            return (
              <EquipmentCard
                key={listing.id}
                item={listing.item}
                footer={
                  <div className="mt-auto space-y-2">
                    <div className="flex items-end justify-between rounded-lg bg-secondary/60 px-2 py-1.5">
                      <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        {isOwn ? <User className="size-3" /> : <Store className="size-3" />}
                        {isOwn ? "Your listing" : `@${listing.seller.slice(0, 6)}…`}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          !walletConnected || canAfford || isOwn
                            ? "text-primary"
                            : "text-destructive",
                        )}
                      >
                        {formatHash(listing.price, 0)} HASH
                      </span>
                    </div>
                    {isOwn ? (
                      <p className="text-[10px] text-muted-foreground">
                        You receive ~{formatHash(listing.price * (1 - MARKET_FEE))} HASH after{" "}
                        {Math.round(MARKET_FEE * 100)}% fee when this sells
                      </p>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={walletConnected && !canAfford}
                        onClick={() => handleBuy(listing)}
                      >
                        {!walletConnected
                          ? "Connect to buy"
                          : canAfford
                            ? "Buy"
                            : `Need ${formatHash(listing.price - wallet)} HASH`}
                      </Button>
                    )}
                  </div>
                }
              />
            );
          })}
        </div>
      ) : (
        <p className="card-soft p-8 text-center text-sm text-muted-foreground">
          No listings match your filters.
        </p>
      )}

      {!walletConnected ? (
        <ConnectWalletModal open={connectOpen} onOpenChange={setConnectOpen} />
      ) : null}

      {walletConnected ? <MarketSalesHistory /> : null}
    </div>
  );
}
