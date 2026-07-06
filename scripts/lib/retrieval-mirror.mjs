/**
 * JS mirror of the app's ayah-retrieval path for Node validation scripts,
 * which cannot import the TypeScript sources. Mirrors:
 *   - src/lib/arabic-normalize.ts   (toRasm)
 *   - src/lib/ayah-recognition.ts   (index config, merged-word splitting,
 *                                    alignment re-ranking)
 * Keep in sync when the app logic changes. Careful with the Arabic regex
 * literals: combining-mark ranges are easily corrupted by bidi-unaware
 * editing — after touching them, re-run the validation scripts.
 */
import MiniSearch from "minisearch";

const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
const TATWEEL = /ـ/g;
const FOLDS = [
  [/[آأإٱ]/g, "ا"],
  [/ؤ/g, "و"],
  [/ئ/g, "ي"],
  [/ى/g, "ي"],
  [/ة/g, "ه"],
];

function toRasm(text) {
  let out = text.normalize("NFC").replace(MARKS, "").replace(TATWEEL, "");
  for (const [re, to] of FOLDS) out = out.replace(re, to);
  return out.replace(/\s+/g, " ").trim();
}

const tokenize = (s) => s.split(/\s+/).filter(Boolean);

/** Keep only Arabic-block characters (mirror of src/lib/ocr-tesseract.ts). */
export const onlyArabic = (s) =>
  s.replace(/[^؀-ۿ\s]/g, " ").replace(/\s+/g, " ").trim();

const noAlif = (s) => s.replace(/ا/g, "");

function splitWith(token, known, depth) {
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

function withinOneEdit(a, b) {
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

const FUZZY_WEIGHT = 0.6;
const wordScore = (a, b) =>
  a === b ? 1 : a.length >= 4 && b.length >= 4 && withinOneEdit(a, b) ? FUZZY_WEIGHT : 0;

const ALIGN_GAP = 0.2;
// Mirror of alignQuery in src/lib/ayah-recognition.ts (see there for the
// full commentary) — keep line-parallel so drift shows up in a plain diff.
function alignQuery(queryWords, ayahWords) {
  const m = queryWords.length;
  const n = ayahWords.length;
  const stride = n + 1;
  const dp = new Float64Array((m + 1) * stride);
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
  let endJ = 0;
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

const RERANK_K = 8;
const RERANK_MARGIN = 0.25;

/** Build the full retrieval pipeline over a corpus of { key, text } ayat.
 *  recognize(query) → { tokens, hits, top } where hits are alignment-
 *  re-ranked within the top RERANK_K (top === hits[0]). */
export function buildRetrieval(corpus) {
  const index = new MiniSearch({
    idField: "key",
    fields: ["rasm"],
    storeFields: ["key", "text"],
    tokenize,
    processTerm: (t) => t,
    searchOptions: { fuzzy: 0.2, prefix: true, combineWith: "OR" },
  });
  const vocab = new Set();
  const vocabNoAlif = new Set();
  index.addAll(
    corpus.map((a) => {
      const rasm = toRasm(a.text);
      for (const w of tokenize(rasm)) {
        vocab.add(w);
        vocabNoAlif.add(noAlif(w));
      }
      return { ...a, rasm };
    })
  );
  const exact = (w) => vocab.has(w);
  const folded = (w) => vocab.has(w) || vocabNoAlif.has(noAlif(w));
  const splitMerged = (t, depth = 3) => splitWith(t, exact, depth) ?? splitWith(t, folded, depth);

  function recognize(query) {
    const tokens = tokenize(toRasm(query)).flatMap((t) => splitMerged(t) ?? [t]);
    if (tokens.length === 0) return { tokens, hits: [], top: null, matchedRange: null };
    const ranked = index.search(tokens.join(" "));
    if (ranked.length === 0) return { tokens, hits: ranked, top: null, matchedRange: null };
    const queryWords = tokens.map(noAlif);
    const wordsOf = (text) => tokenize(toRasm(text)).map(noAlif);
    let topIdx = 0;
    let topAlignment = alignQuery(queryWords, wordsOf(ranked[0].text));
    for (let k = 1; k < Math.min(RERANK_K, ranked.length); k++) {
      const alignment = alignQuery(queryWords, wordsOf(ranked[k].text));
      if (alignment.score > topAlignment.score + RERANK_MARGIN) {
        topIdx = k;
        topAlignment = alignment;
      }
    }
    // Unlike the app (which only needs the single top result), the stacked
    // validation checks top-3 — surface the alignment winner at index 0 and
    // keep the rest in BM25 order.
    const hits = [ranked[topIdx], ...ranked.slice(0, topIdx), ...ranked.slice(topIdx + 1)];
    const matchedRange =
      topAlignment.first >= 0 ? [topAlignment.first + 1, topAlignment.last + 1] : null;
    return { tokens, hits, top: hits[0], matchedRange };
  }

  return { recognize };
}
