// src/lib/auth/rate-limit.ts
// Rate limiting distribuito tramite Upstash Redis (Sliding Window).
// Fallback automatico a Map in-memory se UPSTASH_REDIS_REST_URL non è configurato
// (es. sviluppo locale). Su Vercel production deve essere configurato Upstash.

// ── In-memory fallback (solo sviluppo locale) ────────────────────────────────
const localAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minuti

// ── Upstash lazy-init ─────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _limiter: any = null;
let _limiterInitialized = false;

async function getUpstashLimiter() {
  if (_limiterInitialized) return _limiter;
  _limiterInitialized = true;

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    _limiter = null;
    return null;
  }

  try {
    const { Redis } = await import("@upstash/redis");
    const { Ratelimit } = await import("@upstash/ratelimit");

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    _limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(MAX_ATTEMPTS, "15 m"),
      prefix: "aicomply:login",
    });

    return _limiter;
  } catch (e) {
    console.warn("[RateLimit] Upstash init failed, using in-memory fallback:", e);
    _limiter = null;
    return null;
  }
}

// ── API asincrona (usa Upstash se disponibile) ────────────────────────────────

export async function checkRateLimitAsync(
  ip: string
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const limiter = await getUpstashLimiter();

  if (limiter) {
    const result = await limiter.limit(ip);
    if (!result.success) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((result.reset - Date.now()) / 1000)
      );
      return { allowed: false, retryAfterSeconds };
    }
    return { allowed: true };
  }

  // Fallback in-memory
  return checkRateLimit(ip);
}

export async function resetRateLimitAsync(ip: string): Promise<void> {
  const limiter = await getUpstashLimiter();

  if (limiter) {
    try {
      // Upstash Ratelimit non ha un reset diretto: svuotiamo la chiave Redis
      await limiter.redis.del(`aicomply:login:${ip}`);
    } catch {
      // Ignora errori di reset (non critici)
    }
    return;
  }

  // Fallback in-memory
  resetRateLimit(ip);
}

// ── API sincrona — shim per compatibilità con codice esistente ────────────────
// ATTENZIONE: usa sempre la Map locale, anche in prod. Usare le versioni async
// nelle nuove Server Actions.

export function checkRateLimit(
  ip: string
): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = localAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    localAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return { allowed: true };
}

export function resetRateLimit(ip: string): void {
  localAttempts.delete(ip);
}
