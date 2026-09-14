import { authenticateRequest } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/cors";
import { salvageItem, findItemsByOwner } from "@/lib/modules/items/repository.server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const itemInput = z.object({ itemNumber: z.number().int().positive() });

function toItemDto(item: Awaited<ReturnType<typeof findItemsByOwner>>[number]) {
  return {
    itemNumber: item.itemNumber,
    owner: item.owner,
    name: item.name,
    slot: item.slot,
    rarity: item.rarity,
    level: item.level,
    stats: item.stats,
    equipped: item.equipped,
    salvaged: item.salvaged,
    image: item.image,
    createdAt: item.createdAt,
    lastTransfer: item.lastTransfer,
  };
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const { itemNumber } = itemInput.parse(body);
    const result = await salvageItem(itemNumber, auth.wallet);
    return jsonResponse(
      { ...result, item: result.item ? toItemDto(result.item) : undefined },
      request,
      { status: result.ok ? 200 : 400 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonResponse({ ok: false, error: "Invalid request", issues: err.issues }, request, { status: 400 });
    }
    // eslint-disable-next-line no-console
    console.error("[items/salvage]", err);
    return jsonResponse({ ok: false, error: "Internal server error" }, request, { status: 500 });
  }
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: { "Access-Control-Allow-Methods": "POST, OPTIONS" } });
}
