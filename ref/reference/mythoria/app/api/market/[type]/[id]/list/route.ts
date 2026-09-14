import { apiOk, apiError }       from "@/lib/api/error-response";
import { getWallet }              from "@/lib/api/get-wallet";
import { listItem }               from "@/lib/modules/items/repository.server";
import { listCrate }              from "@/lib/modules/crates/repository.server";
import { listConsumable }         from "@/lib/modules/consumables/repository.server";
import { listRelic }              from "@/lib/modules/relics/repository.server";
import type { Rarity }            from "@/lib/modules/items/types.server";

type Params = Promise<{ type: string; id: string }>;

export async function POST(
  req: Request,
  { params }: { params: Params },
): Promise<Response> {
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Not authenticated", "UNAUTHORIZED", 401);

  const { type, id } = await params;
  const body = await req.json() as { price?: number; amount?: number };
  const { price, amount } = body;

  if (!price || price <= 0) {
    return apiError("price must be a positive number", "INVALID_PRICE", 400);
  }

  switch (type) {
    case "items": {
      const item_number = parseInt(id, 10);
      if (isNaN(item_number)) return apiError("Invalid item number", "INVALID_ID", 400);
      const result = await listItem(item_number, wallet, price);
      if (!result.ok) return apiError(result.error ?? "Failed to list item", "LIST_FAILED", 422);
      return apiOk({ status: "listed", item_number, price });
    }
    case "crates": {
      const result = await listCrate(id, wallet, price);
      if (!result.ok) return apiError(result.error ?? "Failed to list crate", "LIST_FAILED", 422);
      return apiOk({ status: "listed", crateId: id, price });
    }
    case "consumables": {
      if (!amount || amount < 1) return apiError("amount is required for consumables", "INVALID_AMOUNT", 400);
      const result = await listConsumable(wallet, id, amount, price);
      if (!result.ok) return apiError(result.error ?? "Failed to list consumable", "LIST_FAILED", 422);
      return apiOk({ status: "listed", type: id, amount, price });
    }
    case "relics": {
      if (!amount || amount < 1) return apiError("amount is required for relics", "INVALID_AMOUNT", 400);
      const result = await listRelic(wallet, id as Rarity, amount, price);
      if (!result.ok) return apiError(result.error ?? "Failed to list relic", "LIST_FAILED", 422);
      return apiOk({ status: "listed", type: id, amount, price });
    }
    default:
      return apiError(`Unknown market type: ${type}`, "INVALID_TYPE", 400);
  }
}
