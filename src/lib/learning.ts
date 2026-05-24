// Pure helpers + types for the learning system. Side-effect-free so they
// can be unit-tested and shared between the client store and any future
// scheduled-review UI.

import type { Language } from "@/lib/i18n";

export type WordStatus = "new" | "weak" | "good" | "strong";

export interface LemmaState {
  /** Successful active-recall answers in a row. Resets on lapse. */
  streak: number;
  /** Lifetime correct answers. */
  successes: number;
  /** Lifetime incorrect answers. */
  lapses: number;
  /** Unix ms when this card is next due. 0 = due now. */
  nextReview: number;
  /** Unix ms of the most recent review. */
  lastReview: number;
  /** Current interval in days that produced nextReview. */
  intervalDays: number;
}

export interface LemmaMeta {
  lemma: string;
  root: string | null;
  pos: string | null;
  count: number;
  en: string | null;
  ms: string | null;
  translit: string | null;
  sampleSurah: number;
  sampleAyah: number;
  sampleWord: number;
  sampleText: string;
}

export interface CoverageMilestone {
  topN: number;
  tokensCovered: number;
  pct: number;
}

export interface CoverageData {
  totalTokens: number;
  lemmaCount: number;
  milestones: CoverageMilestone[];
}

export type Grade = "again" | "good" | "easy";

const DAY_MS = 86_400_000;

/**
 * Pick the gloss to display for a lemma in the user's chosen learning language.
 * Falls back to the other language with a `[lang]` marker when the chosen
 * language has no translation. Returns null only when both glosses are absent.
 *
 * The Malay dictionary only covers the ~80 highest-frequency lemmas today, so
 * MS learners would see "—" for most cards without this fallback.
 */
export function effectiveGloss(
  lemma: { en: string | null; ms: string | null },
  lang: Language
): { text: string; isFallback: boolean } | null {
  if (lang === "ms") {
    if (lemma.ms) return { text: lemma.ms, isFallback: false };
    if (lemma.en) return { text: lemma.en, isFallback: true };
    return null;
  }
  if (lemma.en) return { text: lemma.en, isFallback: false };
  if (lemma.ms) return { text: lemma.ms, isFallback: true };
  return null;
}

/** Initial state for a card that has never been reviewed. */
export function freshLemmaState(now: number = Date.now()): LemmaState {
  return {
    streak: 0,
    successes: 0,
    lapses: 0,
    nextReview: now,
    lastReview: 0,
    intervalDays: 0,
  };
}

/** SM-2-lite scheduler. Simpler than full SM-2 — fixed multipliers, no ease factor. */
export function applyGrade(
  prev: LemmaState | undefined,
  grade: Grade,
  now: number = Date.now()
): LemmaState {
  const state: LemmaState = prev ? { ...prev } : freshLemmaState(now);
  state.lastReview = now;

  if (grade === "again") {
    state.lapses += 1;
    state.streak = 0;
    state.intervalDays = 0;
    // Review again in 10 minutes.
    state.nextReview = now + 10 * 60 * 1000;
    return state;
  }

  state.successes += 1;
  state.streak += 1;

  if (grade === "easy") {
    // Big jump on easy.
    const base = Math.max(state.intervalDays, 1);
    state.intervalDays = Math.min(Math.round(base * 4), 180);
  } else {
    // grade === "good" — Anki-style fixed steps then geometric growth.
    if (state.intervalDays === 0) state.intervalDays = 1;
    else if (state.intervalDays === 1) state.intervalDays = 3;
    else if (state.intervalDays === 3) state.intervalDays = 7;
    else state.intervalDays = Math.min(Math.round(state.intervalDays * 2.2), 180);
  }
  state.nextReview = now + state.intervalDays * DAY_MS;
  return state;
}

export function statusOf(state: LemmaState | undefined): WordStatus {
  if (!state || state.successes === 0) return "new";
  if (state.lapses >= state.successes) return "weak";
  if (state.streak >= 4 && state.intervalDays >= 14) return "strong";
  if (state.streak >= 2) return "good";
  return "weak";
}

export function isDue(state: LemmaState | undefined, now: number = Date.now()): boolean {
  if (!state) return true;
  return state.nextReview <= now;
}

/** Automatically determine SRS grade based on user performance in a multiple-choice quiz. */
export function autoGrade(firstTry: boolean, durationMs: number): Grade {
  if (!firstTry) return "again";
  // If answered correctly in less than 2.5 seconds, treat as "easy"
  if (durationMs < 2500) return "easy";
  return "good";
}

export function statusColor(status: WordStatus): string {
  switch (status) {
    case "strong": return "bg-green-500";
    case "good": return "bg-blue-500";
    case "weak": return "bg-orange-500";
    default: return "bg-gray-300 dark:bg-gray-700";
  }
}

/** Counts how many tokens of the Quran the user covers, given their mastered lemmas. */
export function tokensCovered(
  lemmaFreq: Array<{ lemma: string; count: number }>,
  states: Record<string, LemmaState>
): number {
  let total = 0;
  for (const entry of lemmaFreq) {
    const s = states[entry.lemma];
    const status = statusOf(s);
    if (status === "good" || status === "strong") total += entry.count;
  }
  return total;
}

export function comprehensionPct(
  lemmaFreq: Array<{ lemma: string; count: number }>,
  states: Record<string, LemmaState>,
  totalTokens: number
): number {
  if (totalTokens === 0) return 0;
  return (tokensCovered(lemmaFreq, states) / totalTokens) * 100;
}

/** YYYY-MM-DD in the user's local timezone, used to detect streak rollover. */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** True if `today` is the calendar day immediately after `prev` (handles month/year boundaries). */
export function isConsecutiveDay(prev: string, today: string): boolean {
  if (!prev || prev === today) return false;
  const a = new Date(prev + "T12:00:00");
  const b = new Date(today + "T12:00:00");
  const diff = Math.round((b.getTime() - a.getTime()) / DAY_MS);
  return diff === 1;
}
