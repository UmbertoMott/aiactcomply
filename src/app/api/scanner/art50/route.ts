// POST /api/scanner/art50 — public, no auth required.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { scanUrl } from "@/lib/scanner/art50-detector";

// ─── Rate limiter ─────────────────────────────────────────────────────────────
const _rateMap = new Map<string, number[]>();
const MAX_REQ = 10;
const WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const hits = (_rateMap.get(ip) ?? []).filter(t => t > windowStart);
  hits.push(now);
  _rateMap.set(ip, hits);
  return hits.length > MAX_REQ;
}

// ─── Private IP guard ─────────────────────────────────────────────────────────
const PRIVATE_RE =
  /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d+\.\d+|0\.0\.0\.0|::1|::ffff:0:0\/96|fe80:|fc00:|fd[0-9a-f]{2}:)$/i;

// ─── Schema ───────────────────────────────────────────────────────────────────
const BodySchema = z.object({
  url: z
    .string()
    .url()
    .refine(u => u.startsWith("http://") || u.startsWith("https://"), {
      message: "URL must start with http:// or https://",
    }),
});

// ─── CORS (same-origin only) ──────────────────────────────────────────────────
function cors(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const host   = req.headers.get("host")   ?? "";
  let allowed = "null";
  try {
    const originHost = new URL(origin).host;
    if (originHost === host) allowed = origin;
  } catch { /* non-URL origin → deny */ }
  return {
    "Access-Control-Allow-Origin":  allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req) });
}

export async function POST(req: NextRequest) {
  const c = cors(req);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Troppe richieste. Riprova tra qualche minuto." }, { status: 429, headers: c });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "URL non valido" }, { status: 400, headers: c }); }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "URL non valido" }, { status: 400, headers: c });
  }

  let hostname: string;
  try { hostname = new URL(parsed.data.url).hostname; }
  catch { return NextResponse.json({ error: "URL non valido" }, { status: 400, headers: c }); }

  if (PRIVATE_RE.test(hostname)) {
    return NextResponse.json({ error: "URL non valido" }, { status: 400, headers: c });
  }

  try {
    const result = await scanUrl(parsed.data.url);
    return NextResponse.json(result, { status: 200, headers: c });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isNet =
      msg.includes("fetch") || msg.includes("ENOTFOUND") || msg.includes("ECONNREFUSED") ||
      msg.includes("timeout") || msg.includes("TimeoutError") || msg.includes("AbortError");

    if (isNet) {
      return NextResponse.json(
        { error: "Impossibile raggiungere l'URL. Verifica che il sito sia pubblico e accessibile." },
        { status: 422, headers: c }
      );
    }
    console.error("[art50-scanner]", err);
    return NextResponse.json({ error: "Errore durante la scansione. Riprova tra qualche minuto." }, { status: 500, headers: c });
  }
}
