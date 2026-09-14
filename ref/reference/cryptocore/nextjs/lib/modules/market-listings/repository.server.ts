// src/lib/modules/market-listings/repository.server.ts
import { MarketListingModel } from "./model.server";
import type { IMarketListing } from "./types.server";
import { connectDatabase } from "@/lib/config/database";

export async function listItem(input: {
  seller: string;
  itemNumber: number;
  price: number;
}): Promise<{ ok: boolean; listing?: IMarketListing; error?: string }> {
  await connectDatabase();
  try {
    const listing = await MarketListingModel.create({
      seller:     input.seller,
      itemNumber: input.itemNumber,
      price:      input.price,
      status:     "active",
      listedAt:   Date.now(),
    });
    return { ok: true, listing: listing.toObject() };
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return { ok: false, error: "Item already listed" };
    }
    throw err;
  }
}

export async function findListingByItemNumber(itemNumber: number): Promise<IMarketListing | null> {
  await connectDatabase();
  return MarketListingModel.findOne({ itemNumber, status: "active" }).lean<IMarketListing>();
}

export async function findActiveListings(
  sort: "price_asc" | "price_desc" | "newest" = "newest",
  limit:  number = 50,
  cursor?: number,
): Promise<{ listings: IMarketListing[]; nextCursor: number | null }> {
  await connectDatabase();
  const sortDef: Record<string, 1 | -1> =
    sort === "price_asc"  ? { price: 1 } :
    sort === "price_desc" ? { price: -1 } :
                            { listedAt: -1 };

  const filter: Record<string, unknown> = { status: "active" };
  if (cursor != null) filter["listedAt"] = { $lt: cursor };

  const rows = await MarketListingModel
    .find(filter)
    .sort(sortDef)
    .limit(limit + 1)
    .lean<IMarketListing[]>();

  const hasMore = rows.length > limit;
  const listings = hasMore ? rows.slice(0, limit) : rows;
  const last = listings[listings.length - 1];
  const nextCursor = hasMore && last ? last.listedAt : null;
  return { listings, nextCursor };
}

export async function markSold(
  itemNumber: number,
  buyer: string,
): Promise<{ ok: boolean; listing?: IMarketListing; error?: string }> {
  await connectDatabase();
  const listing = await MarketListingModel.findOneAndUpdate(
    { itemNumber, status: "active" },
    { $set: { status: "sold", soldTo: buyer, soldAt: Date.now() } },
    { new: true }
  );
  if (!listing) return { ok: false, error: "Listing not active" };
  return { ok: true, listing: listing.toObject() };
}

export async function cancelListing(
  itemNumber: number,
  seller: string,
): Promise<{ ok: boolean; error?: string }> {
  await connectDatabase();
  const result = await MarketListingModel.updateOne(
    { itemNumber, seller, status: "active" },
    { $set: { status: "cancelled" } }
  );
  if (result.modifiedCount === 0) return { ok: false, error: "Listing not active or not owned by seller" };
  return { ok: true };
}
