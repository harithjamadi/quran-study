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
  initialArabic?: SurahEdition | null;
  initialTrans?: SurahEdition | null;
  initialTranslationId?: string;
}

export function SurahReaderClient({
  surahNumber,
  meta,
  translationParam,
  initialArabic,
  initialTrans,
  initialTranslationId,
}: Props) {
  const hydrated = useHydrated();
  const language = useLearning((s) => s.language);
  const persistedTranslationId = useSettings((s) => s.translationId);
  const setTranslation = useSettings((s) => s.setTranslation);

  const langDefault = language === "ms" ? "ms.basmeih" : "en.sahih";

  const [data, setData] = useState<{ arabic: SurahEdition; trans?: SurahEdition } | null>(
    initialArabic ? { arabic: initialArabic, trans: initialTrans ?? undefined } : null
  );
  // Which translation the held `data` was loaded for — lets us skip a redundant
  // client fetch when the server already prefetched the right edition.
  const loadedTranslationId = useRef<string | null>(
    initialArabic ? initialTranslationId ?? null : null
  );
  const [error, setError] = useState(false);

  // Adopt an explicit ?translation= (shared link / SSR prefetch) as the user's
  // preference once; afterwards the persisted store drives the active edition,
  // so the picker can swap translations client-side — no navigation, no remount,
  // no server round-trip (that round-trip is what used to make switching lag).
  const adoptedParam = useRef(false);

  // Active translation — derived straight from the persisted store (the single
  // source of truth), so swapping it re-runs only the client fetch below.
  const translationId = persistedTranslationId || langDefault;

  useEffect(() => {
    if (!hydrated || adoptedParam.current) return;
    adoptedParam.current = true;
    if (translationParam && translationParam !== persistedTranslationId) {
      setTranslation(translationParam);
    }
  }, [hydrated, translationParam, persistedTranslationId, setTranslation]);

  // Follow language changes when the user hasn't pinned a translation via URL.
  const lastSyncedLanguage = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated || translationParam) return;
    if (lastSyncedLanguage.current === language) return;
    lastSyncedLanguage.current = language;
    if (language === "ms" && persistedTranslationId === "en.sahih") {
      setTranslation("ms.basmeih");
    } else if (language === "en" && persistedTranslationId === "ms.basmeih") {
      setTranslation("en.sahih");
    }
  }, [hydrated, language, persistedTranslationId, translationParam, setTranslation]);

  useEffect(() => {
    // Don't fetch against the pre-hydration default — wait for the real store.
    if (!hydrated) return;
    // An unadopted URL param means the store hasn't caught up to a shared link
    // yet; skip this stale fetch and let the adopt effect set the store first.
    if (translationParam && !adoptedParam.current && translationParam !== translationId) return;
    // Server (or a previous swap) already loaded this exact translation.
    if (loadedTranslationId.current === translationId) return;

    // If we already hold the Arabic, fetch only the new translation edition so
    // the Arabic text never reloads and the verses don't blank out mid-swap.
    const haveArabic = Boolean(data?.arabic);
    const editions = haveArabic ? [translationId] : [ARABIC_EDITION, translationId];

    let active = true;
    getSurahWithEditions(surahNumber, editions)
      .then((eds) => {
        if (!active) return;
        const arabic =
          eds.find((e) => e.edition?.identifier === ARABIC_EDITION) ?? data?.arabic ?? eds[0];
        const trans = eds.find((e) => e.edition?.identifier === translationId);
        loadedTranslationId.current = translationId;
        setData({ arabic, trans });
      })
      .catch(() => {
        if (!active) return;
        // A failed swap shouldn't blank already-rendered verses; only hard-fail
        // when we have nothing to show.
        if (loadedTranslationId.current === null) setError(true);
      });
    return () => { active = false; };
  }, [hydrated, translationParam, surahNumber, translationId, data]);

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
