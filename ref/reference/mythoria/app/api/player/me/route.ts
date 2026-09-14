import { apiOk, apiError } from "@/lib/api/error-response";
import { getWallet } from "@/lib/api/get-wallet";
import { findPlayer } from "@/lib/modules/players/repository.server";

export async function GET(req: Request): Promise<Response> {
  const username = await getWallet(req);
  if (!username) return apiError("Not authenticated", "UNAUTHORIZED", 401);
  const player = await findPlayer(username);
  if (!player) return apiError("Player not found", "NOT_FOUND", 404);
  return apiOk({ player });
}
