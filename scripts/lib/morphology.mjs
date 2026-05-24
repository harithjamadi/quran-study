// Pure parsers and mergers for word-by-word data.
// Kept dependency-free so they can be unit-tested.

// Tokens that appear as bare features but are NOT a part-of-speech.
const NON_POS_TOKENS = new Set([
  "DET", "PREF", "SUFF", "PASS", "ADJ",
  "M", "F", "D", "SG",
  "MS", "FS", "MD", "FD", "MP", "FP",
  "NOM", "ACC", "GEN",
  "IND", "SUBJ", "JUS", "IMPF", "IMPV", "PERF",
  "1P", "1S",
  "2MS", "2FS", "2MP", "2FP", "2MD", "2FD",
  "3MS", "3FS", "3MP", "3FP", "3MD", "3FD",
  "ATT", "DIST", "ADDR",
  "ACT_PCPL", "PASS_PCPL",
]);

function parseSegmentFeatures(featsRaw) {
  const features = featsRaw.split("|");
  let root = null;
  let lemma = null;
  let isPrefix = false;
  let isSuffix = false;
  const subtags = [];
  for (const f of features) {
    if (f.startsWith("ROOT:")) root = f.slice(5);
    else if (f.startsWith("LEM:")) lemma = f.slice(4);
    else if (f === "PREF") isPrefix = true;
    else if (f === "SUFF") isSuffix = true;
    else if (!f.startsWith("VF:") && !f.startsWith("MOOD:") && !NON_POS_TOKENS.has(f)) {
      subtags.push(f);
    }
  }
  return { root, lemma, isPrefix, isSuffix, subtags };
}

// Parses the quran-morphology.txt (mustafa0x) format into a Map keyed by "s:a:w".
// For each word it picks the canonical stem segment that carries the root/lemma.
export function parseMorphology(text) {
  const segmentsByWord = new Map();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split("\t");
    if (parts.length < 4) continue;
    const [loc, form, posClass, featsRaw] = parts;
    const locParts = loc.split(":").map(Number);
    if (locParts.length !== 4 || locParts.some(Number.isNaN)) continue;
    const [s, a, w, seg] = locParts;
    const feats = parseSegmentFeatures(featsRaw);
    const key = `${s}:${a}:${w}`;
    if (!segmentsByWord.has(key)) segmentsByWord.set(key, []);
    segmentsByWord.get(key).push({ seg, form, posClass, ...feats });
  }

  const out = new Map();
  for (const [key, segs] of segmentsByWord) {
    segs.sort((a, b) => a.seg - b.seg);
    const stem =
      segs.find((s) => !s.isPrefix && !s.isSuffix && (s.root || s.lemma)) ||
      segs.find((s) => s.root || s.lemma) ||
      segs[0];
    out.set(key, {
      root: stem.root,
      lemma: stem.lemma,
      pos: stem.posClass,
      segCount: segs.length,
    });
  }
  return out;
}

// Merge Quran.com word records with morphology map for one surah.
// `quranWords` shape: { [ayah]: [{ position, text, translit, gloss }, ...] }
// Returns: { [ayah]: [{ i, text, translit, gloss, root, lemma, pos }, ...] }
export function mergeSurah(morphMap, quranWords, surahNumber) {
  const out = {};
  for (const ayahStr of Object.keys(quranWords).sort((x, y) => Number(x) - Number(y))) {
    const ayah = Number(ayahStr);
    out[ayah] = quranWords[ayahStr].map((w) => {
      const key = `${surahNumber}:${ayah}:${w.position}`;
      const m = morphMap.get(key) || {};
      return {
        i: w.position,
        text: w.text,
        translit: w.translit ?? null,
        gloss: w.gloss ?? null,
        root: m.root ?? null,
        lemma: m.lemma ?? null,
        pos: m.pos ?? null,
      };
    });
  }
  return out;
}

// Builds root -> occurrences[] from { [surah]: { [ayah]: WordEntry[] } }.
export function buildRootOccurrences(allSurahs) {
  const map = new Map();
  for (const surahN of Object.keys(allSurahs)) {
    const s = Number(surahN);
    const ayahs = allSurahs[surahN];
    for (const ayahN of Object.keys(ayahs)) {
      const a = Number(ayahN);
      for (const w of ayahs[ayahN]) {
        if (!w.root) continue;
        if (!map.has(w.root)) map.set(w.root, []);
        map.get(w.root).push({
          s, a, i: w.i,
          text: w.text,
          lemma: w.lemma,
          gloss: w.gloss,
        });
      }
    }
  }
  return map;
}
