"use client";

import { Fragment, useEffect, useState } from "react";
import { loadSurahWords, type WordEntry } from "@/lib/words";
import { WordPopover } from "@/components/WordPopover";
import { toArabicDigits } from "@/lib/format";
import { posUnderlineClass, type PosTag } from "@/lib/pos-colors";
import { useLearning } from "@/store/learning";

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

/**
 * Render a word's Arabic text, but if it contains the Mu'anaqah mark
 * (ۛ U+06DB, three small high dots), bump that glyph to 1.2em in gold so
 * the triangle pattern is actually legible. The mark is encoded as a
 * superscript whose visible glyph is only ~0.4em of the font height —
 * at natural size it disappears against surrounding Arabic.
 */
function renderWordWithMuanaqah(text: string) {
  if (!text.includes("ۛ")) return text;
  const parts = text.split("ۛ");
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part.trimEnd()}
      {i < parts.length - 1 && (
        <span
          className="text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]"
          style={{ fontSize: "1.2em" }}
          aria-hidden
        >
          ۛ
        </span>
      )}
    </Fragment>
  ));
}

export function InteractiveVerse({
  surahNumber,
  ayahNumber,
  arabicFallback,
  fontSize,
}: Props) {
  const [words, setWords] = useState<WordEntry[] | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const language = useLearning((s) => s.language);

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
              className={[
                "inline rounded-md px-0.5 -mx-0.5",
                "hover:bg-[color:var(--accent-soft)] focus-visible:bg-[color:var(--accent-soft)]",
                "focus-visible:outline-none transition-colors cursor-pointer",
                posUnderlineClass(w.pos as PosTag),
              ].join(" ")}
              aria-label={
                w.gloss 
                  ? (language === "ms" ? `${w.text} — ${w.gloss}` : `${w.text} — ${w.gloss}`) 
                  : (language === "ms" ? `Kaji kata ${w.text}` : `Study word ${w.text}`)
              }
            >
              {renderWordWithMuanaqah(w.text)}
            </button>
            {idx < words.length - 1 ? " " : null}
          </Fragment>
        ))}
        <span className="arabic inline-block mr-2 text-[color:var(--gold)]" aria-hidden>
          ﴿{toArabicDigits(ayahNumber)}﴾
        </span>
      </div>

      {/* POS legend — compact, dismissible-by-nav */}
      <PosLegend language={language} />

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

/** Inline legend explaining the colour-coding. Shown once per verse area. */
function PosLegend({ language }: { language: "en" | "ms" }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px] text-[color:var(--muted)] select-none">
      <span className="flex items-center gap-1">
        <span className="inline-block w-3 h-0.5 bg-blue-400 rounded-full opacity-70" />
        {language === "ms" ? "Kata Kerja" : "Verb"}
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block w-3 h-0.5 bg-emerald-500 rounded-full opacity-70" />
        {language === "ms" ? "Kata Nama" : "Noun"}
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block w-3 h-0.5 bg-amber-400 rounded-full opacity-50" />
        {language === "ms" ? "Kata Tugas" : "Particle"}
      </span>
    </div>
  );
}
