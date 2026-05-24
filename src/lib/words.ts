// Client-side loader for the static word-by-word dataset under /public/data.
// The data is built by scripts/build-word-data.mjs.

export interface WordEntry {
  /** 1-indexed word position within its ayah. */
  i: number;
  /** Arabic text in Uthmani script. */
  text: string;
  /** Latin transliteration. */
  translit: string | null;
  /** Short English gloss. */
  gloss: string | null;
  /** 3-letter Arabic root (e.g. "رحم"). Null for particles/pronouns. */
  root: string | null;
  /** Dictionary form. */
  lemma: string | null;
  /** Part-of-speech class: N (nominal), V (verb), P (particle). */
  pos: string | null;
}

export type SurahWords = Record<string, WordEntry[]>;

export interface RootOccurrence {
  /** Surah number. */
  s: number;
  /** Ayah number within the surah. */
  a: number;
  /** Word index within the ayah. */
  i: number;
  text: string;
  lemma: string | null;
  gloss: string | null;
}

export interface RootIndexEntry {
  count: number;
  lemmas: string[];
}

export type RootIndex = Record<string, RootIndexEntry>;

const surahCache = new Map<number, Promise<SurahWords | null>>();
const rootCache = new Map<string, Promise<RootOccurrence[] | null>>();
let rootIndexPromise: Promise<RootIndex | null> | null = null;

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[words] fetch ${url} → HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[words] fetch ${url} failed`, err);
    return null;
  }
}

export function loadSurahWords(surahNumber: number): Promise<SurahWords | null> {
  let p = surahCache.get(surahNumber);
  if (!p) {
    p = fetchJson<SurahWords>(`/data/words/${surahNumber}.json`);
    surahCache.set(surahNumber, p);
  }
  return p;
}

export function loadRootOccurrences(root: string): Promise<RootOccurrence[] | null> {
  let p = rootCache.get(root);
  if (!p) {
    p = fetchJson<RootOccurrence[]>(`/data/roots/${encodeURIComponent(root)}.json`);
    rootCache.set(root, p);
  }
  return p;
}

export function loadRootIndex(): Promise<RootIndex | null> {
  if (!rootIndexPromise) {
    rootIndexPromise = fetchJson<RootIndex>("/data/roots-index.json");
  }
  return rootIndexPromise;
}

/** For tests / forced refresh. */
export function _resetWordCaches() {
  surahCache.clear();
  rootCache.clear();
  rootIndexPromise = null;
}
