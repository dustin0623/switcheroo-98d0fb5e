import { apiOk, apiError } from "@/lib/api/error-response";
import { findPlayer } from "@/lib/modules/players/repository.server";

type Params = Promise<{ wallet: string }>;

export async function GET(
  _req: Request,
  { params }: { params: Params }
): Promise<Response> {
  const { wallet } = await params;
  if (!wallet) return apiError("Missing wallet", "INVALID_PARAMS", 400);
  // Accept both username and raw wallet address for public profile lookups
  const player = await findPlayer(wallet);
  if (!player) return apiError("Player not found", "NOT_FOUND", 404);
  return apiOk({ player });
}
