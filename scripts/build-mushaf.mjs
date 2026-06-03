#!/usr/bin/env node
// Builds the per-page layout for a pixel-authentic 15-line Madani mushaf.
//
// Output:
//   public/data/mushaf/{1..604}.json  — one page's lines + glyph words
//   public/data/mushaf/index.json     — page → {juz, surahs}, surah → startPage
//
// Source: Quran.com API v4 (verses/by_page). Each word carries:
//   code_v2        — the glyph code rendered with that page's QPC v2 font
//   v2_page        — which page-font contains the glyph (the @font-face to use)
//   line_number    — the line (1..15) the word sits on
//   char_type_name — "word" or "end" (the ayah-number marker)
//   text_uthmani   — plain Uthmani text (used by the tajweed / plain-script modes)
//
// The QPC fonts themselves are NOT downloaded — they are hotlinked from
// static.qurancdn.com (CORS-open, cached a year) and lazy-loaded per page.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(PROJECT_ROOT, "public", "data", "mushaf");

const API = "https://api.quran.com/api/v4";
const TOTAL_PAGES = 604;

const RANGE = (() => {
  const arg = process.argv.find((a) => a.startsWith("--pages="));
  if (!arg) return null;
  const [a, b] = arg.slice("--pages=".length).split("-").map(Number);
  return { from: a, to: b ?? a };
})();
const FORCE = process.argv.includes("--force");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchRetry(url, attempts = 5) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      last = e;
      await sleep(400 * 2 ** i);
    }
  }
  throw last;
}

async function fetchPageWords(page) {
  // A page never exceeds ~15 lines of words, so one generous page of results
  // covers it, but loop on pagination just in case.
  const words = [];
  let p = 1;
  const fields = "code_v2,v2_page,line_number,char_type_name,text_uthmani";
  let juz = null;
  while (true) {
    const url =
      `${API}/verses/by_page/${page}?words=true&per_page=50&page=${p}` +
      `&word_fields=${fields}&fields=juz_number`;
    const j = await fetchRetry(url);
    for (const v of j.verses) {
      if (juz == null) juz = v.juz_number ?? null;
      for (const w of v.words) {
        words.push({
          key: v.verse_key,
          pos: w.position,
          line: w.line_number,
          end: w.char_type_name === "end",
          code: w.code_v2 ?? w.text ?? null,
          fp: w.v2_page ?? page,
          u: w.text_uthmani ?? null,
        });
      }
    }
    const total = j.pagination?.total_pages ?? 1;
    if (p >= total) break;
    p++;
    await sleep(120);
  }
  return { words, juz };
}

// Turn a flat word list into ordered lines, inserting a surah-name header (and
// a basmallah line, except for Al-Fatihah and At-Tawbah) above the first ayah
// line of every surah that begins on this page. In the Madani mushaf a surah
// always starts on a fresh line, so "first word of a line whose verse is :1" is
// a reliable surah-start signal.
function buildLines(words) {
  const byLine = new Map();
  for (const w of words) {
    if (!byLine.has(w.line)) byLine.set(w.line, []);
    byLine.get(w.line).push(w);
  }
  const lineNums = [...byLine.keys()].sort((a, b) => a - b);
  const surahs = new Set();
  const out = [];
  for (const ln of lineNums) {
    // The API already returns words in reading order (verse, then position),
    // and we pushed them in that order — so do NOT re-sort, or multi-verse
    // lines get scrambled (e.g. 2:1 and 2:2 both have a position-1 word).
    const lineWords = byLine.get(ln);
    const first = lineWords[0];
    const startsSurah = first.pos === 1 && /:1$/.test(first.key);
    if (startsSurah) {
      const surah = Number(first.key.split(":")[0]);
      surahs.add(surah);
      out.push({ t: "surah", s: surah });
      if (surah !== 1 && surah !== 9) out.push({ t: "bism" });
    }
    out.push({
      t: "ayah",
      n: ln,
      w: lineWords.map((w) => ({
        c: w.code,
        fp: w.fp,
        k: w.key,
        i: w.pos,
        ...(w.end ? { e: 1 } : {}),
        u: w.u,
      })),
    });
  }
  return { lines: out, surahs: [...surahs] };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const from = RANGE?.from ?? 1;
  const to = RANGE?.to ?? TOTAL_PAGES;

  const index = [];
  const surahStartPage = {};

  for (let page = from; page <= to; page++) {
    const dest = path.join(OUT_DIR, `${page}.json`);
    if (!FORCE) {
      try {
        await fs.access(dest);
        // Still need its data for the index — read it back.
        const cached = JSON.parse(await fs.readFile(dest, "utf8"));
        index[page] = { p: page, juz: cached.juz, surahs: cached.surahs };
        for (const s of cached.surahs)
          if (surahStartPage[s] == null || page < surahStartPage[s]) surahStartPage[s] = page;
        process.stdout.write(`[${page}/${to}] cached\r`);
        continue;
      } catch {
        /* not built yet */
      }
    }
    const { words, juz } = await fetchPageWords(page);
    const { lines, surahs } = buildLines(words);
    const firstKey = words[0]?.key ?? null;
    const out = { p: page, juz, surahs, firstKey, lines };
    await fs.writeFile(dest, JSON.stringify(out));
    index[page] = { p: page, juz, surahs };
    for (const s of surahs)
      if (surahStartPage[s] == null || page < surahStartPage[s]) surahStartPage[s] = page;
    console.log(`[${page}/${to}] ${surahs.length} surah(s), ${lines.length} lines  ok`);
    await sleep(150);
  }

  // Only (re)write the index on a full build so a partial run can't truncate it.
  if (from === 1 && to === TOTAL_PAGES) {
    await fs.writeFile(
      path.join(OUT_DIR, "index.json"),
      JSON.stringify({
        totalPages: TOTAL_PAGES,
        pages: index.slice(1),
        surahStartPage,
      })
    );
    console.log("\n✓ wrote index.json");
  }
  console.log("\n✓ mushaf build done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
