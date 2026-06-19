/**
 * Parser and client-side loader for the quran-tajweed edition data.
 *
 * Data format: Arabic verse string with embedded [code[text] annotations.
 * Example: "بِسْمِ [h:1[ٱ]للَّهِ [h:2[ٱ][l[ل]رَّحْمَ[n[ـٰ]نِ [h:3[ٱ][l[ل]رَّح[p[ِي]مِ"
 *
 * The data lives in /public/data/tajweed/{surahNumber}.json
 * Shape: { [ayahNumberInSurah: string]: string }
 */

export interface TajweedSegment {
  text: string;
  /** Raw rule code from the annotation, e.g. "h:1", "q:15", "n". Null for plain text. */
  code: string | null;
}

type TajweedSurahData = Record<string, string>;

const surahCache = new Map<number, Promise<TajweedSurahData | null>>();

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function loadTajweedSurah(
  surahNumber: number
): Promise<TajweedSurahData | null> {
  let p = surahCache.get(surahNumber);
  if (!p) {
    p = fetchJson<TajweedSurahData>(`/data/tajweed/${surahNumber}.json`);
    surahCache.set(surahNumber, p);
  }
  return p;
}

export function _resetTajweedCache() {
  surahCache.clear();
}

/**
 * Parse a tajweed-annotated verse string into a flat list of segments.
 * Each segment is either plain text or a rule-annotated span.
 *
 * Handles:
 *   [code[text]        simple rule
 *   [code:N[text]      rule with numeric id
 *   consecutive rules  [a[X][b[Y]
 */
export function parseTajweedVerse(raw: string): TajweedSegment[] {
  const segments: TajweedSegment[] = [];
  // Matches [code[text] where code is letters/colon/digits
  const tagRe = /\[([a-z][a-z0-9]*(?::[0-9]+)?)\[([^\]]*)\]/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(raw)) !== null) {
    // Plain text before this tag
    if (match.index > lastIndex) {
      const plain = raw.slice(lastIndex, match.index);
      if (plain) segments.push({ text: plain, code: null });
    }
    // Tagged segment — code is match[1], text is match[2]
    if (match[2]) {
      segments.push({ text: match[2], code: match[1] });
    }
    lastIndex = tagRe.lastIndex;
  }

  // Trailing plain text
  if (lastIndex < raw.length) {
    const tail = raw.slice(lastIndex);
    if (tail) segments.push({ text: tail, code: null });
  }

  return segments;
}

/**
 * Reduce a tajweed-annotated verse string to plain Arabic by concatenating the
 * text of every segment (tagged or not). Used to build the recognition corpus.
 */
export function stripTajweedAnnotations(raw: string): string {
  return parseTajweedVerse(raw)
    .map((s) => s.text)
    .join("");
}
