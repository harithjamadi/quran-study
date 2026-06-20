"use client";

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getSurah } from "@/data/surahs";
import { toArabicDigits } from "@/lib/format";
import { getTajweedRule } from "@/lib/tajweed";
import { loadTajweedSurah, parseTajweedVerse } from "@/lib/tajweed-parser";
import {
  buildPageRows,
  ensureFontsForPage,
  pageFontFamily,
  type MushafPage,
  type MushafRow,
  type MushafWord,
} from "@/lib/mushaf";

export type MushafMode = "madani" | "uthmani" | "tajweed";

/** Page proportion (width ÷ height) of the printed Madani mushaf — the paper
 *  rectangle every page is laid into so the reader feels like a real book. */
const PAGE_ASPECT = 0.66;

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

/* ── Decorative rows shared by all editions ────────────────────────────────── */

function SurahHeader({ surah, withBasmalah }: { surah: number; withBasmalah: boolean }) {
  const meta = getSurah(surah);
  return (
    <div className="mushaf-surah-header" role="heading" aria-level={2}>
      <span className="mushaf-surah-frame">
        <span className="arabic">
          {meta ? `سورة ${meta.name}` : `سورة ${toArabicDigits(surah)}`}
        </span>
      </span>
      {withBasmalah && (
        <span className="mushaf-surah-bism arabic" aria-label="Bismillah">
          بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
        </span>
      )}
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

/* ── A justified ayah line ─────────────────────────────────────────────────── */

function AyahLine({
  words,
  fill,
  rowIndex,
  mode,
  colors,
  activeVerse,
  onSelectVerse,
}: {
  words: MushafWord[];
  fill: boolean;
  rowIndex: number;
  mode: MushafMode;
  colors: Map<string, ColorRun[][]>;
  activeVerse?: string | null;
  onSelectVerse?: (verseKey: string) => void;
}) {
  return (
    <div className={"mushaf-row-line" + (fill ? " is-fill" : "")} dir="rtl" data-ri={rowIndex}>
      {words.map((w) => (
        <Word
          key={`${w.k}-${w.i}${w.e ? "e" : ""}`}
          w={w}
          mode={mode}
          colors={colors}
          activeVerse={activeVerse}
          onSelectVerse={onSelectVerse}
        />
      ))}
    </div>
  );
}

/* ── The page: a fixed-aspect sheet of 15 evenly-spread rows ────────────────── */

export function MushafPageView({
  page,
  mode,
  onSelectVerse,
  activeVerse,
  scale = 1,
  lineSpacing = 1.9,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const { rows, centeredPage } = useMemo(() => buildPageRows(page), [page]);

  const [box, setBox] = useState({ w: 0, h: 0 });
  const [fitSize, setFitSize] = useState(0);
  const [sized, setSized] = useState(false);
  // Which ayah rows are full enough to justify edge-to-edge. Short lines stay
  // centred so they never show stretched gaps.
  const [fillSet, setFillSet] = useState<Set<number>>(new Set());

  const needsGlyphFont = mode === "madani";
  const [ready, setReady] = useState(!needsGlyphFont);
  const colors = useTajweedColors(page, mode === "tajweed");

  const fontSize = fitSize * scale;
  const visible = ready && sized && fitSize > 0;

  // Madani's glyphs live in the private-use area — lazy-load this page's font(s)
  // and reveal only once they're ready so the glyphs never flash as tofu. The
  // Uthmani/Tajweed editions use the already-loaded Amiri font, so they show at
  // once. This component is keyed by page+mode, so it remounts on either change.
  useEffect(() => {
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

  // ── Size the paper sheet so the whole page is contained in the viewport ──
  // The sheet keeps the printed page's proportion; because that rectangle is the
  // same on every page, the font size and line positions are steady when you
  // swipe — no more per-page size jumps.
  useLayoutEffect(() => {
    const measureBox = () => {
      const c = containerRef.current;
      if (!c) return;
      const W = c.clientWidth;
      const H = c.clientHeight;
      if (!W || !H) return;
      let w = W;
      let h = W / PAGE_ASPECT;
      if (h > H) {
        h = H;
        w = H * PAGE_ASPECT;
      }
      setBox((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measureBox();
    const ro = new ResizeObserver(measureBox);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Fit the font so the densest line fills the column width ──
  // Measured with the line shrunk to its natural width (`.is-measuring`), then
  // every line is justified edge-to-edge with `space-between` (see CSS). The fit
  // is clamped to a tight band of the page width so it barely varies page-to-page.
  useLayoutEffect(() => {
    if (!ready || !box.w) return;
    const grid = gridRef.current;
    if (!grid) return;

    const fit = () => {
      const availW = grid.clientWidth;
      if (!availW) return;
      const base = parseFloat(getComputedStyle(grid).fontSize) || 24;

      grid.classList.add("is-measuring");
      const nats: { ri: number; nat: number }[] = [];
      let maxNat = 0;
      for (const el of grid.querySelectorAll<HTMLElement>(".mushaf-row-ayah .mushaf-row-line")) {
        const nat = el.offsetWidth;
        nats.push({ ri: Number(el.dataset.ri), nat });
        if (nat > maxNat) maxNat = nat;
      }
      grid.classList.remove("is-measuring");
      if (!maxNat) return;

      // base & maxNat are at the same rendered size, so `scale` cancels — this is
      // the scale-1 fit. 0.985 leaves a hair of breathing room at the margins.
      const fit1 = (base * availW * 0.985) / maxNat / scale;
      const lo = box.w * 0.034;
      const hi = box.w * 0.058;
      setFitSize(Math.max(lo, Math.min(hi, fit1)));

      // A line justifies only if it's naturally close to the widest line on the
      // page (≥83%); shorter lines stay centred. Opening pages (1–2) stay centred.
      const next = new Set<number>();
      if (!centeredPage) {
        for (const m of nats) if (m.nat >= maxNat * 0.83) next.add(m.ri);
      }
      setFillSet((prev) => (sameSet(prev, next) ? prev : next));
      setSized(true);
    };

    fit();
    // Re-fit if the page fonts settle after first paint.
    if (typeof document !== "undefined" && document.fonts?.ready) {
      let active = true;
      document.fonts.ready.then(() => active && fit());
      return () => {
        active = false;
      };
    }
  }, [ready, box.w, page, mode, lineSpacing, scale, centeredPage]);

  return (
    <div ref={containerRef} className="mushaf-canvas">
      <div
        ref={pageRef}
        className="mushaf-page"
        style={box.w ? { width: box.w, height: box.h } : undefined}
      >
        <div
          ref={gridRef}
          className={
            "mushaf-grid" +
            (centeredPage ? " is-centered-page" : "") +
            (mode === "madani" ? " is-glyph" : " is-text")
          }
          style={
            {
              fontSize: fontSize || box.w * 0.046 || 24,
              opacity: visible ? 1 : 0,
              gridTemplateRows: centeredPage ? undefined : `repeat(${rows.length}, 1fr)`,
              "--mushaf-lh": mode === "madani" ? Math.max(1.35, lineSpacing - 0.45) : lineSpacing - 0.55,
            } as React.CSSProperties
          }
        >
          {rows.map((row, i) => (
            <Row
              key={rowKey(row, i)}
              row={row}
              index={i}
              fill={fillSet.has(i)}
              mode={mode}
              colors={colors}
              activeVerse={activeVerse}
              onSelectVerse={onSelectVerse}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function rowKey(row: MushafRow, i: number): string {
  switch (row.kind) {
    case "surah":
      return `s${row.surah}-${i}`;
    case "basmalah":
      return `b${i}`;
    case "ayah":
      return `a${row.line}-${i}`;
    default:
      return `x${i}`;
  }
}

function Row({
  row,
  index,
  fill,
  mode,
  colors,
  activeVerse,
  onSelectVerse,
}: {
  row: MushafRow;
  index: number;
  fill: boolean;
  mode: MushafMode;
  colors: Map<string, ColorRun[][]>;
  activeVerse?: string | null;
  onSelectVerse?: (verseKey: string) => void;
}) {
  if (row.kind === "blank") return <div className="mushaf-row mushaf-row-blank" aria-hidden />;
  if (row.kind === "surah")
    return (
      <div className="mushaf-row mushaf-row-surah">
        <SurahHeader surah={row.surah} withBasmalah={row.withBasmalah} />
      </div>
    );
  if (row.kind === "basmalah")
    return (
      <div className="mushaf-row mushaf-row-bism">
        <BasmalahLine />
      </div>
    );
  return (
    <div className="mushaf-row mushaf-row-ayah">
      <AyahLine
        words={row.words}
        fill={fill}
        rowIndex={index}
        mode={mode}
        colors={colors}
        activeVerse={activeVerse}
        onSelectVerse={onSelectVerse}
      />
    </div>
  );
}

/** Shallow set equality — avoids re-rendering when the fill decision is unchanged. */
function sameSet(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}
