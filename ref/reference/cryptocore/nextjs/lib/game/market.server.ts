// src/lib/game/market.server.ts
// Marketplace buys are paid with the on-chain SPL game token (never in-game
// HASH). The buyer transfers the listing price to the treasury, then this
// validates the listing and queues the job; the game-smart-contract worker
// verifies the payment on-chain, moves the item, pays the seller and refunds
// the buyer if the listing vanished in the meantime.

import { findListingByItemNumber } from "@/lib/modules/market-listings/repository.server";
import { findItemByNumber } from "@/lib/modules/items/repository.server";
import { findPlayerByWallet } from "@/lib/modules/players/repository.server";
import { enqueueMarketPurchase } from "@/lib/modules/transactions-pending/repository.server";
import { isTransactionProcessed } from "@/lib/modules/transactions-processed/repository.server";

export async function buyFromMarket(
  itemNumber: number,
  buyer: string,
  paymentTxId: string,
) {
  if (!paymentTxId) return { ok: false, error: "Missing on-chain payment transaction" };

  const listing = await findListingByItemNumber(itemNumber);
  if (!listing) return { ok: false, error: "Listing not found" };
  if (listing.seller === buyer) return { ok: false, error: "Cannot buy your own listing" };

  const buyerDoc = await findPlayerByWallet(buyer);
  if (!buyerDoc) return { ok: false, error: "Buyer not registered" };

  const item = await findItemByNumber(itemNumber);
  if (!item || item.owner !== listing.seller) return { ok: false, error: "Item unavailable" };

  if (await isTransactionProcessed(paymentTxId)) {
    return { ok: false, error: "Payment transaction already used" };
  }

  const { jobId, duplicate } = await enqueueMarketPurchase({
    walletAddress: buyer,
    itemNumber,
    itemType: item.slot ?? "item",
    price: listing.price,
    paymentTxId,
  });
  if (duplicate) return { ok: false, error: "Payment transaction already queued" };

  return {
    ok: true,
    queued: true,
    jobId,
    signature: paymentTxId,
    itemNumber,
    price: listing.price,
  };
}
