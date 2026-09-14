import { getDataset } from "@/mock/dataset";
export async function GET() {
  return Response.json(getDataset().marketConsumables);
}
