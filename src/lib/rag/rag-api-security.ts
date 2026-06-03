import { NextRequest, NextResponse } from "next/server";

type RagSession = {
  id: string;
  email?: string;
};

const SESSION_KEY = "aicomply_session";
const WINDOW_MS = 60_000;
const MAX_REQ = 12;
const _rateMap = new Map<string, number[]>();

export function getRagSession(request: NextRequest): RagSession | null {
  const raw = request.cookies.get(SESSION_KEY)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<RagSession>;
    if (!parsed.id || typeof parsed.id !== "string") return null;
    return {
      id: parsed.id,
      email: typeof parsed.email === "string" ? parsed.email : undefined,
    };
  } catch {
    return null;
  }
}

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function enforceRagRateLimit(request: NextRequest): NextResponse | null {
  const key = clientIp(request);
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const hits = (_rateMap.get(key) ?? []).filter((t) => t > windowStart);
  hits.push(now);
  _rateMap.set(key, hits);

  if (hits.length <= MAX_REQ) return null;

  return NextResponse.json(
    { error: "Troppe richieste. Riprova tra qualche minuto." },
    { status: 429 }
  );
}
