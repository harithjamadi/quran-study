import { describe, it, expect } from "vitest";
import {
  applyGrade,
  comprehensionPct,
  effectiveGloss,
  freshLemmaState,
  isConsecutiveDay,
  isDue,
  localDateKey,
  statusOf,
  tokensCovered,
} from "./learning";

const NOW = new Date("2026-05-24T10:00:00Z").getTime();

describe("applyGrade", () => {
  it("starts a fresh card on first 'good' review at a 1-day interval", () => {
    const next = applyGrade(undefined, "good", NOW);
    expect(next.successes).toBe(1);
    expect(next.streak).toBe(1);
    expect(next.intervalDays).toBe(1);
    expect(next.nextReview).toBe(NOW + 86_400_000);
  });

  it("'again' resets streak and schedules a 10-minute relearn", () => {
    const after2 = applyGrade(applyGrade(undefined, "good", NOW), "good", NOW);
    const lapse = applyGrade(after2, "again", NOW + 10);
    expect(lapse.streak).toBe(0);
    expect(lapse.lapses).toBe(1);
    expect(lapse.intervalDays).toBe(0);
    expect(lapse.nextReview).toBe(NOW + 10 + 10 * 60 * 1000);
  });

  it("scales the interval up on consecutive 'good' grades", () => {
    let s = applyGrade(undefined, "good", NOW);
    s = applyGrade(s, "good", NOW); // 1 → 3 days
    expect(s.intervalDays).toBe(3);
    s = applyGrade(s, "good", NOW); // 3 → ~7 days
    expect(s.intervalDays).toBe(7);
    s = applyGrade(s, "good", NOW); // ~7 → ~15 days
    expect(s.intervalDays).toBeGreaterThanOrEqual(14);
  });

  it("'easy' applies a 4x multiplier", () => {
    let s = applyGrade(undefined, "good", NOW); // 1 day
    s = applyGrade(s, "easy", NOW); // 1 * 4 = 4
    expect(s.intervalDays).toBe(4);
  });

  it("caps interval at 180 days", () => {
    const s = freshLemmaState(NOW);
    s.intervalDays = 100;
    s.streak = 10;
    const next = applyGrade(s, "easy", NOW);
    expect(next.intervalDays).toBe(180);
  });
});

describe("statusOf", () => {
  it("returns 'new' for never-reviewed cards", () => {
    expect(statusOf(undefined)).toBe("new");
    expect(statusOf(freshLemmaState(NOW))).toBe("new");
  });
  it("flags weak when lapses outnumber successes", () => {
    const s = freshLemmaState(NOW);
    s.successes = 1;
    s.lapses = 2;
    expect(statusOf(s)).toBe("weak");
  });
  it("promotes to good after a 2-streak", () => {
    let s = applyGrade(undefined, "good", NOW);
    s = applyGrade(s, "good", NOW);
    expect(statusOf(s)).toBe("good");
  });
  it("promotes to strong only after a 4-streak AND long interval", () => {
    let s = applyGrade(undefined, "good", NOW);
    for (let i = 0; i < 5; i++) s = applyGrade(s, "good", NOW);
    expect(s.streak).toBeGreaterThanOrEqual(4);
    expect(s.intervalDays).toBeGreaterThanOrEqual(14);
    expect(statusOf(s)).toBe("strong");
  });
});

describe("isDue", () => {
  it("treats undefined cards as due now", () => {
    expect(isDue(undefined, NOW)).toBe(true);
  });
  it("respects nextReview timestamp", () => {
    const s = applyGrade(undefined, "good", NOW);
    expect(isDue(s, NOW + 1000)).toBe(false);
    expect(isDue(s, NOW + 86_400_000 + 1)).toBe(true);
  });
});

describe("comprehension math", () => {
  const freq = [
    { lemma: "اللَّه", count: 100 },
    { lemma: "رَبّ", count: 50 },
    { lemma: "كَتَب", count: 5 },
  ];

  it("counts only good/strong lemmas toward coverage", () => {
    const states = {
      "اللَّه": (() => {
        let s = applyGrade(undefined, "good", NOW);
        s = applyGrade(s, "good", NOW);
        return s;
      })(),
      "كَتَب": freshLemmaState(NOW), // status new
    };
    expect(tokensCovered(freq, states)).toBe(100);
    expect(comprehensionPct(freq, states, 155)).toBeCloseTo((100 / 155) * 100, 2);
  });
});

describe("effectiveGloss", () => {
  it("returns the native gloss when present", () => {
    expect(effectiveGloss({ en: "and", ms: "dan" }, "en")).toEqual({
      text: "and",
      isFallback: false,
    });
    expect(effectiveGloss({ en: "and", ms: "dan" }, "ms")).toEqual({
      text: "dan",
      isFallback: false,
    });
  });

  it("falls back to the other language and marks it", () => {
    expect(effectiveGloss({ en: "thing", ms: null }, "ms")).toEqual({
      text: "thing",
      isFallback: true,
    });
    expect(effectiveGloss({ en: null, ms: "sesuatu" }, "en")).toEqual({
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
