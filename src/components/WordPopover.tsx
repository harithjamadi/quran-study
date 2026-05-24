"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useLearning } from "@/store/learning";
import { UI_STRINGS } from "@/lib/i18n";
import type { WordEntry } from "@/lib/words";
import { loadRootIndex } from "@/lib/words";
import { getSurah } from "@/data/surahs";

interface Props {
  word: WordEntry;
  surahNumber: number;
  ayahNumber: number;
  anchorRect: DOMRect;
  onClose: () => void;
}

const POP_WIDTH = 320;
const POP_H_EST = 240;
const EDGE_PAD = 12;

export function WordPopover({
  word,
  surahNumber,
  ayahNumber,
  anchorRect,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState<number | null>(null);
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];

  const layout = useMemo(() => {
    if (typeof window === "undefined") {
      return { top: 0, left: 0, popWidth: POP_WIDTH };
    }
    const popWidth = Math.min(POP_WIDTH, window.innerWidth - EDGE_PAD * 2);
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const placeBelow = spaceBelow >= POP_H_EST + EDGE_PAD;
    const top = placeBelow
      ? anchorRect.bottom + 8 + window.scrollY
      : anchorRect.top - 8 + window.scrollY - POP_H_EST;
    const desiredLeft =
      anchorRect.left + anchorRect.width / 2 - popWidth / 2 + window.scrollX;
    const left = Math.max(
      window.scrollX + EDGE_PAD,
      Math.min(desiredLeft, window.scrollX + window.innerWidth - popWidth - EDGE_PAD)
    );
    return { top, left, popWidth };
  }, [anchorRect]);

  useEffect(() => {
    if (!word.root) return;
    let active = true;
    loadRootIndex().then((idx) => {
      if (!active) return;
      if (idx && word.root && idx[word.root]) setCount(idx[word.root].count);
    });
    return () => {
      active = false;
    };
  }, [word.root]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onScroll() {
      onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const surah = getSurah(surahNumber);
  const surahName = surah ? surah.englishName : `Surah ${surahNumber}`;

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={`${t.set_word_study}: ${word.text}`}
      className="absolute z-50 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-xl p-4 text-left"
      style={{ top: layout.top, left: layout.left, width: layout.popWidth }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <p
          className="arabic text-2xl leading-tight"
          lang="ar"
          dir="rtl"
          style={{ direction: "rtl" }}
        >
          {word.text}
        </p>
        <button
          onClick={onClose}
          className="text-[color:var(--muted)] hover:text-[color:var(--foreground)] text-lg leading-none -mt-1"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {word.translit && (
        <p className="text-xs text-[color:var(--muted)] italic mb-1">{word.translit}</p>
      )}
      {word.gloss && (
        <p className="text-[15px] font-medium text-[color:var(--foreground)] mb-3">
          {word.gloss}
        </p>
      )}

      <dl className="text-xs space-y-1.5">
        {word.root ? (
          <>
            <Row label={t.word_root}>
              <span className="arabic text-lg" lang="ar" dir="rtl">
                {word.root}
              </span>
            </Row>
            {word.lemma && (
              <Row label={t.word_lemma}>
                <span className="arabic" lang="ar" dir="rtl">
                  {word.lemma}
                </span>
              </Row>
            )}
            {count !== null && (
              <Row label={t.flash_mastery}>
                {count}× {t.flash_in_quran}
              </Row>
            )}
            <Link
              href={`/root/${encodeURIComponent(word.root)}`}
              onClick={onClose}
              className="mt-3 inline-flex items-center gap-1 text-sm text-[color:var(--accent-strong)] hover:underline font-medium"
            >
              {t.word_all_occurrences} →
            </Link>
          </>
        ) : (
          <p className="text-[color:var(--muted)] italic">
            {word.lemma
              ? `Particle / pronoun (lemma: ${word.lemma}).`
              : "Particle / pronoun."}
          </p>
        )}
        <div className="pt-2 mt-3 border-t border-[color:var(--border)] text-[color:var(--muted)] font-medium">
          {surahName} · {ayahNumber} · {word.i}
        </div>
      </dl>
    </div>,
    document.body
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[color:var(--muted)] font-medium">{label}</dt>
      <dd className="text-[color:var(--foreground)]">{children}</dd>
    </div>
  );
}
