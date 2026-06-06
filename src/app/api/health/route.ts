import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Attr, log, withRequest } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Railway's healthcheck (railway.json `healthcheckPath: "/api/health"`) is what gates a new deploy
// from receiving traffic: a 200 marks the build ready, a 503 keeps the previous build serving and
// fails the new deploy. So we make the probe touch the DB — traffic isn't routed until Postgres is
// reachable over the `*.railway.internal` private network. That mesh takes a couple of seconds to come
// up on a fresh container (the same race scripts/migrate.mjs retries around), and a cold first request
// to `/` was 500ing on ECONNREFUSED before it did.
//
// No retry loop here: Railway re-polls this path until it goes green (within `healthcheckTimeout`), so
// repeated probing IS the retry. The `select 1 … limit 0` validates the connection AND that migrations
// ran (the table reference is parsed) without scanning a row. A failure returns 503, not a thrown 500,
// so Railway reads it as "not ready yet" rather than an app error.
export async function GET(req: Request) {
  return withRequest(req, async () => {
    const check = await dbCheck();

    if (!check.ok) {
      // Emit only on failure — Railway probes every few seconds, and a fact per green probe would
      // drown the log stream. The canonical request line still records every hit.
      log.info(Attr.HEALTH_DB, false);
      return NextResponse.json({ ok: false, error: check.error }, { status: 503 });
    }

    return NextResponse.json({ ok: true });
  });
}

type Check = { ok: true } | { ok: false; error: string };

async function dbCheck(): Promise<Check> {
  try {
    await db.execute(sql`select 1 from "cookbook" limit 0`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
