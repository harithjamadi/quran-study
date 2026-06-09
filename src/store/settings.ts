"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { renamedLocalStorage } from "@/lib/persist-migrate";
import type { ArabicScript, ThemeMode } from "@/lib/types";

/** Which Mushaf the reader renders. Persisted so the app reopens the user's
 *  preferred edition. Matches the render modes in MushafPageView. */
export type MushafEdition = "madani" | "uthmani" | "tajweed";

interface SettingsState {
  translationId: string;
  reciterId: string;
  showTransliteration: boolean;
  arabicFontSize: number;
  translationFontSize: number;
  arabicScript: ArabicScript;
  theme: ThemeMode;
  autoplayNext: boolean;
  highlightCurrentVerse: boolean;
  wordStudyMode: boolean;
  tajweedMode: boolean;
  /** Automatically fade colors for Tajweed rules the user has mastered (>= 80%) */
  visualScaffolding: boolean;
  /** Mushaf reader text-size multiplier applied on top of the auto-fit size. */
  mushafScale: number;
  /** Line-height for the Mushaf page (vertical air between lines). */
  mushafLineSpacing: number;
  /** The Mushaf edition the reader opens with. */
  mushafEdition: MushafEdition;
  setTranslation: (id: string) => void;
  setReciter: (id: string) => void;
  setShowTransliteration: (v: boolean) => void;
  setArabicFontSize: (n: number) => void;
  setTranslationFontSize: (n: number) => void;
  setArabicScript: (s: ArabicScript) => void;
  setTheme: (m: ThemeMode) => void;
  setAutoplayNext: (v: boolean) => void;
  setHighlightCurrentVerse: (v: boolean) => void;
  setWordStudyMode: (v: boolean) => void;
  setTajweedMode: (v: boolean) => void;
  setVisualScaffolding: (v: boolean) => void;
  setMushafScale: (n: number) => void;
  setMushafLineSpacing: (n: number) => void;
  setMushafEdition: (e: MushafEdition) => void;
  reset: () => void;
}

const DEFAULTS = {
  translationId: "en.sahih",
  reciterId: "ar.alafasy",
  showTransliteration: false,
  arabicFontSize: 32,
  translationFontSize: 16,
  arabicScript: "uthmani" as ArabicScript,
  theme: "system" as ThemeMode,
  autoplayNext: true,
  highlightCurrentVerse: true,
  wordStudyMode: true,
  tajweedMode: false,
  visualScaffolding: false,
  mushafScale: 1,
  mushafLineSpacing: 1.9,
  mushafEdition: "madani" as MushafEdition,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setTranslation: (translationId) => set({ translationId }),
      setReciter: (reciterId) => set({ reciterId }),
      setShowTransliteration: (showTransliteration) => set({ showTransliteration }),
      setArabicFontSize: (arabicFontSize) =>
        set({ arabicFontSize: Math.min(64, Math.max(18, arabicFontSize)) }),
      setTranslationFontSize: (translationFontSize) =>
        set({ translationFontSize: Math.min(28, Math.max(12, translationFontSize)) }),
      setArabicScript: (arabicScript) => set({ arabicScript }),
      setTheme: (theme) => set({ theme }),
      setAutoplayNext: (autoplayNext) => set({ autoplayNext }),
      setHighlightCurrentVerse: (highlightCurrentVerse) => set({ highlightCurrentVerse }),
      setWordStudyMode: (wordStudyMode) => set({ wordStudyMode }),
      setTajweedMode: (tajweedMode) => set({ tajweedMode }),
      setVisualScaffolding: (visualScaffolding) => set({ visualScaffolding }),
      setMushafScale: (mushafScale) =>
        set({ mushafScale: Math.min(1.8, Math.max(0.8, mushafScale)) }),
      setMushafLineSpacing: (mushafLineSpacing) =>
        set({ mushafLineSpacing: Math.min(2.6, Math.max(1.5, mushafLineSpacing)) }),
      setMushafEdition: (mushafEdition) => set({ mushafEdition }),
      reset: () => set(DEFAULTS),
    }),
    {
      name: "mubin.settings.v1",
      storage: createJSONStorage(() => renamedLocalStorage("noor.settings.v1")),
    }
  )
);
