/**
 * server/game-smart-contract/lib/logger.ts
 *
 * Minimal timestamped logger for the smart-contract worker.
 * Dependency-free. Never logs treasury secrets.
 */

import { config } from "@/lib/config/config";

const CHAIN = config.blockchain.chain.toUpperCase();
const TAG   = `[${CHAIN} Worker]`;

function ts(): string {
  return new Date().toISOString();
}

function redact(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    const sensitive = /key|secret|private/i.test(k);
    out[sensitive ? `${k}<redacted>` : k] = sensitive ? "***" : v;
  }
  return out;
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    console.log(`${ts()} ${TAG} ${message}`, meta ? redact(meta) : "");
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(`${ts()} ${TAG} ${message}`, meta ? redact(meta) : "");
  },
  error(message: string, meta?: Record<string, unknown>): void {
    console.error(`${ts()} ${TAG} ${message}`, meta ? redact(meta) : "");
  },
};
