"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import type { SurahEdition, SurahMeta } from "@/lib/types";
import { VerseRow } from "@/components/VerseRow";
import { SurahPager } from "@/components/SurahPager";
import { TranslationPicker } from "@/components/TranslationPicker";
import { useAudio } from "@/components/AudioProvider";
import { useBookmarks } from "@/store/bookmarks";
import { useSettings } from "@/store/settings";
import { toArabicDigits } from "@/lib/format";

interface Props {
  meta: SurahMeta;
  arabic: SurahEdition;
  translation?: SurahEdition;
  translationId: string;
  children?: React.ReactNode;
}

export function SurahReader({ meta, arabic, translation, translationId, children }: Props) {
  const { setQueue, current, playAyah } = useAudio();
  const setLastRead = useBookmarks((s) => s.setLastRead);
  const wordStudyMode = useSettings((s) => s.wordStudyMode);

  const queue = useMemo(
    () =>
      arabic.ayahs.map((a) => ({
        surahNumber: meta.number,
        ayahNumber: a.numberInSurah,
        globalAyahNumber: a.number,
        surahName: meta.englishName,
      })),
    [arabic.ayahs, meta]
  );

  const lastScrolledAyah = useRef<number | null>(null);

  // Handle initial deep link scroll
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.startsWith("#v")) {
      const ayahNum = parseInt(hash.substring(2), 10);
      if (!isNaN(ayahNum)) {
        // Wait for a frame to ensure render is complete
        requestAnimationFrame(() => {
          const el = document.getElementById(`v${ayahNum}`);
          if (el) {
            el.scrollIntoView({ behavior: "auto", block: "center" });
            lastScrolledAyah.current = ayahNum;
          }
        });
      }
    }
  }, [arabic.ayahs.length]); // Re-run if ayahs change

  useEffect(() => {
    setQueue(queue);
  }, [queue, setQueue]);

  useEffect(() => {
    setLastRead({
      surahNumber: meta.number,
      ayahNumber: 1,
      surahName: meta.englishName,
      timestamp: Date.now(),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.number]);

  // Centralize view on the playing ayah and sync URL
  useEffect(() => {
    if (!current || current.surahNumber !== meta.number) return;
    
    // Update URL hash without jumping
    if (typeof window !== "undefined") {
      const hash = `#v${current.ayahNumber}`;
      if (window.location.hash !== hash) {
        window.history.replaceState(null, "", hash);
      }
    }

    // Scroll into view if it's a new ayah
    if (lastScrolledAyah.current !== current.ayahNumber) {
      const el = document.getElementById(`v${current.ayahNumber}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        lastScrolledAyah.current = current.ayahNumber;
      }
    }
  }, [current, meta.number]);

  const startPlayback = () => {
    if (!queue[0]) return;
    playAyah(queue[0]);
  };

  // Surah 9 (At-Tawba) traditionally has no opening Basmala.
  const showBasmala = meta.number !== 1 && meta.number !== 9;

  return (
    <div className="space-y-6">
      <section className="card p-6 sm:p-8 text-center relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--accent-soft)_0%,transparent_60%)] pointer-events-none"
        />
        <div className="relative">
          <p className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
            Surah {meta.number}
          </p>
          <h1 className="text-3xl font-semibold mt-2">{meta.englishName}</h1>
          <p className="arabic text-2xl mt-1 text-[color:var(--accent-strong)]">{meta.name}</p>
          <p className="text-sm text-[color:var(--muted)] mt-2">
            {meta.englishNameTranslation} · {meta.revelationType} ·{" "}
            {toArabicDigits(meta.numberOfAyahs)} verses
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={startPlayback}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] text-white px-5 py-2 text-sm hover:bg-[color:var(--accent-strong)]"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
                <path d="M8 5l12 7-12 7z" />
              </svg>
              Play surah
            </button>
            <TranslationPicker current={translationId} surahNumber={meta.number} />
          </div>
        </div>
      </section>

      {/* Top jump-to-surah — mirrors the one rendered at the foot of the page. */}
      <SurahPager current={meta.number} translationId={translationId} />

      {showBasmala && (
        <p className="bismillah ornament">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</p>
      )}

      {wordStudyMode && (
        <p className="text-center text-xs text-[color:var(--muted)]">
          Tap any Arabic word to see its meaning, root, and other appearances.
        </p>
      )}

      <div className="space-y-3">
        {arabic.ayahs.map((a, i) => (
          <VerseRow
            key={a.number}
            surahNumber={meta.number}
            surahName={meta.englishName}
            arabic={a}
            translation={translation?.ayahs[i]}
            translationLang={translation?.edition?.language}
          />
        ))}
      </div>

      {current && (
        <div className="sr-only" aria-live="polite">
          Now playing verse {current.ayahNumber} of {current.surahName}
        </div>
      )}

      <nav className="flex items-center justify-between pt-6">
        <PrevNext surahNumber={meta.number} dir="prev" translationId={translationId} />
        <Link href="/surahs" className="text-sm text-[color:var(--muted)] hover:underline">
          All surahs
        </Link>
        <PrevNext surahNumber={meta.number} dir="next" translationId={translationId} />
      </nav>

      {children}
    </div>
  );
}

function PrevNext({
  surahNumber,
  dir,
  translationId,
}: {
  surahNumber: number;
  dir: "prev" | "next";
  translationId: string;
}) {
  const target = dir === "prev" ? surahNumber - 1 : surahNumber + 1;
  if (target < 1 || target > 114) return <span aria-hidden className="w-24" />;
  const qs = translationId !== "en.sahih" ? `?translation=${encodeURIComponent(translationId)}` : "";
  return (
    <Link
      href={`/surah/${target}${qs}`}
      className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm hover:bg-[color:var(--accent-soft)]/40"
      prefetch={false}
    >
      {dir === "prev" ? `← Surah ${target}` : `Surah ${target} →`}
    </Link>
  );
}
