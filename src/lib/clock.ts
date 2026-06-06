// Single wall-clock seam for app code. Never call Date.now() or zero-arg `new Date()`
// elsewhere — route time through here so tests can make "now" deterministic.
export type Clock = { nowMs(): number };

const systemClock: Clock = { nowMs: () => Date.now() };
let clock: Clock = systemClock;

export function nowMs(): number {
  return clock.nowMs();
}

export function nowDate(): Date {
  return new Date(nowMs());
}

export function nowIso(): string {
  return nowDate().toISOString();
}

export function setClockForTests(next: Clock | Date | number): void {
  if (typeof next === "number") {
    clock = { nowMs: () => next };
    return;
  }
  if (next instanceof Date) {
    const ms = next.getTime();
    clock = { nowMs: () => ms };
    return;
  }
  clock = next;
}

export function resetClockForTests(): void {
  clock = systemClock;
}

export async function withClock<T>(next: Clock | Date | number, fn: () => Promise<T>): Promise<T> {
  const prev = clock;
  setClockForTests(next);
  try {
    return await fn();
  } finally {
    clock = prev;
  }
}
