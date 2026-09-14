import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Invalid client input is a 400, not a server fault.
  if (err instanceof ZodError) {
    res.status(400).json({ ok: false, error: "Invalid request", issues: err.issues });
    return;
  }
  // eslint-disable-next-line no-console
  console.error("[game-api error]", err);
  const status = (err as { status?: number }).status ?? 500;
  const message = process.env["NODE_ENV"] === "production" ? "Internal server error" : err.message;
  res.status(status).json({ ok: false, error: message });
}
