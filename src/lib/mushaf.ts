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

/** Ayah counts per surah — used to detect a surah's final line (it gets centred,
 *  the authentic Madani treatment for a short closing line). */
const SURAH_AYAHS: Record<number, number> = {
  1: 7, 2: 286, 3: 200, 4: 176, 5: 120, 6: 165, 7: 206, 8: 75, 9: 129, 10: 109,
  11: 123, 12: 111, 13: 43, 14: 52, 15: 99, 16: 128, 17: 111, 18: 110, 19: 98,
  20: 135, 21: 112, 22: 78, 23: 118, 24: 64, 25: 77, 26: 227, 27: 93, 28: 88,
  29: 69, 30: 60, 31: 34, 32: 30, 33: 73, 34: 54, 35: 45, 36: 83, 37: 182,
  38: 88, 39: 75, 40: 85, 41: 54, 42: 53, 43: 89, 44: 59, 45: 37, 46: 35,
  47: 38, 48: 29, 49: 18, 50: 45, 51: 60, 52: 49, 53: 62, 54: 55, 55: 78,
  56: 96, 57: 29, 58: 22, 59: 24, 60: 13, 61: 14, 62: 11, 63: 11, 64: 18,
  65: 12, 66: 12, 67: 30, 68: 52, 69: 52, 70: 44, 71: 28, 72: 28, 73: 20,
  74: 56, 75: 40, 76: 31, 77: 50, 78: 40, 79: 46, 80: 42, 81: 29, 82: 19,
  83: 36, 84: 25, 85: 22, 86: 17, 87: 19, 88: 26, 89: 30, 90: 20, 91: 15,
  92: 21, 93: 11, 94: 8, 95: 8, 96: 19, 97: 5, 98: 8, 99: 8, 100: 11, 101: 11,
  102: 8, 103: 3, 104: 9, 105: 5, 106: 4, 107: 7, 108: 3, 109: 6, 110: 3,
  111: 5, 112: 4, 113: 5, 114: 6,
};

/** Does this line carry the closing ayah of its surah? (→ centred line) */
function lineEndsSurah(words: MushafWord[]): boolean {
  for (const w of words) {
    if (!w.e) continue;
    const [s, a] = w.k.split(":").map(Number);
    if (SURAH_AYAHS[s] === a) return true;
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
        // Only one header slot (or none): fold the basmalah into the title band.
        slots[Math.max(1, a.line - 1)] = { kind: "surah", surah, withBasmalah: hasBasmalah };
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
