// src/lib/game/rng.ts
import { createHash } from "crypto";

/**
 * Deterministic PRNG seeded from a string. Returns a float in [0, 1).
 */
export function createSeededRng(seed: string): () => number {
  let state = 0;
  const hash = createHash("sha256").update(seed).digest("hex");
  for (let i = 0; i < 8; i++) {
    state = (state * 16 + parseInt(hash.slice(i * 2, i * 2 + 2), 16)) >>> 0;
  }
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
