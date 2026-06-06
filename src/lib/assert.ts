import { report } from "@/lib/report";

// Throws if nullish; narrows the type for callers. Use for "this can't be missing here".
export function ensure<T>(value: T | null | undefined, message = "expected non-nullish value"): T {
  if (value == null) throw new Error(message);
  return value;
}

// For `?? fail("…")` chains and hard invariant breaks. Returns `never` so it composes inside
// expressions, and reports through the operator sink — a fail() is always something a human
// should know about. Error messages should name the fix, not just the failure.
export function fail(message: string): never {
  report({ kind: "fail", severity: "error", message });
  throw new Error(message);
}

// Compile-time exhaustiveness for discriminated-union switches.
export function unreachable(value: never): never {
  throw new Error(`unreachable: ${JSON.stringify(value)}`);
}

// Soft assert ("this branch should never run, but if it does I want to recover, not crash prod").
// The call site believes `condition` is always false. Returns the EFFECTIVE value so a recovery
// branch can read inline without an extra check:
//
//   if (shouldNever(rows.length === 0, "lookup.empty",
//                   "insert returned no row but ON CONFLICT shouldn't have fired")) {
//     return;  // recover
//   }
//
// Two-arg form `shouldNever(condition, message)` reports under the bare "should-never" kind;
// three-arg form `shouldNever(condition, subKind, message)` reports under "should-never:<subKind>"
// so each site gets its own throttle window in report.ts (per-kind coalescing otherwise collapses
// two distinct violations in the same 5-min window into one). Prefer the sub-kind form.
//
// Behaviour:
//   • condition truthy — a REAL violation (a bug). Reports the should-never[:sub] kind. In prod it
//     RETURNS true so the recovery branch runs; in dev/test it THROWS (loud) — unless an enclosing
//     withShouldNeverAllowed() scope suppresses the throw (tests exercising the recovery on purpose).
//   • condition falsy, FAULT_INJECT_IMPOSSIBLE_STATE set — with that probability (1–100 %), forces
//     the return to true and reports "fault-inject", to deliberately exercise the recovery branch.
//   • condition falsy otherwise — returns false, no report. The hot path.
//
// For type-narrowing or no-recovery invariants, prefer ensure / fail / unreachable (hard asserts).
export function shouldNever(condition: boolean, message: string): boolean;
export function shouldNever(condition: boolean, subKind: string, message: string): boolean;
export function shouldNever(condition: boolean, subKindOrMsg: string, maybeMsg?: string): boolean {
  const subKind = maybeMsg !== undefined ? subKindOrMsg : null;
  const message = maybeMsg ?? subKindOrMsg;
  const kind    = subKind ? `should-never:${subKind}` : "should-never";

  if (condition) {
    report({ kind, severity: "error", message });
    if (!allowShouldNever && process.env.NODE_ENV !== "production") throw new Error(`[${kind}] ${message}`);

    return true;
  }

  const prob = faultInjectProb();
  if (prob > 0 && Math.random() < prob) {
    report({ kind: "fault-inject", message, context: { forced: true, rate: prob, subKind } });
    return true;
  }

  return false;
}

// Test helper: run a callback with a truthy shouldNever allowed to fall through (report still fires,
// but no throw) — for tests that intentionally drive the recovery branch and assert on its behaviour.
export async function withShouldNeverAllowed<T>(callback: () => Promise<T>): Promise<T> {
  const prev = allowShouldNever;
  allowShouldNever = true;
  try {
    return await callback();
  } finally {
    allowShouldNever = prev;
  }
}

// Read by the test setup so it can ignore should-never reports that fired inside an allow scope.
export function isShouldNeverAllowed(): boolean {
  return allowShouldNever;
}

let allowShouldNever = false;

// FAULT_INJECT_IMPOSSIBLE_STATE as a percentage 1–100 (0 / unset / non-numeric → off). Read fresh
// each call (not cached) so tests can flip it per case. The `typeof process` guard keeps client
// bundles — where there's no Node `process` — tree-shaking cleanly to 0.
function faultInjectProb(): number {
  if (typeof process === "undefined") return 0;

  const raw = process.env.FAULT_INJECT_IMPOSSIBLE_STATE;
  if (!raw) return 0;

  const pct = Number(raw);
  if (!Number.isFinite(pct) || pct <= 0) return 0;

  return Math.min(100, pct) / 100;
}

// Build a type predicate from a const array (e.g. for validating a wire string against an enum).
export function memberOf<const T extends readonly unknown[]>(values: T): (v: unknown) => v is T[number] {
  const set = new Set(values);
  return (v: unknown): v is T[number] => set.has(v);
}
