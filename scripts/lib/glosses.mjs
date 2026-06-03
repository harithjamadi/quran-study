// Pure gloss-resolution helpers for build-frequency.mjs.
// Dependency-free so they can be unit-tested in isolation.
//
// The central correctness concern here is the *purity of meaning*: two Quranic
// words that differ only by a diacritic (e.g. إِنَّ "indeed" vs إِنْ "if") must
// never be conflated. The exact-match layer guarantees that.

/**
 * Strip Arabic short-vowel/tashkeel marks for diacritic-agnostic matching.
 * NOTE: this intentionally also removes the shadda (U+0651), so it must never be
 * the *only* basis for distinguishing two lemmas — see buildGlossTables, whose
 * exact (diacritized) layer is what keeps minimal pairs apart.
 */
export const normalize = (s) => (s ? s.replace(/[ً-ٰٟ]/g, "") : "");

/**
 * Build two lookup tables from a curated dict whose keys are "arabic" or
 * "arabic|POS":
 *   exact — keyed by the fully-diacritized Arabic (and "arabic|POS"). Consulted
 *           FIRST so lexical minimal pairs that differ only by a meaningful mark
 *           (e.g. the shadda in إِنَّ "indeed" vs إِنْ "if") stay distinct instead
 *           of collapsing into one diacritic-stripped bucket.
 *   norm  — keyed by the diacritic-stripped Arabic (and "norm|POS"), for robust
 *           matching when the dataset's diacritics differ from ours. First entry
 *           wins; a *bare* colliding key is logged via `warn` so a future edit
 *           that would silently override an existing gloss is caught at build
 *           time, not in worship.
 */
export function buildGlossTables(rawDict, label = "", warn = console.warn) {
  const exact = {};
  const norm = {};
  for (const k of Object.keys(rawDict)) {
    const [ar, pos] = k.split("|");
    exact[pos ? `${ar}|${pos}` : ar] = rawDict[k];
    const normKey = pos ? `${normalize(ar)}|${pos}` : normalize(ar);
    if (normKey in norm && norm[normKey] !== rawDict[k]) {
      // A diacritized key (e.g. إِنّ vs إِن) is still recoverable through the
      // exact-match layer, so only a *bare* colliding key — one the exact layer
      // can't tell apart — is an actual ambiguity worth warning about.
      if (ar === normalize(ar)) {
        warn(
          `  ⚠ ${label} gloss collision on bare key "${normKey}": keeping ` +
            `"${norm[normKey]}", ignoring "${rawDict[k]}" (from key "${k}"). ` +
            `Add full diacritics to disambiguate if these are different words.`
        );
      }
    } else {
      norm[normKey] = rawDict[k];
    }
  }
  return { exact, norm };
}

/**
 * Resolve the gloss for a word: try the exact (diacritized) lemma/text first,
 * then fall back to the diacritic-stripped tables. Returns null when nothing
 * matches so the caller can fall back further (Quran.com gloss / Indonesian).
 */
export function resolveGloss({ exact, norm }, { lemma, text, pos }) {
  return (
    exact[`${lemma}|${pos}`] ??
    exact[lemma] ??
    exact[`${text}|${pos}`] ??
    exact[text] ??
    norm[`${normalize(lemma)}|${pos}`] ??
    norm[`${normalize(text)}|${pos}`] ??
    norm[normalize(lemma)] ??
    norm[normalize(text)] ??
    null
  );
}

/**
 * A word carrying a وَ/فَ (and/then) prefix gets a per-word gloss that opens with
 * the conjunction ("And when", "Then he said"). For a single-lemma vocabulary
 * card that leading conjunction is noise, so strip it — but never to empty (the
 * lemma و itself is just "and"). Apply only to the raw per-word fallback, never
 * to curated dictionary glosses (which may legitimately start with "so / then").
 */
export function cleanEnGloss(s) {
  if (!s) return s;
  const cleaned = s.replace(/^(And|and|Then|then|So|so|But|but)\s+/, "");
  return cleaned.length ? cleaned : s;
}
