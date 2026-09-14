// TanStack: src/routes/api/mock/claim_logs.$user.ts — `params.user` string param.
// Next.js dynamic segments live in a folder named `[user]`; the handler
// receives `{ params: Promise<{ user: string }> }` (async params in Next 15).
import { getDataset } from "@/mock/dataset";

export async function GET(_: Request, { params }: { params: Promise<{ user: string }> }) {
  const { user } = await params;
  return Response.json(getDataset().claimLogs[user] ?? []);
}
