"use client";

import { useEffect, useRef, useState } from "react";
import type { SurahEdition, SurahMeta } from "@/lib/types";
import { getSurahWithEditions } from "@/lib/api";
import { ARABIC_EDITION } from "@/lib/editions";
import { SurahReader } from "@/components/SurahReader";
import { SurahPager } from "@/components/SurahPager";
import { useSettings } from "@/store/settings";
import { useLearning } from "@/store/learning";
import { useHydrated } from "@/lib/use-hydrated";

interface Props {
  surahNumber: number;
  meta: SurahMeta;
  translationParam?: string;
}

export function SurahReaderClient({ surahNumber, meta, translationParam }: Props) {
  const hydrated = useHydrated();
  const language = useLearning((s) => s.language);
  const persistedTranslationId = useSettings((s) => s.translationId);
  const setTranslation = useSettings((s) => s.setTranslation);
  const [data, setData] = useState<{ arabic: SurahEdition; trans?: SurahEdition } | null>(null);
  const [error, setError] = useState(false);

  const lastSyncedLanguage = useRef<string | null>(null);
  useEffect(() => {
    // Only sync once per language value — prevents overwriting a manual translation choice.
    if (!hydrated || translationParam) return;
    if (lastSyncedLanguage.current === language) return;
    lastSyncedLanguage.current = language;
    if (language === "ms" && persistedTranslationId === "en.sahih") {
      setTranslation("ms.basmeih");
    } else if (language === "en" && persistedTranslationId === "ms.basmeih") {
      setTranslation("en.sahih");
    }
  }, [hydrated, language, persistedTranslationId, translationParam, setTranslation]);

  const translationId = translationParam || persistedTranslationId || (language === "ms" ? "ms.basmeih" : "en.sahih");

  useEffect(() => {
    let active = true;
    getSurahWithEditions(surahNumber, [ARABIC_EDITION, translationId])
      .then((editions) => {
        if (!active) return;
        const arabic = editions.find((e) => e.edition?.identifier === ARABIC_EDITION) ?? editions[0];
        const trans = editions.find((e) => e.edition?.identifier === translationId);
        setData({ arabic, trans });
      })
      .catch(() => {
        if (!active) return;
        setError(true);
      });
    return () => { active = false; };
  }, [surahNumber, translationId]);

  if (!hydrated || !data) {
    if (error) {
      return (
        <div className="card p-8 text-center">
          <h1 className="text-xl font-semibold mb-2">Couldn’t load this surah</h1>
          <p className="text-sm text-[color:var(--muted)]">
            The Quran API is unreachable. Check your connection and try again.
          </p>
        </div>
      );
    }
    return (
      <div className="py-24 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--accent)] border-r-transparent" />
      </div>
    );
  }

  return (
    <SurahReader
      meta={meta}
      arabic={data.arabic}
      translation={data.trans}
      translationId={translationId}
    >
      <SurahPager current={surahNumber} translationId={translationId} />
    </SurahReader>
  );
}
