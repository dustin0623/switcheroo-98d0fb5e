// lib/api/error-response.ts
// Thin helpers used by every Route Handler to return consistent JSON shapes.

export function apiOk(data: Record<string, unknown> = {}, status = 200): Response {
  return Response.json({ success: true, ...data }, { status });
}

export function apiError(message: string, code: string, status: number): Response {
  return Response.json({ success: false, error: message, code }, { status });
}
