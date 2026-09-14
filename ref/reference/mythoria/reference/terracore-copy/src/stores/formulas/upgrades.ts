// Mirrors docs §8 Stat Upgrades
export function engineeringCost(currentLevel: number): number {
  return Math.pow(currentLevel, 2);
}
export function damageCost(currentDamage: number): number {
  return Math.pow(currentDamage / 10, 2);
}
export function defenseCost(currentDefense: number): number {
  return Math.pow(currentDefense / 10, 2);
}
