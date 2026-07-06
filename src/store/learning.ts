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

export type Language = "en" | "ms";

// ── Badge system ─────────────────────────────────────────────────────────────

export type BadgeId =
  | "first_star"
  | "madd_master"
  | "qalqalah_king"
  | "foundation_graduate"
  | "perfect_reciter"
  | "rule_explorer"
  | "centurion"
  | "streak_7"
  | "streak_30";

export interface BadgeInfo {
  id: BadgeId;
  name: { en: string; ms: string };
  description: { en: string; ms: string };
  /** How to earn this badge (shown when locked). */
  hint: { en: string; ms: string };
  icon: string;
}

export const BADGES: BadgeInfo[] = [
  {
    id: "first_star",
    name: { en: "First Steps", ms: "Langkah Pertama" },
    description: { en: "Earned the first Tajweed quest star", ms: "Dapat bintang Cabaran Tajwid pertama" },
    hint: { en: "Complete any Tajweed quest with ≥ 80% accuracy", ms: "Lengkapkan mana-mana Cabaran Tajwid dengan ketepatan ≥ 80%" },
    icon: "⭐",
  },
  {
    id: "madd_master",
    name: { en: "Madd Master", ms: "Pakar Mad" },
    description: { en: "Correctly identified 50 prolongation rules", ms: "Kenal pasti 50 hukum mad dengan tepat" },
    hint: { en: "Answer 50 Madd questions correctly across all quests", ms: "Jawab 50 soalan Mad dengan betul dalam semua cabaran" },
    icon: "🎵",
  },
  {
    id: "qalqalah_king",
    name: { en: "Qalqalah King", ms: "Raja Qalqalah" },
    description: { en: "Aced a Hard difficulty Tajweed quest with a perfect score", ms: "Markah sempurna pada Cabaran Tajwid tahap Susah" },
    hint: { en: "Score 100% on a Hard (★★★) Tajweed quest", ms: "Markah 100% pada Cabaran Tajwid tahap Susah (★★★)" },
    icon: "👑",
  },
  {
    id: "foundation_graduate",
    name: { en: "Foundation Graduate", ms: "Graduan Asas" },
    description: { en: "Completed the entire Noorani Foundations track", ms: "Lengkapkan seluruh laluan Asas Noorani" },
    hint: { en: "Finish all lessons in the Foundations track", ms: "Habiskan semua pelajaran dalam laluan Asas" },
    icon: "🎓",
  },
  {
    id: "perfect_reciter",
    name: { en: "Perfect Reciter", ms: "Pembaca Sempurna" },
    description: { en: "Scored 100% on a Tajweed quest", ms: "Markah 100% pada Cabaran Tajwid" },
    hint: { en: "Answer every question correctly in any quest", ms: "Jawab semua soalan dengan betul dalam mana-mana cabaran" },
    icon: "✨",
  },
  {
    id: "rule_explorer",
    name: { en: "Rule Explorer", ms: "Penjelajah Hukum" },
    description: { en: "Got correct answers on 5 or more different Tajweed rule types", ms: "Dapat jawapan betul pada 5 jenis hukum tajwid yang berbeza" },
    hint: { en: "Get at least one correct answer for 5 different rules", ms: "Dapat sekurang-kurangnya satu jawapan betul untuk 5 hukum berbeza" },
    icon: "🧭",
  },
  {
    id: "centurion",
    name: { en: "Centurion", ms: "Centurion" },
    description: { en: "Answered 100 Tajweed practice questions", ms: "Jawab 100 soalan latihan tajwid" },
    hint: { en: "Answer 100 total Tajweed questions across all quests", ms: "Jawab 100 soalan tajwid kesemuanya dalam semua cabaran" },
    icon: "💯",
  },
  {
    id: "streak_7",
    name: { en: "Week Warrior", ms: "Pejuang Mingguan" },
    description: { en: "Maintained a 7-day learning streak", ms: "Kekalkan streak pembelajaran 7 hari" },
    hint: { en: "Come back to learn every day for 7 days straight", ms: "Kembali belajar setiap hari selama 7 hari berturut-turut" },
    icon: "🔥",
  },
  {
    id: "streak_30",
    name: { en: "Monthly Champion", ms: "Juara Bulanan" },
    description: { en: "Maintained a 30-day learning streak", ms: "Kekalkan streak pembelajaran 30 hari" },
    hint: { en: "Come back to learn every day for 30 days straight", ms: "Kembali belajar setiap hari selama 30 hari berturut-turut" },
    icon: "🏆",
  },
];

// ── Badge-checking helpers (pure functions, no side effects) ─────────────────

function applyStreakBadges(
  existing: Record<string, number>,
  streak: number
): Record<string, number> {
  const now = Date.now();
  const out = { ...existing };
  if (!out["streak_7"] && streak >= 7) out["streak_7"] = now;
  if (!out["streak_30"] && streak >= 30) out["streak_30"] = now;
  return out;
}

function applyAnswerBadges(
  existing: Record<string, number>,
  mastery: Record<string, TajweedRuleMastery>,
  totalAnswers: number
): Record<string, number> {
  const now = Date.now();
  const out = { ...existing };
  const MADD = ["n", "p", "o", "m"] as const;
  const maddCorrect = MADD.reduce((s, c) => s + (mastery[c]?.correct ?? 0), 0);
  if (!out["madd_master"] && maddCorrect >= 50) out["madd_master"] = now;
  if (!out["centurion"] && totalAnswers >= 100) out["centurion"] = now;
  const uniqueCorrect = Object.values(mastery).filter((v) => v.correct > 0).length;
  if (!out["rule_explorer"] && uniqueCorrect >= 5) out["rule_explorer"] = now;
  return out;
}

function applyStarBadges(
  existing: Record<string, number>,
  level: 1 | 2 | 3,
  isPerfect: boolean
): Record<string, number> {
  const now = Date.now();
  const out = { ...existing };
  if (!out["first_star"]) out["first_star"] = now;
  if (!out["perfect_reciter"] && isPerfect) out["perfect_reciter"] = now;
  if (!out["qalqalah_king"] && level === 3 && isPerfect) out["qalqalah_king"] = now;
  return out;
}

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

  /**
   * Earned badges. Key = BadgeId, value = Unix timestamp (ms) when earned.
   * A missing key means the badge is not yet earned.
   */
  badges: Record<string, number>;

  /**
   * Fraction of the Foundations track completed (0 – 1).
   * Set by the FoundationsTrack component on lesson completion.
   */
  foundationsProgress: number;

  /**
   * Total Tajweed practice questions answered across all quests.
   * Used to check the Centurion badge (100 answers).
   */
  totalTajweedAnswers: number;

  /** Personal best score on the 60-Second Blitz, keyed by surah number. */
  blitzBests: Record<number, number>;

  /** Longest rule chain on the Rule Streak game. */
  streakBest: number;

  /** Dates (YYYY-MM-DD) where the Daily Ayah Challenge was completed. */
  dailyAyahDone: Record<string, true>;

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
  recordTajweedStar: (surahNumber: number, level: 1 | 2 | 3, isPerfect?: boolean) => void;
  recordTajweedAnswer: (ruleCode: string, correct: boolean) => void;
  recordTajweedSession: (xpEarned: number) => void;
  markFormSeen: (surfaceText: string) => void;
  unlockBadge: (id: string) => void;
  setFoundationsProgress: (progress: number) => void;
  setBlitzBest: (surahNumber: number, score: number) => void;
  setStreakBest: (chain: number) => void;
  markDailyAyahDone: (date: string) => void;
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
  badges: {} as Record<string, number>,
  foundationsProgress: 0,
  totalTajweedAnswers: 0,
  blitzBests: {} as Record<number, number>,
  streakBest: 0,
  dailyAyahDone: {} as Record<string, true>,
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
        const streakPatch = bumpStreak(cur, reward);
        const newStreak = streakPatch.dayStreak ?? cur.dayStreak;
        const badges = applyStreakBadges(cur.badges ?? {}, newStreak);
        set({ lemmas: { ...cur.lemmas, [lemma]: next }, seenForms, ...streakPatch, badges });

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
      recordTajweedStar: (surahNumber, level, isPerfect = false) => {
        const cur = get();
        const existing = cur.tajweedStars[surahNumber] ?? 0;
        const badges = applyStarBadges(cur.badges ?? {}, level, isPerfect);
        if (level > existing) {
          set({ tajweedStars: { ...cur.tajweedStars, [surahNumber]: level }, badges });
        } else {
          set({ badges });
        }
      },
      recordTajweedAnswer: (ruleCode, correct) => {
        if (!ruleCode) return;
        const cur = get();
        const prev = cur.ruleMastery[ruleCode] ?? { attempts: 0, correct: 0 };
        const newMastery = {
          ...cur.ruleMastery,
          [ruleCode]: {
            attempts: prev.attempts + 1,
            correct: prev.correct + (correct ? 1 : 0),
          },
        };
        const newTotal = (cur.totalTajweedAnswers ?? 0) + 1;
        const badges = applyAnswerBadges(cur.badges ?? {}, newMastery, newTotal);
        set({ ruleMastery: newMastery, totalTajweedAnswers: newTotal, badges });
      },
      recordTajweedSession: (xpEarned) => {
        const cur = get();
        const streakPatch = bumpStreak(cur, xpEarned);
        const newStreak = streakPatch.dayStreak ?? cur.dayStreak;
        const badges = applyStreakBadges(cur.badges ?? {}, newStreak);
        set({ ...streakPatch, badges });
      },
      unlockBadge: (id) => {
        const cur = get();
        if (cur.badges?.[id]) return;
        set({ badges: { ...(cur.badges ?? {}), [id]: Date.now() } });
      },
      setFoundationsProgress: (progress) => {
        const cur = get();
        const clamped = Math.min(1, Math.max(0, progress));
        const badges = clamped >= 1 && !(cur.badges ?? {})["foundation_graduate"]
          ? { ...(cur.badges ?? {}), foundation_graduate: Date.now() }
          : (cur.badges ?? {});
        set({ foundationsProgress: clamped, badges });
      },
      setBlitzBest: (surahNumber, score) => {
        const cur = get();
        const prev = cur.blitzBests?.[surahNumber] ?? 0;
        if (score > prev) {
          set({ blitzBests: { ...(cur.blitzBests ?? {}), [surahNumber]: score } });
        }
      },
      setStreakBest: (chain) => {
        const cur = get();
        if (chain > (cur.streakBest ?? 0)) set({ streakBest: chain });
      },
      markDailyAyahDone: (date) => {
        const cur = get();
        if (cur.dailyAyahDone?.[date]) return;
        set({ dailyAyahDone: { ...(cur.dailyAyahDone ?? {}), [date]: true } });
      },
    }),
    {
      name: "mubin.learning.v2",
      version: 4,
      migrate: (persisted: unknown, fromVersion: number) => {
        // Loosely-typed view of whatever old shape is in localStorage — the
        // fields below are the only ones the migrations touch.
        interface LegacyLemma {
          stability?: number;
          streak?: number;
          successes?: number;
          intervalDays?: number;
          nextReview?: number;
          lastReview?: number;
          lapses?: number;
        }
        const state = persisted as Record<string, unknown> & {
          surahStars?: Record<number, number>;
          perfectSurahs?: number[];
          lemmas?: Record<string, LegacyLemma>;
        };

        // v0 → v1: perfectSurahs[] → surahStars map
        const surahStars = state.surahStars ?? {};
        if (fromVersion === 0) {
          const perfectSurahs = state.perfectSurahs ?? [];
          for (const n of perfectSurahs) surahStars[n] = 1;
        }

        // v1 → v2: SM-2 LemmaState → FSRS LemmaState
        const rawLemmas = state.lemmas ?? {};
        const migratedLemmas: Record<string, LemmaState> = {};
        const now = Date.now();

        for (const [key, old] of Object.entries(rawLemmas)) {
          if (old.stability) {
            // Already FSRS-shaped — keep as-is.
            migratedLemmas[key] = old as unknown as LemmaState;
          } else {
            const streak = old.streak ?? 0;
            const successes = old.successes ?? 0;
            const intervalDays = old.intervalDays ?? 0;
            const nextReview = old.nextReview ?? now;
            const lastReview = old.lastReview ?? 0;

            const fsrsState: 0 | 1 | 2 | 3 =
              successes === 0 ? 0 : streak === 0 ? 3 : intervalDays >= 1 ? 2 : 1;

            migratedLemmas[key] = {
              due: nextReview,
              stability: Math.max(1, intervalDays),
              difficulty: 5,
              state: fsrsState,
              reps: successes,
              lapses: old.lapses ?? 0,
              lastReview,
              scheduledDays: intervalDays,
              learningSteps: 0,
            };
          }
        }

        return {
          ...state,
          surahStars,
          lemmas: migratedLemmas,
        };
      },
      storage: createJSONStorage(() => renamedLocalStorage("noor.learning.v2")),
    }
  )
);
