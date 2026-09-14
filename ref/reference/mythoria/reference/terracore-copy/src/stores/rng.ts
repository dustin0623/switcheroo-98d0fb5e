import seedrandom from "seedrandom";

export function createSeed(blockId: string | number, trxId: string | number, hash: string): string {
  return `${blockId}@${trxId}@${hash}`;
}

export function rollDice(index: number, seed: string): number {
  const rng = seedrandom(seed, { state: true });
  return rng() * (index - 0.01 * index) + 0.01 * index;
}

export function generateRandomNumber(seed: string): number {
  const rng = seedrandom(seed, { state: true });
  return Math.floor(rng() * 100000);
}

export function rngFloat(seed: string): number {
  return seedrandom(seed, { state: true })();
}

export function rngInt(seed: string, max: number): number {
  return Math.floor(seedrandom(seed, { state: true })() * max);
}
