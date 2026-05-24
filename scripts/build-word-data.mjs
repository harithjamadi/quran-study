#!/usr/bin/env node
// Builds static word-by-word data for every surah of the Quran.
//
// Output:
//   public/data/words/{n}.json       — { [ayah]: WordEntry[] } per surah
//   public/data/roots/{root}.json    — RootOccurrence[] per root (filename URI-encoded)
//   public/data/roots-index.json     — { [root]: { count, lemmas } }
//
// Sources:
//   - Morphology / roots: mustafa0x/quran-morphology (Quranic Arabic Corpus, cleaned)
//   - Per-word translit/gloss: Quran.com API v4 (https://api.quran.com)

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseMorphology,
  mergeSurah,
  buildRootOccurrences,
} from "./lib/morphology.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

const MORPHOLOGY_URL =
  "https://raw.githubusercontent.com/mustafa0x/quran-morphology/master/quran-morphology.txt";
const QURAN_API = "https://api.quran.com/api/v4";

const OUT_WORDS = path.join(PROJECT_ROOT, "public", "data", "words");
const OUT_ROOTS = path.join(PROJECT_ROOT, "public", "data", "roots");
const OUT_INDEX = path.join(PROJECT_ROOT, "public", "data", "roots-index.json");

const ONLY_SURAH = (() => {
  const arg = process.argv.find((a) => a.startsWith("--only="));
  return arg ? Number(arg.slice("--only=".length)) : null;
})();

async function fetchWithRetry(url, opts = {}, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, opts);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return res;
    } catch (err) {
      lastErr = err;
      const wait = 500 * Math.pow(2, i);
      console.warn(`  retry ${i + 1}/${attempts} in ${wait}ms: ${err.message}`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadMorphology() {
  console.log("→ fetching morphology...");
  const res = await fetchWithRetry(MORPHOLOGY_URL);
  const text = await res.text();
  console.log(`  ${(text.length / 1024 / 1024).toFixed(1)} MB downloaded`);
  const map = parseMorphology(text);
  console.log(`  parsed ${map.size} words`);
  return map;
}

async function fetchSurahWordsFromQuranCom(surahNumber) {
  const verses = {};
  let page = 1;
  while (true) {
    const url =
      `${QURAN_API}/verses/by_chapter/${surahNumber}` +
      `?words=true&word_fields=text_uthmani,transliteration&per_page=50&page=${page}`;
    const res = await fetchWithRetry(url);
    const j = await res.json();
    for (const v of j.verses) {
      const [, ayahStr] = v.verse_key.split(":");
      const words = v.words
        .filter((w) => w.char_type_name === "word")
        .map((w) => ({
          position: w.position,
          text: w.text_uthmani || w.text,
          translit: w.transliteration?.text ?? null,
          gloss: w.translation?.text ?? null,
        }));
      verses[ayahStr] = words;
    }
    const totalPages = j.pagination?.total_pages ?? 1;
    if (page >= totalPages) break;
    page++;
    await sleep(150);
  }
  return verses;
}

function encodeRootForFilename(root) {
  return encodeURIComponent(root);
}

async function ensureDirs() {
  await fs.mkdir(OUT_WORDS, { recursive: true });
  await fs.mkdir(OUT_ROOTS, { recursive: true });
}

async function main() {
  await ensureDirs();
  const morphMap = await loadMorphology();

  const surahsToProcess = ONLY_SURAH
    ? [ONLY_SURAH]
    : Array.from({ length: 114 }, (_, i) => i + 1);

  const allSurahs = {};
  let unmatched = 0;
  let matched = 0;

  for (const n of surahsToProcess) {
    process.stdout.write(`[${n}/114] surah ${n}... `);
    const qWords = await fetchSurahWordsFromQuranCom(n);
    const merged = mergeSurah(morphMap, qWords, n);
    allSurahs[n] = merged;

    // simple coverage stat
    for (const ayah of Object.values(merged)) {
      for (const w of ayah) {
        if (w.root || w.lemma) matched++;
        else unmatched++;
      }
    }

    await fs.writeFile(
      path.join(OUT_WORDS, `${n}.json`),
      JSON.stringify(merged)
    );
    console.log("ok");
    await sleep(200);
  }

  if (ONLY_SURAH) {
    console.log(
      `\n--only=${ONLY_SURAH} — skipping global root index (use full build for that).`
    );
    return;
  }

  console.log("\n→ building root occurrences...");
  const rootMap = buildRootOccurrences(allSurahs);
  const index = {};
  for (const [root, occs] of rootMap) {
    index[root] = {
      count: occs.length,
      lemmas: Array.from(new Set(occs.map((o) => o.lemma).filter(Boolean))),
    };
    await fs.writeFile(
      path.join(OUT_ROOTS, `${encodeRootForFilename(root)}.json`),
      JSON.stringify(occs)
    );
  }
  await fs.writeFile(OUT_INDEX, JSON.stringify(index));

  const total = matched + unmatched;
  const pct = ((matched / total) * 100).toFixed(1);
  console.log(
    `\n✓ done.  ${rootMap.size} roots indexed.  ${matched}/${total} words (${pct}%) carry root/lemma metadata.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
