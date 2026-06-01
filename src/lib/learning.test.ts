import { describe, it, expect } from "vitest";
import {
  applyGrade,
  comprehensionPct,
  effectiveGloss,
  freshLemmaState,
  isConsecutiveDay,
  isDue,
  localDateKey,
  needsIntensive,
  statusOf,
  tokensCovered,
} from "./learning";

const NOW = new Date("2026-05-24T10:00:00Z").getTime();

describe("applyGrade – FSRS v5", () => {
  it("moves a new card to Learning state after first 'good'", () => {
    const next = applyGrade(undefined, "good", NOW);
    expect(next.reps).toBe(1);
    expect(next.state).toBe(1); // Learning
    expect(next.due).toBeGreaterThan(NOW);
  });

  it("'again' on a new card schedules a short retry", () => {
    const lapse = applyGrade(undefined, "again", NOW);
    // FSRS only increments lapses when a Review-state card is forgotten
    expect(lapse.due).toBeGreaterThan(NOW);
    expect(lapse.due - NOW).toBeLessThan(30 * 60 * 1000); // Within 30 minutes
  });

  it("'again' on a Review-state card increments lapses", () => {
    let s = applyGrade(undefined, "good", NOW);
    s = applyGrade(s, "good", s.due); // Graduate to Review
    expect(s.state).toBe(2);
    const lapsed = applyGrade(s, "again", s.due);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.state).toBe(3); // Relearning
  });

  it("'easy' produces a later due date than 'good' from a fresh card", () => {
    const good = applyGrade(undefined, "good", NOW);
    const easy = applyGrade(undefined, "easy", NOW);
    expect(easy.due).toBeGreaterThanOrEqual(good.due);
  });

  it("graduates from Learning to Review after passing learning steps", () => {
    let s = applyGrade(undefined, "good", NOW);
    expect(s.state).toBe(1); // Learning
    s = applyGrade(s, "good", s.due); // Review on due date
    expect(s.state).toBe(2); // Review
  });

  it("stability grows with correct reviews at proper intervals", () => {
    let s = applyGrade(undefined, "good", NOW);
    s = applyGrade(s, "good", s.due);
    expect(s.stability).toBeGreaterThan(0);
    const stability2 = s.stability;
    s = applyGrade(s, "good", s.due);
    expect(s.stability).toBeGreaterThanOrEqual(stability2);
  });

  it("reaches strong status after enough correct reviews with proper gaps", () => {
    let s = applyGrade(undefined, "good", NOW);
    s = applyGrade(s, "good", s.due);
    s = applyGrade(s, "good", s.due);
    s = applyGrade(s, "good", s.due);
    // Stability should exceed 21 days (strong threshold) after 4 on-time reviews
    expect(s.stability).toBeGreaterThan(21);
    expect(statusOf(s)).toBe("strong");
  });
});

describe("statusOf – FSRS states", () => {
  it("returns 'new' for never-reviewed cards", () => {
    expect(statusOf(undefined)).toBe("new");
    expect(statusOf(freshLemmaState(NOW))).toBe("new");
  });

  it("returns 'weak' while card is in Learning state", () => {
    const s = applyGrade(undefined, "good", NOW);
    expect(s.state).toBe(1); // Learning
    expect(statusOf(s)).toBe("weak");
  });

  it("returns 'good' once card graduates to Review", () => {
    let s = applyGrade(undefined, "good", NOW);
    s = applyGrade(s, "good", s.due);
    expect(s.state).toBe(2); // Review
    expect(statusOf(s)).toBe("good");
  });

  it("returns 'weak' after a lapse (Relearning state)", () => {
    let s = applyGrade(undefined, "good", NOW);
    s = applyGrade(s, "good", s.due);
    s = applyGrade(s, "again", s.due); // Lapse
    expect(statusOf(s)).toBe("weak");
  });
});

describe("isDue", () => {
  it("treats undefined cards as due now", () => {
    expect(isDue(undefined, NOW)).toBe(true);
  });

  it("respects the due timestamp", () => {
    const s = applyGrade(undefined, "good", NOW);
    // Card in Learning — due in ~10 minutes, not due after 1 second
    expect(isDue(s, NOW + 1000)).toBe(false);
    // Due after more than 10 minutes
    expect(isDue(s, NOW + 11 * 60 * 1000)).toBe(true);
  });
});

describe("needsIntensive", () => {
  it("is false for unseen or never-forgotten cards", () => {
    expect(needsIntensive(undefined)).toBe(false);
    expect(needsIntensive(freshLemmaState(NOW))).toBe(false);
    expect(needsIntensive({ ...freshLemmaState(NOW), lapses: 1 })).toBe(false);
  });

  it("is true once a card has been forgotten twice", () => {
    expect(needsIntensive({ ...freshLemmaState(NOW), lapses: 2 })).toBe(true);
    expect(needsIntensive({ ...freshLemmaState(NOW), lapses: 5 })).toBe(true);
  });
});

describe("comprehension math", () => {
  const freq = [
    { lemma: "اللَّه", count: 100 },
    { lemma: "رَبّ", count: 50 },
    { lemma: "كَتَب", count: 5 },
  ];

  it("counts only good/strong lemmas toward coverage", () => {
    // Two good reviews → Review state (good)
    let reviewedState = applyGrade(undefined, "good", NOW);
    reviewedState = applyGrade(reviewedState, "good", reviewedState.due);
    expect(reviewedState.state).toBe(2); // Review state → "good"

    const states = {
      "اللَّه": reviewedState,
      "كَتَب": freshLemmaState(NOW), // status: new
    };
    expect(tokensCovered(freq, states)).toBe(100);
    expect(comprehensionPct(freq, states, 155)).toBeCloseTo((100 / 155) * 100, 2);
  });
});

describe("effectiveGloss", () => {
  it("returns the native gloss when present", () => {
    expect(effectiveGloss({ en: "and", ms: "dan" }, "en")).toMatchObject({
      text: "and",
      isFallback: false,
    });
    expect(effectiveGloss({ en: "and", ms: "dan" }, "ms")).toMatchObject({
      text: "dan",
      isFallback: false,
    });
  });

  it("falls back to the other language and marks it", () => {
    expect(effectiveGloss({ en: "thing", ms: null }, "ms")).toMatchObject({
      text: "thing",
      isFallback: true,
    });
    expect(effectiveGloss({ en: null, ms: "sesuatu" }, "en")).toMatchObject({
      text: "sesuatu",
      isFallback: true,
    });
  });

  it("returns null when both glosses are missing", () => {
    expect(effectiveGloss({ en: null, ms: null }, "en")).toBeNull();
    expect(effectiveGloss({ en: null, ms: null }, "ms")).toBeNull();
  });
});

describe("streak helpers", () => {
  it("recognizes consecutive days across a month boundary", () => {
    expect(isConsecutiveDay("2026-01-31", "2026-02-01")).toBe(true);
    expect(isConsecutiveDay("2025-12-31", "2026-01-01")).toBe(true);
  });
  it("rejects same-day and gaps", () => {
    expect(isConsecutiveDay("2026-05-24", "2026-05-24")).toBe(false);
    expect(isConsecutiveDay("2026-05-24", "2026-05-26")).toBe(false);
    expect(isConsecutiveDay("", "2026-05-24")).toBe(false);
  });
  it("formats local date keys deterministically", () => {
    const d = new Date(2026, 0, 7); // Jan 7 local
    expect(localDateKey(d)).toBe("2026-01-07");
  });
});
