"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getSurah } from "@/data/surahs";
import { toArabicDigits } from "@/lib/format";
import { TajweedText } from "@/components/TajweedText";
import {
  ensureFontsForPage,
  pageFontFamily,
  type MushafLine,
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
}

/** A verse's words collected from the (possibly multi-line) page layout. */
interface PageVerse {
  key: string;
  surah: number;
  ayah: number;
  words: MushafWord[];
}

function collectVerses(lines: MushafLine[]): PageVerse[] {
  const order: string[] = [];
  const map = new Map<string, PageVerse>();
  for (const line of lines) {
    if (line.t !== "ayah") continue;
    for (const w of line.w) {
      let v = map.get(w.k);
      if (!v) {
        const [s, a] = w.k.split(":").map(Number);
        v = { key: w.k, surah: s, ayah: a, words: [] };
        map.set(w.k, v);
        order.push(w.k);
      }
      v.words.push(w);
    }
  }
  return order.map((k) => map.get(k)!);
}

/* ── Decorative lines shared by all modes ─────────────────────────────────── */

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

/* ── Madani (authentic glyph) page ────────────────────────────────────────── */

function MadaniPage({ page, onSelectVerse, activeVerse, scale = 1 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);
  const [fitSize, setFitSize] = useState(28);
  const [ready, setReady] = useState(false);
  const fontSize = fitSize * scale;

  // Lazy-load this page's glyph font(s), then reveal once they're ready so the
  // private-use glyphs never flash as tofu. This component is keyed by page, so
  // it remounts (and `ready` resets to false) on every page change.
  useEffect(() => {
    let active = true;
    ensureFontsForPage(page);
    const families = new Set<number>();
    for (const l of page.lines) if (l.t === "ayah") for (const w of l.w) families.add(w.fp);
    const loaders = [...families].map((fp) =>
      typeof document !== "undefined" && document.fonts
        ? document.fonts.load(`32px '${pageFontFamily(fp)}'`).catch(() => {})
        : Promise.resolve()
    );
    Promise.all(loaders).then(() => {
      if (active) setReady(true);
    });
    // Don't hang forever if the CDN is slow/offline.
    const t = setTimeout(() => active && setReady(true), 2500);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [page]);

  // Size the page so it fits within the viewport in BOTH dimensions. The QPC
  // glyphs are pre-justified, so a full line spans the width at the right size;
  // but a whole 15-line page must also fit the height — so we take the smaller
  // of the width-fit and height-fit sizes. Width-bound pages fill edge to edge;
  // height-bound (narrow/tall screens) sit centred with even margins.
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
  }, [ready, page]);

  return (
    <div ref={containerRef} className="mushaf-canvas">
      <div
        ref={linesRef}
        className="mushaf-lines"
        style={{ fontSize, opacity: ready ? 1 : 0 }}
      >
        {page.lines.map((line, i) => {
          if (line.t === "surah") return <SurahHeader key={`s${i}`} surah={line.s} />;
          if (line.t === "bism") return <BasmalahLine key={`b${i}`} />;
          return (
            <div key={`l${line.n}`} className="mushaf-line">
              <span className="mushaf-line-inner" dir="rtl">
                {line.w.map((w) => (
                  <span
                    key={`${w.k}-${w.i}${w.e ? "e" : ""}`}
                    className={
                      "mushaf-word" +
                      (w.e ? " mushaf-end" : "") +
                      (activeVerse === w.k ? " mushaf-word-active" : "")
                    }
                    style={{ fontFamily: `'${pageFontFamily(w.fp)}'` }}
                    onClick={onSelectVerse ? () => onSelectVerse(w.k) : undefined}
                    role={onSelectVerse ? "button" : undefined}
                  >
                    {w.c}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Uthmani / Tajweed flowing page ───────────────────────────────────────── */

function FlowingPage({ page, mode, onSelectVerse, activeVerse, scale = 1 }: Props) {
  const verses = useMemo(() => collectVerses(page.lines), [page.lines]);
  // Where each surah header / basmallah falls, keyed by the verse it precedes.
  const decorBefore = useMemo(() => {
    const m = new Map<string, ("surah" | "bism")[]>();
    let pendingKey: string | null = null;
    const pending: ("surah" | "bism")[] = [];
    for (const line of page.lines) {
      if (line.t === "surah") pending.push("surah");
      else if (line.t === "bism") pending.push("bism");
      else if (line.t === "ayah") {
        const firstKey = line.w[0]?.k;
        if (pending.length && firstKey) {
          m.set(firstKey, [...pending]);
          pending.length = 0;
        }
        pendingKey = firstKey ?? pendingKey;
      }
    }
    return m;
  }, [page.lines]);

  return (
    <div className="mushaf-canvas">
      <div className="mushaf-flow" style={{ "--mscale": scale } as React.CSSProperties}>
        {verses.map((v) => {
          const decor = decorBefore.get(v.key);
          const surahHeader = decor?.includes("surah");
          const bism = decor?.includes("bism");
          return (
            <div key={v.key}>
              {surahHeader && <SurahHeader surah={v.surah} />}
              {bism && <BasmalahLine />}
              <span
                className={
                  "mushaf-verse" + (activeVerse === v.key ? " mushaf-verse-active" : "")
                }
                dir="rtl"
                onClick={onSelectVerse ? () => onSelectVerse(v.key) : undefined}
                role={onSelectVerse ? "button" : undefined}
              >
                {mode === "tajweed" ? (
                  <TajweedText
                    surahNumber={v.surah}
                    ayahNumber={v.ayah}
                    arabicFallback={v.words.map((w) => w.u ?? "").join(" ")}
                    fontSize={Math.round(30 * scale)}
                  />
                ) : (
                  <span className="arabic mushaf-uthmani">
                    {v.words
                      .filter((w) => !w.e)
                      .map((w) => w.u ?? "")
                      .join(" ")}
                    <span className="mushaf-ayah-num">{toArabicDigits(v.ayah)}</span>
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MushafPageView(props: Props) {
  if (props.mode === "madani") return <MadaniPage {...props} />;
  return <FlowingPage {...props} />;
}
