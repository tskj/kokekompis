import { NextResponse } from "next/server";

// Railway healthcheck target. Stays cheap (no DB) so a transient DB blip doesn't fail the deploy.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok", service: "kokekompis" });
}
