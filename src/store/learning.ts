"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  applyGrade,
  freshLemmaState,
  isConsecutiveDay,
  localDateKey,
  statusOf,
  XP_REWARDS,
  type Grade,
  type LemmaState,
  type WordStatus,
} from "@/lib/learning";
import { computeRootBoosts } from "@/lib/root-progression";
import { renamedLocalStorage } from "@/lib/persist-migrate";
import { loadRootIndex } from "@/lib/words";
import { useSettings } from "./settings";

export type Language = "en" | "ms";

/** Pair of lemma + the specific Arabic surface form the user encountered. */
export interface SeenForm {
  lemma: string;
  text: string;
}

/** Per-rule mastery accumulated across all Tajweed quests. */
export interface TajweedRuleMastery {
  attempts: number;
  correct: number;
}

interface LearningState {
  lemmas: Record<string, LemmaState>;
  language: Language;
  hasChosenLanguage: boolean;
  hasSeenTutorial: boolean;
  introducedThroughRank: number;
  xp: number;
  lastSessionDate: string | null;
  dayStreak: number;
  reviewedToday: number;
  /** Daily quest target — number of reviews that completes the day's quest. */
  dailyGoal: number;
  /**
   * Stars earned per surah number. Value is 0–3:
   *   1 = Easy completed, 2 = Medium completed, 3 = Hard completed.
   */
  surahStars: Record<number, number>;

  /**
   * Tajweed-track stars per surah, mirroring `surahStars` but tracking
   * progress on the parallel Tajweed Quest track.
   */
  tajweedStars: Record<number, number>;

  /**
   * Lifetime mastery counters per Tajweed rule code (e.g. "q" → Qalqalah).
   * Drives the "you struggle with Ikhfa" feedback in the dashboard later.
   */
  ruleMastery: Record<string, TajweedRuleMastery>;

  /**
   * Surface forms (with diacritics) the user has been exposed to during learning.
   * Keyed by the raw Arabic text. Used for pokedex-style "ENCOUNTERED" badges in
   * the Combinations tab — distinct from `lemmas` which tracks lemma-level SRS.
   */
  seenForms: Record<string, true>;

  // actions
  grade: (lemma: string, gradeValue: Grade, root?: string | null, surfaceText?: string) => void;
  addXp: (amount: number) => void;
  introduce: (lemma: string, surfaceText?: string) => void;
  introduceMany: (items: SeenForm[]) => void;
  advanceIntroducedTo: (rank: number) => void;
  setDailyGoal: (n: number) => void;
  setLanguage: (l: Language) => void;
  setHasChosenLanguage: (v: boolean) => void;
  setHasSeenTutorial: (v: boolean) => void;
  resetProgress: () => void;
  statusOf: (lemma: string) => WordStatus;
  recordSurahStar: (surahNumber: number, level: 1 | 2 | 3) => void;
  recordTajweedStar: (surahNumber: number, level: 1 | 2 | 3) => void;
  recordTajweedAnswer: (ruleCode: string, correct: boolean) => void;
  markFormSeen: (surfaceText: string) => void;
}

const DEFAULTS = {
  lemmas: {} as Record<string, LemmaState>,
  language: "en" as Language,
  hasChosenLanguage: false,
  hasSeenTutorial: false,
  introducedThroughRank: 0,
  xp: 0,
  lastSessionDate: null as string | null,
  dayStreak: 0,
  reviewedToday: 0,
  dailyGoal: 10,
  surahStars: {} as Record<number, number>,
  tajweedStars: {} as Record<number, number>,
  ruleMastery: {} as Record<string, TajweedRuleMastery>,
  seenForms: {} as Record<string, true>,
};

function bumpStreak(state: LearningState, xpEarned = 0): Partial<LearningState> {
  const today = localDateKey();
  const xp = state.xp + xpEarned;

  if (state.lastSessionDate === today) {
    return { reviewedToday: state.reviewedToday + 1, xp };
  }
  const streak = isConsecutiveDay(state.lastSessionDate ?? "", today)
    ? state.dayStreak + 1
    : 1;
  return { lastSessionDate: today, dayStreak: streak, reviewedToday: 1, xp };
}

export const useLearning = create<LearningState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      grade: (lemma, gradeValue, root, surfaceText) => {
        const cur = get();
        const next = applyGrade(cur.lemmas[lemma], gradeValue);
        const reward = XP_REWARDS[gradeValue] || 0;
        const seenForms = surfaceText && !cur.seenForms[surfaceText]
          ? { ...cur.seenForms, [surfaceText]: true as const }
          : cur.seenForms;
        set({ lemmas: { ...cur.lemmas, [lemma]: next }, seenForms, ...bumpStreak(cur, reward) });

        // Root-based progression: fire-and-forget boost to root siblings.
        if (root && gradeValue !== "again") {
          loadRootIndex().then((rootIdx) => {
            if (!rootIdx) return;
            const rootEntry = rootIdx[root];
            const boosts = computeRootBoosts(lemma, gradeValue, get().lemmas, rootEntry);
            if (Object.keys(boosts).length === 0) return;
            const updated = { ...get().lemmas };
            for (const [sib, patch] of Object.entries(boosts)) {
              if (updated[sib]) updated[sib] = { ...updated[sib], ...patch };
            }
            set({ lemmas: updated });
          });
        }
      },
      addXp: (amount) => set((s) => ({ xp: s.xp + amount })),
      setDailyGoal: (n) => set({ dailyGoal: Math.min(50, Math.max(5, Math.round(n))) }),
      introduce: (lemma, surfaceText) => {
        const cur = get();
        const lemmaPatch = cur.lemmas[lemma]
          ? cur.lemmas
          : { ...cur.lemmas, [lemma]: freshLemmaState() };
        const seenForms = surfaceText && !cur.seenForms[surfaceText]
          ? { ...cur.seenForms, [surfaceText]: true as const }
          : cur.seenForms;
        if (lemmaPatch === cur.lemmas && seenForms === cur.seenForms) return;
        set({ lemmas: lemmaPatch, seenForms });
      },
      introduceMany: (items) => {
        const cur = get();
        const nextLemmas = { ...cur.lemmas };
        const nextSeen = { ...cur.seenForms };
        let changed = false;
        for (const { lemma, text } of items) {
          if (!nextLemmas[lemma]) { nextLemmas[lemma] = freshLemmaState(); changed = true; }
          if (text && !nextSeen[text]) { nextSeen[text] = true; changed = true; }
        }
        if (changed) set({ lemmas: nextLemmas, seenForms: nextSeen });
      },
      markFormSeen: (surfaceText) => {
        const cur = get();
        if (!surfaceText || cur.seenForms[surfaceText]) return;
        set({ seenForms: { ...cur.seenForms, [surfaceText]: true } });
      },
      advanceIntroducedTo: (rank) => {
        const cur = get();
        if (rank > cur.introducedThroughRank) set({ introducedThroughRank: rank });
      },
      setLanguage: (language) => {
        set({ language });
        // Sync default translation
        const settings = useSettings.getState();
        if (language === "ms") {
          settings.setTranslation("ms.basmeih");
        } else {
          settings.setTranslation("en.sahih");
        }
      },
      setHasChosenLanguage: (v) => set({ hasChosenLanguage: v }),
      setHasSeenTutorial: (v) => set({ hasSeenTutorial: v }),
      resetProgress: () => {
        const cur = get();
        set({ ...DEFAULTS, hasChosenLanguage: cur.hasChosenLanguage, language: cur.language });
      },
      statusOf: (lemma) => statusOf(get().lemmas[lemma]),
      recordSurahStar: (surahNumber, level) => {
        const cur = get();
        const existing = cur.surahStars[surahNumber] ?? 0;
        if (level <= existing) return;
        set({ surahStars: { ...cur.surahStars, [surahNumber]: level } });
      },
      recordTajweedStar: (surahNumber, level) => {
        const cur = get();
        const existing = cur.tajweedStars[surahNumber] ?? 0;
        if (level <= existing) return;
        set({ tajweedStars: { ...cur.tajweedStars, [surahNumber]: level } });
      },
      recordTajweedAnswer: (ruleCode, correct) => {
        if (!ruleCode) return;
        const cur = get();
        const prev = cur.ruleMastery[ruleCode] ?? { attempts: 0, correct: 0 };
        set({
          ruleMastery: {
            ...cur.ruleMastery,
            [ruleCode]: {
              attempts: prev.attempts + 1,
              correct: prev.correct + (correct ? 1 : 0),
            },
          },
        });
      },
    }),
    {
      name: "mubin.learning.v2",
      version: 4,
      migrate: (persisted: unknown, fromVersion: number) => {
        const state = persisted as Record<string, unknown>;

        // v0 → v1: perfectSurahs[] → surahStars map
        const surahStars = (state.surahStars as Record<number, number> | undefined) ?? {};
        if (fromVersion === 0) {
          const perfectSurahs = (state.perfectSurahs as number[] | undefined) ?? [];
          for (const n of perfectSurahs) surahStars[n] = 1;
        }

        // v3 → v4: introduce Tajweed-track maps. Default to empty.
        const tajweedStars = (state.tajweedStars as Record<number, number> | undefined) ?? {};
        const ruleMastery =
          (state.ruleMastery as Record<string, TajweedRuleMastery> | undefined) ?? {};

        // v1 → v2: SM-2 LemmaState → FSRS LemmaState
        const rawLemmas = (state.lemmas as Record<string, Record<string, unknown>>) ?? {};
        const migratedLemmas: Record<string, LemmaState> = {};
        const now = Date.now();

        for (const [key, old] of Object.entries(rawLemmas)) {
          if ("stability" in old) {
            // Already v2 format
            migratedLemmas[key] = old as unknown as LemmaState;
          } else {
            // Convert SM-2 fields → FSRS approximation
            const streak = (old.streak as number) ?? 0;
            const successes = (old.successes as number) ?? 0;
            const lapses = (old.lapses as number) ?? 0;
            const intervalDays = (old.intervalDays as number) ?? 0;
            const nextReview = (old.nextReview as number) ?? now;
            const lastReview = (old.lastReview as number) ?? 0;

            // Map SM-2 state to FSRS state
            const fsrsState: 0 | 1 | 2 | 3 =
              successes === 0 ? 0 :        // New
              streak === 0 ? 3 :            // Relearning (had lapses)
              intervalDays >= 1 ? 2 : 1;   // Review vs Learning

            migratedLemmas[key] = {
              due: nextReview,
              stability: Math.max(1, intervalDays),
              difficulty: 5,
              state: fsrsState,
              reps: successes,
              lapses,
              lastReview,
              scheduledDays: intervalDays,
              learningSteps: 0,
            };
          }
        }

        // Any user migrating from a prior version already chose a language implicitly.
        return {
          ...state,
          surahStars,
          tajweedStars,
          ruleMastery,
          lemmas: migratedLemmas,
          hasChosenLanguage: true,
        };
      },
      storage: createJSONStorage(() => renamedLocalStorage("noor.learning.v2")),
    }
  )
);
