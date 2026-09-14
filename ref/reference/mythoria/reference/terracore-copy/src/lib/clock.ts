// Real-time clock source. Game mechanics use real hours/days as documented.
// Tests can inject a fake anchor via resetClock().
export const TIME_SCALE_SECONDS = 1;

let baseReal = Date.now();
let baseGame = Date.now();

export function now(): number {
  const realElapsed = Date.now() - baseReal;
  return baseGame + realElapsed * TIME_SCALE_SECONDS;
}

// For tests / resets.
export function resetClock(anchor: number = Date.now()) {
  baseReal = Date.now();
  baseGame = anchor;
}

