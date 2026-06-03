// Client-side loaders + font handling for the pixel-authentic 15-line Madani
// mushaf. Page layout JSON is built by scripts/build-mushaf.mjs and served from
// /public/data/mushaf. The QPC v2 page fonts are hotlinked from quran.com's CDN
// (CORS-open, cached a year) and lazy-loaded one page at a time.

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

export function clampPage(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(TOTAL_PAGES, Math.max(1, Math.trunc(n)));
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
