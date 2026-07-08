/**
 * Best-effort in-memory sliding-window rate limiter for the recognize route.
 * Guards a public, paid vision endpoint against a single client burning the
 * API budget. It is deliberately simple: the store is per-process, so under
 * Fluid Compute (multiple warm instances) the effective limit is per instance,
 * not global — good enough as a first line of defence, not a billing control.
 * Pair it with a hard image-size cap and provider-side spend limits.
 */
export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the caller may retry (0 when allowed). Feeds Retry-After. */
  retryAfterSec: number;
}

/** Requests permitted per key within the window. */
const DEFAULT_LIMIT = 12;
/** Rolling window length. 12/min ≈ one capture every 5s — ample for a human. */
const DEFAULT_WINDOW_MS = 60_000;

/** key → ascending hit timestamps within the current window. */
const hits = new Map<string, number[]>();

/** Above this many tracked keys, sweep out fully-expired entries so one-off
 *  (or spoofed) keys can't grow the map without bound on a long-lived process. */
const MAX_KEYS = 10_000;

/** Drop keys whose every timestamp has aged out of the window. */
function sweep(cutoff: number): void {
  for (const [key, timestamps] of hits) {
    const live = timestamps.filter((t) => t > cutoff);
    if (live.length === 0) hits.delete(key);
    else hits.set(key, live);
  }
}

/**
 * Record an attempt for `key` and report whether it is allowed. Sliding window:
 * timestamps older than the window are dropped before counting, so the limit is
 * a true rolling rate rather than a fixed bucket that resets on a boundary.
 */
export function rateLimit(
  key: string,
  now: number = Date.now(),
  limit: number = DEFAULT_LIMIT,
  windowMs: number = DEFAULT_WINDOW_MS
): RateLimitResult {
  const cutoff = now - windowMs;
  if (hits.size > MAX_KEYS) sweep(cutoff);
  const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);

  if (recent.length >= limit) {
    // Oldest in-window hit dictates when a slot frees up.
    const retryAfterSec = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
    hits.set(key, recent); // persist the pruned list; do not count this attempt
    return { ok: false, retryAfterSec };
  }

  recent.push(now);
  hits.set(key, recent);
  return { ok: true, retryAfterSec: 0 };
}

/** Test-only: clear all recorded hits so cases don't leak state into each other. */
export function _resetRateLimit(): void {
  hits.clear();
}
