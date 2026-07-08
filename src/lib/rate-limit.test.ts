import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, _resetRateLimit } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => _resetRateLimit());

  it("allows requests up to the limit, then blocks", () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit("ip", t, 3, 60_000).ok).toBe(true);
    }
    const blocked = rateLimit("ip", t, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBe(60); // full window until the oldest frees
  });

  it("keys are independent", () => {
    expect(rateLimit("a", 0, 1, 60_000).ok).toBe(true);
    expect(rateLimit("a", 0, 1, 60_000).ok).toBe(false);
    expect(rateLimit("b", 0, 1, 60_000).ok).toBe(true); // b unaffected by a
  });

  it("frees a slot once the oldest hit ages out of the window", () => {
    expect(rateLimit("ip", 0, 1, 60_000).ok).toBe(true);
    expect(rateLimit("ip", 30_000, 1, 60_000).ok).toBe(false); // still inside window
    expect(rateLimit("ip", 60_001, 1, 60_000).ok).toBe(true); // first hit expired
  });

  it("blocked attempts do not consume a slot (retryAfter counts down)", () => {
    expect(rateLimit("ip", 0, 1, 60_000).ok).toBe(true);
    const a = rateLimit("ip", 10_000, 1, 60_000);
    const b = rateLimit("ip", 20_000, 1, 60_000);
    expect(a.ok).toBe(false);
    expect(b.ok).toBe(false);
    // Retry-after tracks the original hit's expiry, not each blocked attempt.
    expect(a.retryAfterSec).toBe(50);
    expect(b.retryAfterSec).toBe(40);
  });
});
