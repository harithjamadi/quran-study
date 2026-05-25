// Pure helpers + types for the learning system. Side-effect-free so they
// can be unit-tested and shared between the client store and any future
// scheduled-review UI.

import type { Language } from "@/lib/i18n";
import { FSRS, Rating, State as FsrsState } from "ts-fsrs";
import type { Card as FsrsCard } from "ts-fsrs";

const _fsrs = new FSRS({});

export type WordStatus = "new" | "weak" | "good" | "strong";

/**
 * Per-lemma SRS state using FSRS v5 fields.
 * Replaces the old SM-2-based state (streak / successes / intervalDays / nextReview).
 * Migration from v1→v2 is handled in store/learning.ts.
 */
export interface LemmaState {
  /** Unix ms — when this card is next due. */
  due: number;
  /** FSRS stability: expected half-life of retention in days. */
  stability: number;
  /** FSRS difficulty: word-specific difficulty factor (0–10). */
  difficulty: number;
  /** FSRS card state: 0=New, 1=Learning, 2=Review, 3=Relearning. */
  state: 0 | 1 | 2 | 3;
  /** Total successful reviews (replaces `successes`). */
  reps: number;
  /** Lifetime forgotten count. */
  lapses: number;
  /** Unix ms of the most recent review. */
  lastReview: number;
  /** Scheduled interval in days that produced the current `due`. */
  scheduledDays: number;
  /** FSRS internal: tracks position within learning steps. */
  learningSteps: number;
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
 */
export function effectiveGloss(
  lemma: { en: string | null; ms: string | null },
  lang: Language
): { text: string; secondary?: string; isFallback: boolean } | null {
  if (lang === "ms") {
    if (lemma.ms && lemma.en) {
      return { text: lemma.ms, secondary: lemma.en, isFallback: false };
    }
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
    due: now,
    stability: 0,
    difficulty: 0,
    state: 0,
    reps: 0,
    lapses: 0,
    lastReview: 0,
    scheduledDays: 0,
    learningSteps: 0,
  };
}

/**
 * XP Rewards for different grades.
 * Correct on first try (Good/Easy) yields more than after a lapse.
 */
export const XP_REWARDS: Record<Grade, number> = {
  easy: 15,
  good: 10,
  again: 0,
};

// ── FSRS conversion helpers ────────────────────────────────────────────────

function toLemmaStateCard(state: LemmaState | undefined, now: number): FsrsCard {
  if (!state || state.reps === 0) {
    return {
      due: new Date(now),
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      learning_steps: 0,
      state: FsrsState.New,
    };
  }
  return {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.lastReview > 0
      ? Math.max(0, (now - state.lastReview) / DAY_MS)
      : 0,
    scheduled_days: state.scheduledDays,
    reps: state.reps,
    lapses: state.lapses,
    learning_steps: state.learningSteps ?? 0,
    state: state.state as FsrsState,
    last_review: state.lastReview > 0 ? new Date(state.lastReview) : undefined,
  };
}

function fromFsrsCard(card: FsrsCard): LemmaState {
  return {
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    state: card.state as 0 | 1 | 2 | 3,
    reps: card.reps,
    lapses: card.lapses,
    lastReview: card.last_review?.getTime() ?? Date.now(),
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps ?? 0,
  };
}

/** FSRS v5 scheduler. Replaces the old SM-2-lite `applyGrade`. */
export function applyGrade(
  prev: LemmaState | undefined,
  grade: Grade,
  now: number = Date.now()
): LemmaState {
  const card = toLemmaStateCard(prev, now);
  const rating =
    grade === "again" ? Rating.Again :
    grade === "easy"  ? Rating.Easy  :
                        Rating.Good;
  const { card: next } = _fsrs.repeat(card, new Date(now))[rating];
  return fromFsrsCard(next);
}

export function statusOf(state: LemmaState | undefined): WordStatus {
  if (!state || state.reps === 0) return "new";
  // Learning (1) and Relearning (3) → still being drilled, not stable yet
  if (state.state === FsrsState.Learning || state.state === FsrsState.Relearning) return "weak";
  // Review state — classify by FSRS stability
  if (state.stability >= 21) return "strong";
  if (state.state === FsrsState.Review) return "good";
  return "weak";
}

export function isDue(state: LemmaState | undefined, now: number = Date.now()): boolean {
  if (!state) return true;
  return state.due <= now;
}

/** Automatically determine SRS grade based on user performance in a multiple-choice quiz. */
export function autoGrade(firstTry: boolean, durationMs: number): Grade {
  if (!firstTry) return "again";
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
