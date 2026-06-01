"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  loadTajweedSurah,
  parseTajweedVerse,
  type TajweedSegment,
} from "@/lib/tajweed-parser";
import {
  getTajweedRule,
  TAJWEED_RULES,
  WAQF_SIGNS,
  type TajweedRule,
  type WaqfSign,
} from "@/lib/tajweed";
import { toArabicDigits } from "@/lib/format";
import { useLearning } from "@/store/learning";

interface Props {
  surahNumber: number;
  ayahNumber: number;
  arabicFallback: string;
  fontSize: number;
}

interface ClickedSegment {
  rule: TajweedRule | null;
  waqf: WaqfSign | null;
  text: string;
  rect: DOMRect;
}

/* ── Waqf character lookup ─────────────────────────────────────────────────── */
// Map each Mushaf waqf codepoint (U+06D6–U+06DC, U+06E9) to its sign metadata.
// We must NOT match against the conventional shorthand letters (م, ج, ل, …)
// in WaqfSign.char because those are regular Arabic letters that appear all
// over the Quran in normal words — e.g. م in ٱلْحَمْدُ.
const WAQF_MAP = new Map<string, WaqfSign>(
  WAQF_SIGNS.flatMap((w) => w.mushafChars.map((c) => [c, w] as const))
);

function findWaqf(text: string): WaqfSign | null {
  for (const ch of text) {
    const sign = WAQF_MAP.get(ch);
    if (sign) return sign;
  }
  return null;
}

/* ── Main component ─────────────────────────────────────────────────────────── */

export function TajweedText({
  surahNumber,
  ayahNumber,
  arabicFallback,
  fontSize,
}: Props) {
  const [segments, setSegments] = useState<TajweedSegment[] | null>(null);
  const [clicked, setClicked] = useState<ClickedSegment | null>(null);
  const language = useLearning((s) => s.language);

  useEffect(() => {
    let active = true;
    loadTajweedSurah(surahNumber).then((data) => {
      if (!active || !data) return;
      const raw = data[String(ayahNumber)];
      if (!raw) return;
      setSegments(parseTajweedVerse(raw));
    });
    return () => {
      active = false;
    };
  }, [surahNumber, ayahNumber]);

  // Only the rules that actually occur in THIS verse — so the legend explains
  // the colours present and nothing else. Ordered by the rule table for stability.
  const presentRules = useMemo(() => {
    if (!segments) return [];
    const codes = new Set<string>();
    for (const seg of segments) {
      if (!seg.code) continue;
      const rule = getTajweedRule(seg.code);
      if (rule) codes.add(rule.code);
    }
    return Object.values(TAJWEED_RULES).filter((r) => codes.has(r.code));
  }, [segments]);

  // Fallback while loading or if no tajweed data exists for this surah
  if (!segments) {
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

  const handleSegmentClick = (
    seg: TajweedSegment,
    e: React.MouseEvent<HTMLElement>
  ) => {
    if (!seg.code) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rule = getTajweedRule(seg.code) ?? null;
    setClicked({ rule, waqf: null, text: seg.text, rect });
  };

  const handleWaqfClick = (
    waqf: WaqfSign,
    text: string,
    e: React.MouseEvent<HTMLElement>
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setClicked({ rule: null, waqf, text, rect });
  };

  return (
    <>
      <div
        className="arabic text-right text-[color:var(--foreground)] leading-loose"
        style={{ fontSize: `${fontSize}px` }}
        lang="ar"
        dir="rtl"
      >
        {segments.map((seg, idx) => {
          // Check for embedded waqf characters within plain text
          if (!seg.code) {
            const waqf = findWaqf(seg.text);
            if (waqf) {
              // Mu'anaqah (ۛ U+06DB, three small high dots) is uniquely hard
              // to spot at normal Arabic font size — bump each ۛ to 1.2em in
              // gold so the pair stands out. Other marks stay at natural size.
              const hasMuanaqah = seg.text.includes("ۛ");
              return (
                // span keeps Arabic text in one inline run so letters stay connected
                <span
                  key={idx}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleWaqfClick(waqf, seg.text, e)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleWaqfClick(waqf, seg.text, e as unknown as React.MouseEvent<HTMLElement>); }}
                  className="cursor-pointer hover:opacity-70 transition-opacity underline decoration-dotted decoration-[color:var(--gold)]"
                  title={waqf.name[language]}
                >
                  {hasMuanaqah
                    ? seg.text.split("ۛ").map((part, i, arr) => (
                        <Fragment key={i}>
                          {part.trimEnd()}
                          {i < arr.length - 1 && (
                            <span
                              className="text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]"
                              style={{ fontSize: "1.2em" }}
                              aria-hidden
                            >
                              ۛ
                            </span>
                          )}
                        </Fragment>
                      ))
                    : seg.text}
                </span>
              );
            }
            return <Fragment key={idx}>{seg.text}</Fragment>;
          }

          const rule = getTajweedRule(seg.code);
          if (!rule) {
            return <Fragment key={idx}>{seg.text}</Fragment>;
          }

          return (
            // span keeps Arabic text in one inline run so letters stay connected
            <span
              key={idx}
              role="button"
              tabIndex={0}
              onClick={(e) => handleSegmentClick(seg, e)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleSegmentClick(seg, e as unknown as React.MouseEvent<HTMLElement>); }}
              className="cursor-pointer hover:opacity-75 transition-opacity"
              style={{ color: rule.color }}
              aria-label={`${rule.name[language]}: ${seg.text}`}
              title={rule.name[language]}
            >
              {seg.text}
            </span>
          );
        })}
        <span className="arabic inline-block mr-2 text-[color:var(--gold)]" aria-hidden>
          ﴿{toArabicDigits(ayahNumber)}﴾
        </span>
      </div>

      {/* Inline legend — only the rules present in this verse */}
      <TajweedLegend language={language} rules={presentRules} />

      {clicked && (
        <TajweedPopover
          clicked={clicked}
          language={language}
          onClose={() => setClicked(null)}
        />
      )}
    </>
  );
}

/* ── Tajweed Popover ────────────────────────────────────────────────────────── */

const POP_WIDTH = 340;
const POP_H_EST = 260;
const EDGE_PAD = 12;

function TajweedPopover({
  clicked,
  language,
  onClose,
}: {
  clicked: ClickedSegment;
  language: "en" | "ms";
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { rule, waqf, text, rect } = clicked;

  // Position identical to WordPopover
  const popWidth = typeof window !== "undefined"
    ? Math.min(POP_WIDTH, window.innerWidth - EDGE_PAD * 2)
    : POP_WIDTH;
  const spaceBelow = typeof window !== "undefined"
    ? window.innerHeight - rect.bottom
    : 0;
  const placeBelow = spaceBelow >= POP_H_EST + EDGE_PAD;
  const top = placeBelow
    ? rect.bottom + 8 + (typeof window !== "undefined" ? window.scrollY : 0)
    : rect.top - 8 + (typeof window !== "undefined" ? window.scrollY : 0) - POP_H_EST;
  const desiredLeft =
    rect.left + rect.width / 2 - popWidth / 2 +
    (typeof window !== "undefined" ? window.scrollX : 0);
  const left = typeof window !== "undefined"
    ? Math.max(
        window.scrollX + EDGE_PAD,
        Math.min(desiredLeft, window.scrollX + window.innerWidth - popWidth - EDGE_PAD)
      )
    : desiredLeft;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onScroll = () => onClose();
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

  const isSajdah = text.includes("۩") || (waqf && waqf.char === "۩");

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="Tajweed rule"
      className="absolute z-50 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-xl text-left overflow-hidden"
      style={{ top, left, width: popWidth }}
    >
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3"
        style={rule ? { borderBottom: `2px solid ${rule.color}30` } : undefined}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {rule && (
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: rule.color }}
                  aria-hidden
                />
              )}
              <p className="font-bold text-sm text-[color:var(--foreground)]">
                {rule
                  ? rule.name[language]
                  : waqf
                  ? waqf.name[language]
                  : "Tajweed"}
              </p>
              {rule && (
                <span className="text-xs text-[color:var(--muted)] font-mono">
                  {rule.name.ar}
                </span>
              )}
            </div>
            {/* The clicked Arabic text */}
            <p
              className="arabic text-2xl mt-1 leading-tight"
              lang="ar"
              dir="rtl"
              style={rule ? { color: rule.color } : undefined}
            >
              {text}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[color:var(--muted)] hover:text-[color:var(--foreground)] text-lg leading-none -mt-1 shrink-0"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {rule && (
          <>
            {rule.letters && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[color:var(--muted)] font-bold mb-1">
                  {language === "ms" ? "Huruf Berkaitan" : "Letters"}
                </p>
                <p
                  className="arabic text-lg text-[color:var(--foreground)] leading-loose"
                  lang="ar"
                  dir="rtl"
                >
                  {rule.letters}
                </p>
              </div>
            )}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[color:var(--muted)] font-bold mb-1">
                {language === "ms" ? "Syarat" : "Condition"}
              </p>
              <p className="text-sm text-[color:var(--foreground)] leading-relaxed">
                {rule.condition[language]}
              </p>
            </div>
            <div className="rounded-xl bg-[color:var(--border)]/30 p-3">
              <p className="text-[10px] uppercase tracking-widest text-[color:var(--muted)] font-bold mb-1">
                {language === "ms" ? "Cara Sebut" : "How to Read"}
              </p>
              <p className="text-sm text-[color:var(--foreground)] leading-relaxed">
                {rule.howToRead[language]}
              </p>
            </div>
          </>
        )}

        {waqf && (
          <>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[color:var(--muted)] font-bold mb-1">
                {language === "ms" ? "Arahan" : "Instruction"}
              </p>
              <p className="text-sm text-[color:var(--foreground)] leading-relaxed">
                {waqf.instruction[language]}
              </p>
            </div>

            {isSajdah && (
              <div className="rounded-xl border border-[color:var(--gold)]/30 bg-[color:var(--gold)]/5 p-4 space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] font-bold">
                  {language === "ms" ? "Doa Sujud Tilawah" : "Sajdah Supplication"}
                </p>
                <p
                  className="arabic text-xl leading-loose text-[color:var(--foreground)] text-center"
                  lang="ar"
                  dir="rtl"
                >
                  سَجَدَ وَجْهِيَ لِلَّذِي خَلَقَهُ وَشَقَّ سَمْعَهُ وَبَصَرَهُ بِحَوْلِهِ وَقُوَّتِهِ
                </p>
                <p className="text-xs text-[color:var(--muted)] italic leading-relaxed text-center">
                  {language === "ms"
                    ? "Wajahku sujud kepada Yang menciptakannya dan menjadikan pendengaran dan penglihatannya dengan kekuasaan dan kekuatan-Nya."
                    : "My face prostrates to the One who created it and formed its hearing and sight by His power and strength."}
                </p>
              </div>
            )}
          </>
        )}

        <a
          href="/learn/tajweed"
          className="inline-flex items-center gap-1 text-xs text-[color:var(--accent-strong)] hover:underline"
        >
          {language === "ms" ? "Panduan Tajweed Penuh" : "Full Tajweed Guide"} →
        </a>
      </div>
    </div>,
    document.body
  );
}

/* ── Inline legend ──────────────────────────────────────────────────────────── */

/** Short legend label — drop the parenthetical aside from the full rule name
 *  (e.g. "Madd Tabee'i (Natural)" → "Madd Tabee'i") to keep the strip compact. */
function legendLabel(rule: TajweedRule, language: "en" | "ms"): string {
  return rule.name[language].replace(/\s*\(.*?\)\s*$/, "").trim();
}

function TajweedLegend({
  language,
  rules,
}: {
  language: "en" | "ms";
  rules: TajweedRule[];
}) {
  // Nothing coloured in this verse → no legend to show.
  if (rules.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px] text-[color:var(--muted)] select-none">
      {rules.map((rule) => (
        <span key={rule.code} className="flex items-center gap-1">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: rule.color }}
            aria-hidden
          />
          {legendLabel(rule, language)}
        </span>
      ))}
      <a
        href="/learn/tajweed"
        className="ml-auto text-[color:var(--accent-strong)] hover:underline"
        title={language === "ms" ? "Panduan Tajweed" : "Tajweed Guide"}
      >
        {language === "ms" ? "Panduan →" : "Guide →"}
      </a>
    </div>
  );
}
