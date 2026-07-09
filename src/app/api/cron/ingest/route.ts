import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/supabase";
import { ingestAll } from "@/lib/ingest";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Cron entrypoint. Called by Vercel Cron or GitHub Actions with
 * Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results = await ingestAll(getDb());
  const ok = results.every((r) => !r.error);
  return NextResponse.json({ ok, results }, { status: ok ? 200 : 500 });
}
