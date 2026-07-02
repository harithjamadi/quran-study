/**
 * Closed-corpus ayah retrieval. The Quran is a fixed set of 6,236 ayat, so
 * identifying text is a RETRIEVAL problem, not transcription: normalize to a
 * rasm skeleton, then fuzzy-match against the corpus with minisearch. Noisy
 * input (OCR, partial diacritics) still resolves to the right verse.
 */
import MiniSearch from "minisearch";
import { toRasm } from "@/lib/arabic-normalize";

export interface AyahEntry {
  key: string;
  text: string;
}

export interface RecognitionResult {
  key: string;
  text: string;
  score: number;
  confidence: number;
  matchedTerms: number;
  queryTerms: number;
  /** 1-based [start, end] word range within the ayah that the query covered,
   *  for highlighting the matched snippet. Null when no query word is located. */
  matchedRange: readonly [number, number] | null;
}

type IndexedAyah = AyahEntry & { rasm: string };

const tokenize = (s: string): string[] => s.split(/\s+/).filter(Boolean);

export function buildAyahIndex(corpus: AyahEntry[]): MiniSearch<IndexedAyah> {
  const index = new MiniSearch<IndexedAyah>({
    idField: "key",
    fields: ["rasm"],
    storeFields: ["key", "text"],
    tokenize,
    // text is pre-normalized; identity keeps query/term processing aligned.
    processTerm: (t) => t,
    searchOptions: { fuzzy: 0.2, prefix: true, combineWith: "OR" },
  });
  index.addAll(corpus.map((a) => ({ ...a, rasm: toRasm(a.text) })));
  return index;
}

export function recognizeAyah(
  index: MiniSearch<IndexedAyah>,
  query: string
): RecognitionResult | null {
  const rasm = toRasm(query);
  const queryTerms = tokenize(rasm).length;
  if (queryTerms === 0) return null;

  const hits = index.search(rasm);
  if (hits.length === 0) return null;

  const top = hits[0];
  const matchedTerms = Object.keys(top.match).length;

  // Locate the query's words within the ayah to highlight the matched snippet.
  // Compare with alif removed: Uthmani long vowels use a superscript (dagger)
  // alif that rasm strips, while typed queries use a full alif — dropping every
  // alif makes the two spellings converge (e.g. العلمين ≈ العالمين).
  const noAlif = (s: string) => s.replace(/ا/g, "");
  const queryWords = tokenize(rasm).map(noAlif);
  const ayahWords = toRasm(top.text as string).split(/\s+/).filter(Boolean).map(noAlif);
  // A query is (almost always) a contiguous fragment of the ayah, so slide a
  // query-length window across it and keep the alignment with the most
  // per-position matches. Unlike a per-word indexOf, this anchors repeated
  // short words (الله, من, في …) to the correct occurrence.
  let bestStart = -1;
  let bestMatches = 0;
  for (let start = 0; start < ayahWords.length; start++) {
    let matches = 0;
    for (let i = 0; i < queryWords.length && start + i < ayahWords.length; i++) {
      if (ayahWords[start + i] === queryWords[i]) matches++;
    }
    if (matches > bestMatches) {
      bestMatches = matches;
      bestStart = start;
    }
  }
  let matchedRange: readonly [number, number] | null = null;
  if (bestStart >= 0) {
    // Trim the window to the first/last words that actually matched.
    let first = -1;
    let last = -1;
    for (let i = 0; i < queryWords.length && bestStart + i < ayahWords.length; i++) {
      if (ayahWords[bestStart + i] === queryWords[i]) {
        if (first < 0) first = bestStart + i;
        last = bestStart + i;
      }
    }
    if (first >= 0) matchedRange = [first + 1, last + 1];
  }

  return {
    key: top.id as string,
    text: top.text as string,
    score: top.score,
    confidence: Math.min(1, matchedTerms / queryTerms),
    matchedTerms,
    queryTerms,
    matchedRange,
  };
}

let indexPromise: Promise<MiniSearch<IndexedAyah> | null> | null = null;

export function loadAyahIndex(): Promise<MiniSearch<IndexedAyah> | null> {
  if (!indexPromise) {
    indexPromise = fetch("/data/corpus/ayat.json")
      .then((res) => (res.ok ? (res.json() as Promise<AyahEntry[]>) : null))
      .then((corpus) => (corpus ? buildAyahIndex(corpus) : null))
      .catch(() => null);
  }
  return indexPromise;
}

export function _resetAyahIndexCache(): void {
  indexPromise = null;
}
