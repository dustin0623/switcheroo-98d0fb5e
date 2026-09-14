import { apiOk, apiError }       from "@/lib/api/error-response";
import { getWallet }              from "@/lib/api/get-wallet";
import { connectDatabase }        from "@/lib/config/database";
import { ItemModel }              from "@/lib/modules/items/model.server";
import { CrateModel }             from "@/lib/modules/crates/model.server";
import { ConsumableModel }        from "@/lib/modules/consumables/model.server";
import { RelicModel }             from "@/lib/modules/relics/model.server";

export async function GET(req: Request): Promise<Response> {
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Not authenticated", "UNAUTHORIZED", 401);

  await connectDatabase();

  const [items, crates, consumables, relics] = await Promise.all([
    ItemModel.find({ owner: wallet, burnt: { $ne: true } }).lean(),
    CrateModel.find({ owner: wallet }).lean(),
    ConsumableModel.find({ wallet, amount: { $gt: 0 } }).lean(),
    RelicModel.find({ wallet, amount: { $gt: 0 } }).lean(),
  ]);

  return apiOk({ items, crates, consumables, relics });
}
