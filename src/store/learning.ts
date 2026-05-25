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
  lemmas: Record<string, LemmaState>;
  language: Language;
  introducedThroughRank: number;
  xp: number;
  lastSessionDate: string | null;
  dayStreak: number;
  reviewedToday: number;
  /**
   * Stars earned per surah number. Value is 0–3:
   *   1 = Easy completed, 2 = Medium completed, 3 = Hard completed.
   * Each difficulty also implies all lower difficulties completed.
   */
  surahStars: Record<number, number>;

  // actions
  grade: (lemma: string, grade: Grade) => void;
  addXp: (amount: number) => void;
  introduce: (lemma: string) => void;
  introduceMany: (lemmas: string[]) => void;
  advanceIntroducedTo: (rank: number) => void;
  setLanguage: (l: Language) => void;
  resetProgress: () => void;
  statusOf: (lemma: string) => WordStatus;
  recordSurahStar: (surahNumber: number, level: 1 | 2 | 3) => void;
}

const DEFAULTS = {
  lemmas: {} as Record<string, LemmaState>,
  language: "en" as Language,
  introducedThroughRank: 0,
  xp: 0,
  lastSessionDate: null as string | null,
  dayStreak: 0,
  reviewedToday: 0,
  surahStars: {} as Record<number, number>,
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
      grade: (lemma, grade) => {
        const cur = get();
        const next = applyGrade(cur.lemmas[lemma], grade);
        const reward = XP_REWARDS[grade] || 0;
        set({ lemmas: { ...cur.lemmas, [lemma]: next }, ...bumpStreak(cur, reward) });
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
          if (!nextLemmas[l]) { nextLemmas[l] = freshLemmaState(); changed = true; }
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
      recordSurahStar: (surahNumber, level) => {
        const cur = get();
        const existing = cur.surahStars[surahNumber] ?? 0;
        if (level <= existing) return;
        set({ surahStars: { ...cur.surahStars, [surahNumber]: level } });
      },
    }),
    {
      name: "noor.learning.v1",
      version: 1,
      // Migrate users who had the old perfectSurahs array (v0) to the new surahStars map (v1).
      migrate: (persisted: unknown) => {
        const state = persisted as Record<string, unknown>;
        const perfectSurahs = (state.perfectSurahs as number[] | undefined) ?? [];
        const surahStars: Record<number, number> = {};
        for (const n of perfectSurahs) surahStars[n] = 1;
        return { ...state, surahStars };
      },
      storage: createJSONStorage(() => localStorage),
    }
  )
);
