// Client-side loader for the static word-by-word dataset under /public/data.
// The data is built by scripts/build-word-data.mjs.

import type { LemmaMeta } from "@/lib/learning";

export interface WordEntry {
  /** 1-indexed word position within its ayah. */
  i: number;
  /** Arabic text in Uthmani script. */
  text: string;
  /** Latin transliteration. */
  translit: string | null;
  /** Short English gloss. */
  gloss: string | null;
  /** Short Malay gloss (contextual). */
  glossMs: string | null;
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
  glossMs: string | null;
}

export interface RootIndexEntry {
  count: number;
  lemmas: string[];
}

export type RootIndex = Record<string, RootIndexEntry>;

const surahCache = new Map<number, Promise<SurahWords | null>>();
const rootCache = new Map<string, Promise<RootOccurrence[] | null>>();
let rootIndexPromise: Promise<RootIndex | null> | null = null;
let frequencyPromise: Promise<LemmaMeta[] | null> | null = null;

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
    // Served via API route — Next 16's static layer 400s on percent-encoded paths.
    p = fetchJson<RootOccurrence[]>(`/api/roots/${encodeURIComponent(root)}`);
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

export function loadLemmaFrequency(): Promise<LemmaMeta[] | null> {
  if (!frequencyPromise) {
    frequencyPromise = fetchJson<LemmaMeta[]>("/data/lemma-frequency.json");
  }
  return frequencyPromise;
}

/**
 * Scan early surahs for all occurrences of a specific lemma.
 * Used for particles (pos=P) that have no trilateral root file.
 * Results are cached per lemma.
 */
const lemmaExamplesCache = new Map<string, Promise<RootOccurrence[]>>();

export function loadLemmaExamples(lemma: string): Promise<RootOccurrence[]> {
  let p = lemmaExamplesCache.get(lemma);
  if (!p) {
    p = (async () => {
      const results: RootOccurrence[] = [];
      // Scan the first few surahs — particles appear densely in early Quran
      for (const s of [1, 2, 3, 4, 5]) {
        const words = await loadSurahWords(s);
        if (!words) continue;
        for (const [ayahKey, wordList] of Object.entries(words)) {
          for (const w of wordList) {
            if (w.lemma === lemma) {
              results.push({
                s,
                a: Number(ayahKey),
                i: w.i,
                text: w.text,
                lemma: w.lemma,
                gloss: w.gloss,
                glossMs: w.glossMs ?? null,
              });
            }
          }
        }
        if (results.length >= 30) break;
      }
      return results;
    })();
    lemmaExamplesCache.set(lemma, p);
  }
  return p;
}

/** For tests / forced refresh. */
export function _resetWordCaches() {
  surahCache.clear();
  rootCache.clear();
  rootIndexPromise = null;
  lemmaExamplesCache.clear();
}
