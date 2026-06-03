"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getSurah } from "@/data/surahs";
import { toArabicDigits } from "@/lib/format";
import { getTajweedRule } from "@/lib/tajweed";
import { loadTajweedSurah, parseTajweedVerse } from "@/lib/tajweed-parser";
import {
  ensureFontsForPage,
  pageFontFamily,
  type MushafPage,
  type MushafWord,
} from "@/lib/mushaf";

export type MushafMode = "madani" | "uthmani" | "tajweed";

interface Props {
  page: MushafPage;
  mode: MushafMode;
  onSelectVerse?: (verseKey: string) => void;
  activeVerse?: string | null;
  /** User text-size multiplier on top of the auto-fit size (default 1). */
  scale?: number;
  /** Line-height for the page lines (vertical air). Default 1.9. */
  lineSpacing?: number;
}

/* ── Tajweed colouring ─────────────────────────────────────────────────────────
 * The Madani page lays words out by the Mushaf's own tokenisation; the tajweed
 * edition is a *separate* text source. We split each tajweed ayah into per-word
 * coloured runs (its spaces are word boundaries) and only colour a Mushaf word
 * when its Uthmani text matches the tajweed word exactly — so a word is never
 * mis-coloured; where the editions differ orthographically it stays plain. */

interface ColorRun {
  text: string;
  color: string | null;
}

function splitTajweedWords(raw: string): ColorRun[][] {
  const segs = parseTajweedVerse(raw);
  const words: ColorRun[][] = [];
  let cur: ColorRun[] = [];
  const flush = () => {
    if (cur.length) {
      words.push(cur);
      cur = [];
    }
  };
  for (const seg of segs) {
    const color = seg.code ? getTajweedRule(seg.code)?.color ?? null : null;
    const parts = seg.text.split(" ");
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) flush();
      if (parts[i]) cur.push({ text: parts[i], color });
    }
  }
  flush();
  return words;
}

const runsText = (runs: ColorRun[]) => runs.map((r) => r.text).join("");

/** Load + parse tajweed colours for every ayah on the page (only when needed). */
function useTajweedColors(page: MushafPage, enabled: boolean) {
  const [map, setMap] = useState<Map<string, ColorRun[][]>>(new Map());
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const surahs = new Set<number>();
    const keys = new Set<string>();
    for (const l of page.lines) {
      if (l.t !== "ayah") continue;
      for (const w of l.w) {
        surahs.add(Number(w.k.split(":")[0]));
        keys.add(w.k);
      }
    }
    Promise.all(
      [...surahs].map((s) => loadTajweedSurah(s).then((d) => [s, d] as const))
    ).then((entries) => {
      if (!active) return;
      const data = new Map(entries);
      const next = new Map<string, ColorRun[][]>();
      for (const key of keys) {
        const [s, a] = key.split(":");
        const raw = data.get(Number(s))?.[a];
        if (raw) next.set(key, splitTajweedWords(raw));
      }
      setMap(next);
    });
    return () => {
      active = false;
    };
  }, [page, enabled]);
  return map;
}

/* ── Decorative lines shared by all editions ───────────────────────────────── */

function SurahHeader({ surah }: { surah: number }) {
  const meta = getSurah(surah);
  return (
    <div className="mushaf-surah-header" role="heading" aria-level={2}>
      <span className="mushaf-surah-frame">
        <span className="arabic">{meta ? `سورة ${meta.name}` : `سورة ${toArabicDigits(surah)}`}</span>
      </span>
    </div>
  );
}

function BasmalahLine() {
  return (
    <div className="mushaf-bism arabic" aria-label="Bismillah">
      بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
    </div>
  );
}

/* ── A single word, rendered for the active edition ────────────────────────── */

function Word({
  w,
  mode,
  colors,
  activeVerse,
  onSelectVerse,
}: {
  w: MushafWord;
  mode: MushafMode;
  colors: Map<string, ColorRun[][]>;
  activeVerse?: string | null;
  onSelectVerse?: (verseKey: string) => void;
}) {
  const isMarker = !!w.e;
  const className =
    "mushaf-word" +
    (isMarker ? " mushaf-end" : "") +
    (activeVerse === w.k ? " mushaf-word-active" : "");
  const interactive = onSelectVerse
    ? { onClick: () => onSelectVerse(w.k), role: "button" as const }
    : {};

  // Madani: the authentic QPC glyph, drawn with its per-page font.
  if (mode === "madani") {
    return (
      <span className={className} style={{ fontFamily: `'${pageFontFamily(w.fp)}'` }} {...interactive}>
        {w.c}
      </span>
    );
  }

  // Uthmani / Tajweed: the same page layout, drawn with the Uthmani text.
  if (isMarker) {
    const ayah = Number(w.k.split(":")[1]);
    return (
      <span className={className} {...interactive}>
        <span className="mushaf-ayah-num">{toArabicDigits(ayah)}</span>
      </span>
    );
  }

  const u = w.u ?? "";
  if (mode === "tajweed") {
    const cw = colors.get(w.k)?.[w.i - 1];
    if (cw && runsText(cw) === u) {
      return (
        <span className={"arabic " + className} {...interactive}>
          {cw.map((r, i) =>
            r.color ? (
              <span key={i} style={{ color: r.color }}>
                {r.text}
              </span>
            ) : (
              <Fragment key={i}>{r.text}</Fragment>
            )
          )}
        </span>
      );
    }
  }
  return (
    <span className={"arabic " + className} {...interactive}>
      {u}
    </span>
  );
}

/* ── The page: 15 lines, identical structure for every edition ─────────────── */

export function MushafPageView({
  page,
  mode,
  onSelectVerse,
  activeVerse,
  scale = 1,
  lineSpacing = 1.9,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);
  const [fitSize, setFitSize] = useState(28);
  const needsGlyphFont = mode === "madani";
  const [ready, setReady] = useState(!needsGlyphFont);
  const fontSize = fitSize * scale;
  const colors = useTajweedColors(page, mode === "tajweed");

  // Madani's glyphs live in the private-use area — lazy-load this page's font(s)
  // and reveal only once they're ready so the glyphs never flash as tofu. The
  // Uthmani/Tajweed editions use the already-loaded Amiri font, so they show at
  // once. This component is keyed by page+mode, so it remounts on either change.
  useEffect(() => {
    // Only Madani needs the lazy QPC glyph fonts; `ready` already starts true for
    // the Amiri-based editions (and resets on remount, which is keyed by mode).
    if (!needsGlyphFont) return;
    let active = true;
    ensureFontsForPage(page);
    const families = new Set<number>();
    for (const l of page.lines) if (l.t === "ayah") for (const w of l.w) families.add(w.fp);
    const loaders = [...families].map((fp) =>
      typeof document !== "undefined" && document.fonts
        ? document.fonts.load(`32px '${pageFontFamily(fp)}'`).catch(() => {})
        : Promise.resolve()
    );
    Promise.all(loaders).then(() => active && setReady(true));
    const t = setTimeout(() => active && setReady(true), 2500);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [page, needsGlyphFont]);

  // Size the page so all 15 lines fit within the viewport in BOTH dimensions.
  // The QPC glyph lines are pre-justified to the page width; we take the smaller
  // of the width-fit and height-fit so a whole page always fits the screen.
  useLayoutEffect(() => {
    if (!ready) return;
    const container = containerRef.current;
    const linesEl = linesRef.current;
    if (!container || !linesEl) return;
    const measure = () => {
      const availW = container.clientWidth;
      const availH = container.clientHeight;
      if (!availW || !availH) return;
      const base = parseFloat(getComputedStyle(linesEl).fontSize) || 28;
      let widest = 0;
      for (const r of linesEl.querySelectorAll<HTMLElement>(".mushaf-line-inner")) {
        widest = Math.max(widest, r.offsetWidth);
      }
      const totalH = linesEl.scrollHeight;
      if (!widest || !totalH) return;
      // base, widest and totalH are all at the current rendered size (fit*scale),
      // so the `scale` cancels here — this computes the scale-1 fit size.
      const widthFit = (base * availW) / widest;
      const heightFit = (base * availH) / totalH;
      const next = Math.max(13, Math.min(60, Math.min(widthFit, heightFit) * 0.97));
      setFitSize(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [ready, page, mode, lineSpacing]);

  return (
    <div ref={containerRef} className="mushaf-canvas">
      <div
        ref={linesRef}
        className={"mushaf-lines" + (mode === "madani" ? " is-glyph" : " is-text")}
        style={
          {
            fontSize,
            opacity: ready ? 1 : 0,
            // Madani needs extra line-height to prevent vertical diacritic clashes,
            // and horizontal word-spacing to separate glyphs.
            "--mushaf-lh": mode === "madani" ? Math.max(2.2, lineSpacing) : lineSpacing - 0.1,
            "--mushaf-ws": mode === "madani" ? "0.15em" : "normal",
          } as React.CSSProperties
        }
      >
        {page.lines.map((line, i) => {
          if (line.t === "surah") return <SurahHeader key={`s${i}`} surah={line.s} />;
          if (line.t === "bism") return <BasmalahLine key={`b${i}`} />;
          return (
            <div key={`l${line.n}`} className="mushaf-line">
              <span className="mushaf-line-inner" dir="rtl">
                {line.w.map((w, wi) => (
                  <Fragment key={`${w.k}-${w.i}${w.e ? "e" : ""}`}>
                    {wi > 0 ? " " : null}
                    <Word
                      w={w}
                      mode={mode}
                      colors={colors}
                      activeVerse={activeVerse}
                      onSelectVerse={onSelectVerse}
                    />
                  </Fragment>
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
