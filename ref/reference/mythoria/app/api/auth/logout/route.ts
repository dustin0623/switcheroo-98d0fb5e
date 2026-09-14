// app/api/auth/logout/route.ts
import { apiOk } from "@/lib/api/error-response";
import { cookies } from "next/headers";

export async function POST(): Promise<Response> {
  const cookieStore = await cookies();
  cookieStore.delete("mythoria_token");
  return apiOk({ ok: true });
}
