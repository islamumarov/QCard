import { NextResponse } from "next/server";

// Lightweight in-memory fixed-window rate limiter for the API routes.
//
// The LLM-backed endpoints (session/answer/feedback/tts) each cost real money
// and latency per call, so a single client should not be able to hammer them.
// This guards against accidental loops and casual abuse without any external
// dependency (Redis etc.) — buckets live in the Node process, which is fine for
// the single-instance, SQLite-backed deployment this app targets.
//
// Gracefully optional, mirroring the LLM-key / auth pattern: set
// RATE_LIMIT_DISABLED=1 to turn the guard off entirely (handy for tests/CI).

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Cap the map so a flood of distinct keys can't grow it without bound; when we
// cross the threshold we drop already-expired windows before inserting more.
const MAX_BUCKETS = 10_000;

type RateLimitResult = { ok: true } | { ok: false; retryAfter: number };

function disabled(): boolean {
  return process.env.RATE_LIMIT_DISABLED === "1" || process.env.RATE_LIMIT_DISABLED === "true";
}

function sweep(now: number) {
  for (const [key, b] of buckets) {
    if (now >= b.resetAt) buckets.delete(key);
  }
}

function check(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || now >= b.resetAt) {
    if (buckets.size >= MAX_BUCKETS) sweep(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (b.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }

  b.count += 1;
  return { ok: true };
}

// Best-effort client identity: trust the first hop of x-forwarded-for (set by a
// reverse proxy), then x-real-ip, then a constant so the limit still applies
// when no IP is available (shared bucket is acceptable for a local app).
function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Enforce a per-IP rate limit for the named route. Returns a 429 `NextResponse`
 * (with a `Retry-After` header) when the caller is over the limit, or `null`
 * when the request may proceed. Call at the top of a route handler:
 *
 *   const limited = enforceRateLimit(req, "answer", { limit: 30 });
 *   if (limited) return limited;
 */
export function enforceRateLimit(
  req: Request,
  name: string,
  opts: { limit: number; windowMs?: number },
): NextResponse | null {
  if (disabled()) return null;

  const windowMs = opts.windowMs ?? 60_000;
  const result = check(`${name}:${clientIp(req)}`, opts.limit, windowMs);
  if (result.ok) return null;

  return NextResponse.json(
    { error: "Too many requests — please slow down and try again shortly." },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
  );
}
