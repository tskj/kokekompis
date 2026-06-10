import { config } from "dotenv";
import { afterEach, beforeEach, vi } from "vitest";
import { resetClockForTests } from "@/lib/clock";
import { isShouldNeverAllowed } from "@/lib/assert";
import * as reportModule from "@/lib/report";
import { deriveDbUrl } from "../scripts/db-name.mjs";

// Load the committed test env (base test-DB url) under any local overrides, then derive the
// per-worktree database name — BEFORE any test imports @/lib/db, which reads DATABASE_URL at import.
config({ path: [".env.local", ".env.test"] });
process.env.DATABASE_URL = deriveDbUrl(process.env.DATABASE_URL);

// A truthy shouldNever predicate is always a bug — fail the test that triggered it, unless the test
// opted in via withShouldNeverAllowed (exercising a recovery branch on purpose).
const unallowedShouldNevers: string[] = [];

beforeEach(() => {
  resetClockForTests();
  unallowedShouldNevers.length = 0;

  vi.spyOn(reportModule, "report").mockImplementation((payload) => {
    const isShouldNever =
      payload.kind === "should-never" || payload.kind.startsWith("should-never:");
    if (isShouldNever && !isShouldNeverAllowed()) unallowedShouldNevers.push(payload.message);

    console.error(JSON.stringify({ from: "test", ...payload }));
  });
});

afterEach(() => {
  vi.restoreAllMocks();

  if (unallowedShouldNevers.length > 0) {
    const msgs = unallowedShouldNevers.slice();
    unallowedShouldNevers.length = 0;

    throw new Error(
      "shouldNever predicate fired during this test (a truthy predicate is always a bug):\n" +
        msgs.map((m) => `  - ${m}`).join("\n"),
    );
  }
});
