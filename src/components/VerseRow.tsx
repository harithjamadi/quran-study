"use client";

import { useAudio } from "@/components/AudioProvider";
import { InteractiveVerse } from "@/components/InteractiveVerse";
import { TajweedText } from "@/components/TajweedText";
import { useBookmarks } from "@/store/bookmarks";
import { useSettings } from "@/store/settings";
import { useLearning } from "@/store/learning";
import { UI_STRINGS } from "@/lib/i18n";
import type { Ayah } from "@/lib/types";
import { classNames, toArabicDigits } from "@/lib/format";

interface VerseRowProps {
  surahNumber: number;
  surahName: string;
  arabic: Ayah;
  translation?: Ayah;
  transliteration?: Ayah;
  translationLang?: string;
}

export function VerseRow({ surahNumber, surahName, arabic, translation, transliteration, translationLang }: VerseRowProps) {
  const audio = useAudio();
  const arabicFontSize = useSettings((s) => s.arabicFontSize);
  const translationFontSize = useSettings((s) => s.translationFontSize);
  const showTransliteration = useSettings((s) => s.showTransliteration);
  const highlight = useSettings((s) => s.highlightCurrentVerse);
  const wordStudyMode = useSettings((s) => s.wordStudyMode);
  const tajweedMode = useSettings((s) => s.tajweedMode);
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];

  const isCurrent =
    audio.current?.surahNumber === surahNumber &&
    audio.current?.ayahNumber === arabic.numberInSurah;

  const setLastRead = useBookmarks((s) => s.setLastRead);
  const isBookmarked = useBookmarks((s) =>
    s.has(surahNumber, arabic.numberInSurah)
  );
  const toggleBookmark = useBookmarks((s) => s.toggle);

  const onPlay = () => {
    audio.playAyah({
      surahNumber,
      ayahNumber: arabic.numberInSurah,
      globalAyahNumber: arabic.number,
      surahName,
    });
  };

  const onInteraction = () => {
    setLastRead({
      surahNumber,
      ayahNumber: arabic.numberInSurah,
      surahName,
      timestamp: Date.now(),
    });
  };

  const onCopy = async () => {
    const text = `${arabic.text}\n\n${translation?.text ?? ""}\n— ${surahName} ${surahNumber}:${arabic.numberInSurah}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore — clipboard not available
    }
  };

  const onShare = async () => {
    const data = {
      title: `${surahName} ${surahNumber}:${arabic.numberInSurah}`,
      text: translation?.text ?? arabic.text,
      url: typeof window !== "undefined" ? `${window.location.origin}/surah/${surahNumber}#v${arabic.numberInSurah}` : undefined,
    };
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(data);
      } catch {
        // user cancelled
      }
    } else {
      await onCopy();
    }
  };

  return (
    <article
      id={`v${arabic.numberInSurah}`}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("button, a")) onInteraction();
      }}
      className={classNames(
        "group rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 sm:p-6 transition-colors scroll-mt-24",
        isCurrent && highlight && "verse-highlight border-[color:var(--accent)]/60"
      )}
    >
      <header className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div
            className="relative h-9 w-9 grid place-items-center text-[color:var(--accent-strong)] font-medium text-sm"
            aria-label={`Verse ${arabic.numberInSurah}`}
          >
            <svg viewBox="0 0 36 36" className="absolute inset-0 text-[color:var(--gold)]" aria-hidden>
              <polygon
                points="18,2 22,10 31,10 26,17 31,24 22,24 18,32 14,24 5,24 10,17 5,10 14,10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              />
            </svg>
            <span className="relative">{arabic.numberInSurah}</span>
          </div>
          <div className="text-xs text-[color:var(--muted)]">
            Juz {arabic.juz} · {t.verse_page} {arabic.page}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onPlay}
            className="h-8 w-8 rounded-full hover:bg-[color:var(--accent-soft)] inline-flex items-center justify-center text-[color:var(--accent-strong)]"
            aria-label={t.verse_play}
            title={t.verse_play}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
              <path d="M8 5l12 7-12 7z" />
            </svg>
          </button>
          <button
            onClick={() =>
              toggleBookmark({
                surahNumber,
                ayahNumber: arabic.numberInSurah,
                surahName,
                ayahText: arabic.text,
                translation: translation?.text,
              })
            }
            className={classNames(
              "h-8 w-8 rounded-full hover:bg-[color:var(--accent-soft)] inline-flex items-center justify-center",
              isBookmarked ? "text-[color:var(--gold)]" : "text-[color:var(--muted)]"
            )}
            aria-label={isBookmarked ? t.verse_bookmark_rem : t.verse_bookmark_add}
            aria-pressed={isBookmarked}
            title={isBookmarked ? t.verse_bookmark_rem : t.verse_bookmark_add}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 3h12v18l-6-4-6 4z" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={onShare}
            className="h-8 w-8 rounded-full hover:bg-[color:var(--accent-soft)] inline-flex items-center justify-center text-[color:var(--muted)]"
            aria-label={t.verse_share}
            title={t.verse_share}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="6" cy="12" r="2.5" />
              <circle cx="18" cy="6" r="2.5" />
              <circle cx="18" cy="18" r="2.5" />
              <path d="M8 11l8-4M8 13l8 4" />
            </svg>
          </button>
        </div>
      </header>

      {tajweedMode ? (
        <TajweedText
          surahNumber={surahNumber}
          ayahNumber={arabic.numberInSurah}
          arabicFallback={arabic.text}
          fontSize={arabicFontSize}
        />
      ) : wordStudyMode ? (
        <InteractiveVerse
          surahNumber={surahNumber}
          ayahNumber={arabic.numberInSurah}
          arabicFallback={arabic.text}
          fontSize={arabicFontSize}
        />
      ) : (
        <p
          className="arabic text-right text-[color:var(--foreground)]"
          style={{ fontSize: `${arabicFontSize}px` }}
          lang="ar"
        >
          {arabic.text}
          <span className="arabic inline-block ml-2 text-[color:var(--gold)]" aria-hidden>
            ﴿{toArabicDigits(arabic.numberInSurah)}﴾
          </span>
        </p>
      )}

      {showTransliteration && transliteration?.text && (
        <p
          className="mt-3 italic text-[color:var(--muted)]"
          style={{ fontSize: `${translationFontSize}px` }}
        >
          {transliteration.text}
        </p>
      )}

      {translation?.text && (
        <p
          className="mt-3 leading-relaxed text-[color:var(--foreground)]/90"
          style={{ fontSize: `${translationFontSize}px` }}
          lang={translationLang ?? language}
        >
          {translation.text}
        </p>
      )}
    </article>
  );
}
