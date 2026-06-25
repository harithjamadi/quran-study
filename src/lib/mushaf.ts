// Client-side loaders + font handling for the pixel-authentic 15-line Madani
// mushaf. Page layout JSON is built by scripts/build-mushaf.mjs and served from
// /public/data/mushaf. The QPC v2 page fonts are hotlinked from quran.com's CDN
// (CORS-open, cached a year) and lazy-loaded one page at a time.

import { getSurah } from "@/data/surahs";

export interface MushafWord {
  /** code_v2 glyph — rendered with the page font, not a normal Arabic font. */
  c: string;
  /** Font page (v2_page) whose font contains this glyph. */
  fp: number;
  /** Verse key, e.g. "2:255". */
  k: string;
  /** Word position within the verse. */
  i: number;
  /** Present (1) when this is the ayah-end number marker. */
  e?: 1;
  /** Plain Uthmani text — for tajweed / plain-script modes, search, copy. */
  u: string | null;
}

export type MushafLine =
  | { t: "surah"; s: number }
  | { t: "bism" }
  | { t: "ayah"; n: number; w: MushafWord[] };

export interface MushafPage {
  p: number;
  juz: number | null;
  surahs: number[];
  firstKey: string | null;
  lines: MushafLine[];
}

export interface MushafIndexEntry {
  p: number;
  juz: number | null;
  surahs: number[];
}

export interface MushafIndex {
  totalPages: number;
  pages: MushafIndexEntry[];
  surahStartPage: Record<string, number>;
}

export const TOTAL_PAGES = 604;

/** Every standard Madani page is a 15-line grid. */
export const GRID_ROWS = 15;

export function clampPage(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(TOTAL_PAGES, Math.max(1, Math.trunc(n)));
}

// ── Page layout (authentic 15-line grid) ─────────────────────────────────────
// The renderer never stacks lines blindly: it places each ayah line in its real
// numbered slot (1..15) and reconstructs the surah-name / basmalah header lines
// from the *gap* before a surah's first ayah. This is what keeps a page exactly
// 15 rows — the old "always insert a basmalah line" guess overflowed pages where
// the print puts the basmalah inside the surah band (e.g. An-Nisāʾ, p.77).

export type MushafRow =
  | { kind: "surah"; surah: number; withBasmalah: boolean }
  | { kind: "basmalah" }
  | { kind: "ayah"; line: number; words: MushafWord[]; centered: boolean }
  | { kind: "blank" };

export interface MushafLayout {
  rows: MushafRow[];
  /** Pages 1–2 are the ornamental opening pages: fewer lines, centred in a frame. */
  centeredPage: boolean;
}

/** Does this line carry the closing ayah of its surah? (→ centred line, the
 *  authentic Madani treatment for a short closing line). Ayah counts come from
 *  the canonical surah table so there is a single source of truth. */
function lineEndsSurah(words: MushafWord[]): boolean {
  for (const w of words) {
    if (!w.e) continue;
    const [s, a] = w.k.split(":").map(Number);
    if (getSurah(s)?.numberOfAyahs === a) return true;
  }
  return false;
}

/**
 * Convert a built page into an ordered list of grid rows. Surah-name and basmalah
 * rows are derived from the line numbers (the built page's own "bism" markers are
 * ignored — they were the source of the 16-line overflow bug). Non-opening pages
 * are always padded to a full 15 rows so every page shares the same vertical
 * rhythm and the text never jumps size when you swipe.
 */
export function buildPageRows(page: MushafPage): MushafLayout {
  type AyahLine = { line: number; words: MushafWord[]; surahStart: number | null };
  const ayahLines: AyahLine[] = [];
  let pendingSurah: number | null = null;
  for (const l of page.lines) {
    if (l.t === "surah") {
      pendingSurah = l.s;
      continue;
    }
    if (l.t === "bism") continue; // recomputed from slot gaps below
    ayahLines.push({ line: l.n, words: l.w, surahStart: pendingSurah });
    pendingSurah = null;
  }

  const maxLine = ayahLines.reduce((m, a) => Math.max(m, a.line), 0);
  const centeredPage = page.p <= 2;
  const rowCount = centeredPage ? maxLine : Math.max(GRID_ROWS, maxLine);

  // 1-indexed slot table; gaps stay undefined → rendered as blank rows.
  const slots: (MushafRow | undefined)[] = new Array(rowCount + 1);
  let lastFilled = 0;

  for (const a of ayahLines) {
    if (a.surahStart != null) {
      const surah = a.surahStart;
      const hasBasmalah = surah !== 1 && surah !== 9; // Al-Fātiḥah & At-Tawbah: none
      const headerSlots = a.line - 1 - lastFilled;
      if (headerSlots >= 2) {
        // Title on its own line, basmalah on the next (the common case).
        slots[a.line - 2] = { kind: "surah", surah, withBasmalah: false };
        slots[a.line - 1] = hasBasmalah ? { kind: "basmalah" } : { kind: "blank" };
      } else {
        // Only one header slot: fold the basmalah into the title band. With zero
        // or negative slots the surah continues from the previous page's bottom,
        // so there is no room for a header here — never clobber a filled slot.
        const slot = Math.max(1, a.line - 1);
        if (!slots[slot]) {
          slots[slot] = { kind: "surah", surah, withBasmalah: hasBasmalah };
        }
      }
    }
    slots[a.line] = {
      kind: "ayah",
      line: a.line,
      words: a.words,
      centered: lineEndsSurah(a.words),
    };
    lastFilled = a.line;
  }

  const rows: MushafRow[] = [];
  for (let i = 1; i <= rowCount; i++) rows.push(slots[i] ?? { kind: "blank" });
  return { rows, centeredPage };
}

// ── Page data ───────────────────────────────────────────────────────────────

const pageCache = new Map<number, Promise<MushafPage | null>>();
let indexPromise: Promise<MushafIndex | null> | null = null;

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function loadMushafPage(page: number): Promise<MushafPage | null> {
  const n = clampPage(page);
  let p = pageCache.get(n);
  if (!p) {
    p = fetchJson<MushafPage>(`/data/mushaf/${n}.json`);
    pageCache.set(n, p);
  }
  return p;
}

export function loadMushafIndex(): Promise<MushafIndex | null> {
  if (!indexPromise) indexPromise = fetchJson<MushafIndex>("/data/mushaf/index.json");
  return indexPromise;
}

// ── Page fonts (QPC v2, lazy) ────────────────────────────────────────────────

const FONT_BASE = "https://static.qurancdn.com/fonts/quran/hafs/v2/woff2";
const injected = new Set<number>();
let styleEl: HTMLStyleElement | null = null;

export function pageFontFamily(fontPage: number): string {
  return `QCFV2P${fontPage}`;
}

/**
 * Inject the @font-face for a QPC page font once. The glyphs live in the Unicode
 * private-use area, so there is no sensible fallback — `font-display: block`
 * keeps the line blank until the font arrives rather than flashing tofu boxes.
 */
export function ensurePageFont(fontPage: number): void {
  if (typeof document === "undefined" || injected.has(fontPage)) return;
  injected.add(fontPage);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "qcf-page-fonts";
    document.head.appendChild(styleEl);
  }
  styleEl.appendChild(
    document.createTextNode(
      `@font-face{font-family:'${pageFontFamily(fontPage)}';` +
        `src:url('${FONT_BASE}/p${fontPage}.woff2') format('woff2');` +
        `font-display:block;font-weight:normal;font-style:normal;}`
    )
  );
}

/** Inject every font page referenced by a built page (usually just one). */
export function ensureFontsForPage(page: MushafPage): void {
  const fps = new Set<number>();
  for (const line of page.lines) {
    if (line.t === "ayah") for (const w of line.w) fps.add(w.fp);
  }
  for (const fp of fps) ensurePageFont(fp);
}

/** Warm the page JSON + fonts for a page the user is likely to swipe to. */
export function prefetchPage(page: number): void {
  const n = clampPage(page);
  loadMushafPage(n).then((p) => {
    if (p) ensureFontsForPage(p);
  });
}
