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

/** True when a and b are within one edit (substitute/insert/delete one
 *  letter) — the typical damage a single OCR misread does to a word. */
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (la === lb) {
      i++;
      j++;
    } else if (la > lb) {
      i++;
    } else {
      j++;
    }
  }
  return edits + (la - i) + (lb - j) <= 1;
}

/** A one-letter-off match is real signal but weaker than an exact one —
 *  weighting it below 1 keeps a decoy full of near-misses from outranking
 *  the verse the user actually has in front of them. */
const FUZZY_WEIGHT = 0.6;

/** Match weight between a query word and an ayah word (both rasm, alif-
 *  folded). Words shorter than 4 letters must match exactly: one edit on a
 *  particle (من/عن, ثم/لم…) reaches a different common word, not noise. */
function wordScore(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 4 || b.length < 4) return 0;
  return withinOneEdit(a, b) ? FUZZY_WEIGHT : 0;
}

/** Penalty for skipping a word (on either side) inside the aligned region.
 *  Small enough that a wrongly-split token or an OCR phantom word doesn't
 *  sink the true verse, large enough that contiguous matches still win. */
const ALIGN_GAP = 0.2;

/** Alignment of the query against one ayah: the DP score plus the 0-based
 *  index range of the ayah words the optimal path actually matched
 *  (first === -1 when nothing matched). */
interface QueryAlignment {
  score: number;
  first: number;
  last: number;
}

/**
 * Order-preserving alignment of the query within an ayah — how well the
 * query reads as a (noisy) contiguous fragment of it. Semi-global DP:
 * ayah words before/after the matched region are free, but every skipped
 * word inside it costs ALIGN_GAP on either side. Unlike a fixed sliding
 * window, this stays anchored when a token was wrongly split or merged and
 * the rest of the query shifts by a position. The same path that produces
 * the ranking score yields the matched word range, so the highlighted
 * snippet always agrees with why the verse was chosen.
 */
function alignQuery(queryWords: string[], ayahWords: string[]): QueryAlignment {
  const m = queryWords.length;
  const n = ayahWords.length;
  const stride = n + 1;
  const dp = new Float64Array((m + 1) * stride); // row 0: free leading ayah words
  // Traceback moves: 0 = restart (score floored at 0), 1 = diagonal
  // (query word i aligned to ayah word j), 2 = skip query word, 3 = skip
  // ayah word.
  const from = new Uint8Array((m + 1) * stride);
  for (let i = 1; i <= m; i++) {
    dp[i * stride] = dp[(i - 1) * stride] - ALIGN_GAP;
    from[i * stride] = 2;
    for (let j = 1; j <= n; j++) {
      const w = wordScore(ayahWords[j - 1], queryWords[i - 1]);
      const diag = dp[(i - 1) * stride + (j - 1)] + w;
      const up = dp[(i - 1) * stride + j] - ALIGN_GAP;
      const left = dp[i * stride + (j - 1)] - ALIGN_GAP;
      let best = diag;
      let move = 1;
      if (up > best) {
        best = up;
        move = 2;
      }
      if (left > best) {
        best = left;
        move = 3;
      }
      if (best < 0) {
        best = 0;
        move = 0;
      }
      dp[i * stride + j] = best;
      from[i * stride + j] = move;
    }
  }
  let score = 0;
  let endJ = 0; // free trailing ayah words: best cell anywhere in the last row
  for (let j = 0; j <= n; j++) {
    if (dp[m * stride + j] > score) {
      score = dp[m * stride + j];
      endJ = j;
    }
  }
  let first = -1;
  let last = -1;
  for (let i = m, j = endJ; i > 0 && from[i * stride + j] !== 0; ) {
    const move = from[i * stride + j];
    if (move === 1) {
      if (wordScore(ayahWords[j - 1], queryWords[i - 1]) > 0) {
        first = j - 1;
        if (last < 0) last = j - 1;
      }
      i--;
      j--;
    } else if (move === 2) {
      i--;
    } else {
      j--;
    }
  }
  return { score, first, last };
}

/** How deep into the BM25 ranking re-ranking looks. */
const RERANK_K = 8;

/** A lower-BM25 candidate must beat the incumbent's alignment by this much
 *  to displace it — alignment ties resolve in favour of term rarity. */
const RERANK_MARGIN = 0.25;

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

  // BM25 treats the query as a bag of words, so with noisy OCR the top hit
  // can be a verse that merely shares the query's rarest words. The query is
  // (almost always) a contiguous fragment of ONE verse — re-rank the head of
  // the ranking by how well the query aligns as an in-order fragment. The
  // winning hit's alignment doubles as the highlight range.
  const queryWords = tokens.map(noAlif);
  const wordsOf = (text: string) => tokenize(toRasm(text)).map(noAlif);
  let top = hits[0];
  let topAlignment = alignQuery(queryWords, wordsOf(top.text as string));
  for (const hit of hits.slice(1, RERANK_K)) {
    const alignment = alignQuery(queryWords, wordsOf(hit.text as string));
    if (alignment.score > topAlignment.score + RERANK_MARGIN) {
      top = hit;
      topAlignment = alignment;
    }
  }
  const matchedTerms = Object.keys(top.match).length;
  const matchedRange: readonly [number, number] | null =
    topAlignment.first >= 0 ? [topAlignment.first + 1, topAlignment.last + 1] : null;

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
