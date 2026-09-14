import { getDataset } from "@/mock/dataset";
import type { ItemTemplate } from "@/mock/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const rarity = url.searchParams.get("rarity");
  const edition = url.searchParams.get("edition");
  const sort = url.searchParams.get("sort") ?? "item_asc";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 60), 500);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
  let list: ItemTemplate[] = getDataset().itemsArchive.slice();
  if (type) list = list.filter((i) => i.type === type);
  if (rarity) list = list.filter((i) => i.rarity === rarity);
  if (edition) list = list.filter((i) => i.edition === edition);
  const sorters: Record<string, (a: ItemTemplate, b: ItemTemplate) => number> = {
    item_asc: (a, b) => a.item_number - b.item_number,
    item_desc: (a, b) => b.item_number - a.item_number,
    damage: (a, b) => b.attributes.damage - a.attributes.damage,
    defense: (a, b) => b.attributes.defense - a.attributes.defense,
    engineering: (a, b) => b.attributes.engineering - a.attributes.engineering,
    crit: (a, b) => b.attributes.crit - a.attributes.crit,
    dodge: (a, b) => b.attributes.dodge - a.attributes.dodge,
    luck: (a, b) => b.attributes.luck - a.attributes.luck,
  };
  list.sort(sorters[sort] ?? sorters.item_asc!);
  return Response.json({ total: list.length, data: list.slice(offset, offset + limit) });
}
