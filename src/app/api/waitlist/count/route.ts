// GET /api/waitlist/count
// Returns aggregate count of waitlist entries. Public, no auth.
// Force-dynamic so every request hits the DB live (no stale build-time cache).

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url?.startsWith("http") || !key) {
    return NextResponse.json({ count: 0 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { count, error } = await supabase
    .from("waitlist")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("[WAITLIST COUNT]", error);
    return NextResponse.json({ count: 0 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
