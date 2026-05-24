"use client";

import { Fragment, useEffect, useState } from "react";
import { loadSurahWords, type WordEntry } from "@/lib/words";
import { WordPopover } from "@/components/WordPopover";
import { toArabicDigits } from "@/lib/format";

interface Props {
  surahNumber: number;
  ayahNumber: number;
  /** Plain Arabic text from the API — rendered as fallback while word data loads. */
  arabicFallback: string;
  fontSize: number;
}

interface Selection {
  word: WordEntry;
  rect: DOMRect;
}

export function InteractiveVerse({
  surahNumber,
  ayahNumber,
  arabicFallback,
  fontSize,
}: Props) {
  const [words, setWords] = useState<WordEntry[] | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  useEffect(() => {
    let active = true;
    loadSurahWords(surahNumber).then((data) => {
      if (!active) return;
      const list = data?.[String(ayahNumber)] ?? null;
      setWords(list);
    });
    return () => {
      active = false;
    };
  }, [surahNumber, ayahNumber]);

  if (!words) {
    return (
      <p
        className="arabic text-right text-[color:var(--foreground)]"
        style={{ fontSize: `${fontSize}px` }}
        lang="ar"
      >
        {arabicFallback}
        <span className="arabic inline-block ml-2 text-[color:var(--gold)]" aria-hidden>
          ﴿{toArabicDigits(ayahNumber)}﴾
        </span>
      </p>
    );
  }

  return (
    <>
      <div
        className="arabic text-right text-[color:var(--foreground)]"
        style={{ fontSize: `${fontSize}px` }}
        lang="ar"
        dir="rtl"
      >
        {words.map((w, idx) => (
          <Fragment key={idx}>
            <button
              type="button"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setSelection({ word: w, rect });
              }}
              className="inline rounded-md px-0.5 -mx-0.5 hover:bg-[color:var(--accent-soft)] focus-visible:bg-[color:var(--accent-soft)] focus-visible:outline-none transition-colors cursor-pointer"
              aria-label={
                w.gloss ? `${w.text} — ${w.gloss}` : `Study word ${w.text}`
              }
            >
              {w.text}
            </button>
            {idx < words.length - 1 ? " " : null}
          </Fragment>
        ))}
        <span className="arabic inline-block mr-2 text-[color:var(--gold)]" aria-hidden>
          ﴿{toArabicDigits(ayahNumber)}﴾
        </span>
      </div>
      {selection && (
        <WordPopover
          word={selection.word}
          surahNumber={surahNumber}
          ayahNumber={ayahNumber}
          anchorRect={selection.rect}
          onClose={() => setSelection(null)}
        />
      )}
    </>
  );
}
