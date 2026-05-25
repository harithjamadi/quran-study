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

export type Language = "en" | "ms";

interface LearningState {
  /** Per-lemma SRS state. Keyed by the Arabic lemma string. */
  lemmas: Record<string, LemmaState>;
  /** UI language preference for the learning flow + verse context. */
  language: Language;
  /** Highest position in the frequency list the user has been introduced to. */
  introducedThroughRank: number;
  /** Total experience points. */
  xp: number;
  /** Local-date string of the user's most recent learning activity. */
  lastSessionDate: string | null;
  /** Consecutive-day streak. */
  dayStreak: number;
  /** Cards reviewed today (resets at midnight local). */
  reviewedToday: number;
  /** Surah numbers the user has completed with a perfect score in Surah Quest. */
  perfectSurahs: number[];

  // actions
  grade: (lemma: string, grade: Grade) => void;
  addXp: (amount: number) => void;
  introduce: (lemma: string) => void;
  introduceMany: (lemmas: string[]) => void;
  advanceIntroducedTo: (rank: number) => void;
  setLanguage: (l: Language) => void;
  resetProgress: () => void;
  statusOf: (lemma: string) => WordStatus;
  recordSurahPerfect: (surahNumber: number) => void;
}

const DEFAULTS = {
  lemmas: {} as Record<string, LemmaState>,
  language: "en" as Language,
  introducedThroughRank: 0,
  xp: 0,
  lastSessionDate: null as string | null,
  dayStreak: 0,
  reviewedToday: 0,
  perfectSurahs: [] as number[],
};

function bumpStreak(state: LearningState, xpEarned = 0): Partial<LearningState> {
  const today = localDateKey();
  const xp = state.xp + xpEarned;

  if (state.lastSessionDate === today) {
    return { 
      reviewedToday: state.reviewedToday + 1,
      xp 
    };
  }
  const streak = isConsecutiveDay(state.lastSessionDate ?? "", today)
    ? state.dayStreak + 1
    : 1;
  return {
    lastSessionDate: today,
    dayStreak: streak,
    reviewedToday: 1,
    xp
  };
}

export const useLearning = create<LearningState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      grade: (lemma, grade) => {
        const cur = get();
        const next = applyGrade(cur.lemmas[lemma], grade);
        const reward = XP_REWARDS[grade] || 0;

        set({
          lemmas: { ...cur.lemmas, [lemma]: next },
          ...bumpStreak(cur, reward),
        });
      },
      addXp: (amount) => set((s) => ({ xp: s.xp + amount })),
      introduce: (lemma) => {
        const cur = get();
        if (cur.lemmas[lemma]) return;
        set({ lemmas: { ...cur.lemmas, [lemma]: freshLemmaState() } });
      },
      introduceMany: (lemmas) => {
        const cur = get();
        const nextLemmas = { ...cur.lemmas };
        let changed = false;
        for (const l of lemmas) {
          if (!nextLemmas[l]) {
            nextLemmas[l] = freshLemmaState();
            changed = true;
          }
        }
        if (changed) set({ lemmas: nextLemmas });
      },
      advanceIntroducedTo: (rank) => {
        const cur = get();
        if (rank > cur.introducedThroughRank) set({ introducedThroughRank: rank });
      },
      setLanguage: (language) => set({ language }),
      resetProgress: () => set(DEFAULTS),
      statusOf: (lemma) => statusOf(get().lemmas[lemma]),
      recordSurahPerfect: (surahNumber) => {
        const cur = get();
        if (cur.perfectSurahs.includes(surahNumber)) return;
        set({ perfectSurahs: [...cur.perfectSurahs, surahNumber] });
      },
    }),
    {
      name: "noor.learning.v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
