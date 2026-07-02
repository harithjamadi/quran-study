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

// Uthmani long vowels use a superscript (dagger) alif that rasm strips, while
// typed/OCR text uses a full alif — dropping every alif converges the two
// spellings (e.g. العلمين ≈ العالمين).
const noAlif = (s: string) => s.replace(/ا/g, "");

/** The search index plus the corpus's rasm vocabulary — the vocabulary lets
 *  recognizeAyah split words that OCR or hurried typing merged together. */
export interface AyahIndex {
  search: MiniSearch<IndexedAyah>;
  vocab: Set<string>;
  /** vocab with every alif dropped, folding dagger-alif spelling differences. */
  vocabNoAlif: Set<string>;
}

export function buildAyahIndex(corpus: AyahEntry[]): AyahIndex {
  const index = new MiniSearch<IndexedAyah>({
    idField: "key",
    fields: ["rasm"],
    storeFields: ["key", "text"],
    tokenize,
    // text is pre-normalized; identity keeps query/term processing aligned.
    processTerm: (t) => t,
    searchOptions: { fuzzy: 0.2, prefix: true, combineWith: "OR" },
  });
  const vocab = new Set<string>();
  const vocabNoAlif = new Set<string>();
  const indexed = corpus.map((a) => {
    const rasm = toRasm(a.text);
    for (const w of tokenize(rasm)) {
      vocab.add(w);
      vocabNoAlif.add(noAlif(w));
    }
    return { ...a, rasm };
  });
  index.addAll(indexed);
  return { search: index, vocab, vocabNoAlif };
}

/**
 * Split a token the corpus has never seen into known corpus words — OCR (and
 * fast typing) frequently drops the space between Arabic words (e.g.
 * ربالعالمين → رب العالمين). Longest-known-head first, at most `depth` parts.
 *
 * Exact vocabulary membership is tried first; only if no exact segmentation
 * exists is the check retried alif-folded (العالمين ≈ corpus العلمين). The
 * folded check alone is too loose — e.g. اللها folds to لله and steals the
 * alif from أحد — so it is a fallback, not the default.
 */
function splitWith(token: string, known: (w: string) => boolean, depth: number): string[] | null {
  if (known(token)) return [token];
  if (depth === 1 || token.length < 4) return null;
  for (let i = token.length - 2; i >= 2; i--) {
    const head = token.slice(0, i);
    if (!known(head)) continue;
    const rest = splitWith(token.slice(i), known, depth - 1);
    if (rest) return [head, ...rest];
  }
  return null;
}

function splitMerged(token: string, idx: AyahIndex, depth = 3): string[] | null {
  const exact = (w: string) => idx.vocab.has(w);
  const folded = (w: string) => idx.vocab.has(w) || idx.vocabNoAlif.has(noAlif(w));
  return splitWith(token, exact, depth) ?? splitWith(token, folded, depth);
}

export function recognizeAyah(
  ayahIndex: AyahIndex,
  query: string
): RecognitionResult | null {
  const { search } = ayahIndex;
  const rawTokens = tokenize(toRasm(query));
  const tokens = rawTokens.flatMap((t) => splitMerged(t, ayahIndex) ?? [t]);
  const rasm = tokens.join(" ");
  const queryTerms = tokens.length;
  if (queryTerms === 0) return null;

  const hits = search.search(rasm);
  if (hits.length === 0) return null;

  const top = hits[0];
  const matchedTerms = Object.keys(top.match).length;

  // Locate the query's words within the ayah to highlight the matched
  // snippet, comparing alif-folded (see noAlif above).
  const queryWords = tokens.map(noAlif);
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

let indexPromise: Promise<AyahIndex | null> | null = null;

export function loadAyahIndex(): Promise<AyahIndex | null> {
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
