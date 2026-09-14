// TanStack Start equivalent: src/routes/api/mock/battle.ts
// - TanStack: `createFileRoute("/api/mock/battle")({ server: { handlers: { GET } } })`
// - Next.js:  `app/api/mock/battle/route.ts` exports named `GET`/`POST`/...
// Both receive a standard Web `Request`; both return a standard `Response`.
import { getDataset } from "@/mock/dataset";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
  const players = getDataset().battle.players.slice(offset, offset + limit);
  return Response.json({ players });
}
