import { apiOk, apiError }       from "@/lib/api/error-response";
import { getWallet }              from "@/lib/api/get-wallet";
import { delistItem }             from "@/lib/modules/items/repository.server";
import { delistCrate }            from "@/lib/modules/crates/repository.server";
import { delistConsumable }       from "@/lib/modules/consumables/repository.server";
import { delistRelic }            from "@/lib/modules/relics/repository.server";
import type { Rarity }            from "@/lib/modules/items/types.server";

type Params = Promise<{ type: string; id: string }>;

export async function POST(
  req: Request,
  { params }: { params: Params },
): Promise<Response> {
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Not authenticated", "UNAUTHORIZED", 401);

  const { type, id } = await params;

  switch (type) {
    case "items": {
      const item_number = parseInt(id, 10);
      if (isNaN(item_number)) return apiError("Invalid item number", "INVALID_ID", 400);
      const result = await delistItem(item_number, wallet);
      if (!result.ok) return apiError(result.error ?? "Failed to delist", "DELIST_FAILED", 422);
      return apiOk({ status: "delisted", item_number });
    }
    case "crates": {
      const result = await delistCrate(id, wallet);
      if (!result.ok) return apiError(result.error ?? "Failed to delist", "DELIST_FAILED", 422);
      return apiOk({ status: "delisted", crateId: id });
    }
    case "consumables": {
      const result = await delistConsumable(wallet, id);
      if (!result.ok) return apiError(result.error ?? "Failed to delist", "DELIST_FAILED", 422);
      return apiOk({ status: "delisted", type: id });
    }
    case "relics": {
      const result = await delistRelic(wallet, id as Rarity);
      if (!result.ok) return apiError(result.error ?? "Failed to delist", "DELIST_FAILED", 422);
      return apiOk({ status: "delisted", type: id });
    }
    default:
      return apiError(`Unknown market type: ${type}`, "INVALID_TYPE", 400);
  }
}
