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
  const ayahWords = toRasm(top.text as string).split(/\s+/).filter(Boolean).map(noAlif);
  const positions = tokenize(rasm)
    .map((w) => ayahWords.indexOf(noAlif(w)))
    .filter((i) => i >= 0);
  const matchedRange: readonly [number, number] | null = positions.length
    ? [Math.min(...positions) + 1, Math.max(...positions) + 1]
    : null;

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
