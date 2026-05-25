#!/usr/bin/env node
// Fetches the quran-tajweed edition from alquran.cloud and saves each surah
// as /public/data/tajweed/{n}.json  →  { [ayahNumberInSurah]: taggedVerseString }
//
// Usage:
//   node scripts/build-tajweed.mjs             # all 114 surahs
//   node scripts/build-tajweed.mjs --only=82   # single surah
//   node scripts/build-tajweed.mjs --from=82   # from surah 82 to 114

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(PROJECT_ROOT, "public", "data", "tajweed");

const API_BASE = "https://api.alquran.cloud/v1";
const EDITION = "quran-tajweed";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
      return res;
    } catch (err) {
      lastErr = err;
      const delay = 800 * Math.pow(2, i);
      console.warn(`  retry ${i + 1}/${attempts} in ${delay}ms — ${err.message}`);
      await sleep(delay);
    }
  }
  throw lastErr;
}

async function fetchSurah(surahNumber) {
  const url = `${API_BASE}/surah/${surahNumber}/${EDITION}`;
  const res = await fetchWithRetry(url);
  const json = await res.json();
  const ayahs = json?.data?.ayahs;
  if (!Array.isArray(ayahs)) throw new Error(`No ayahs in response for surah ${surahNumber}`);

  // Build { [numberInSurah]: text } — text contains embedded [code[text] tags
  const data = {};
  for (const ayah of ayahs) {
    data[String(ayah.numberInSurah)] = ayah.text;
  }
  return data;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  // Parse CLI flags
  const only = (() => {
    const a = process.argv.find((x) => x.startsWith("--only="));
    return a ? [Number(a.slice("--only=".length))] : null;
  })();

  const from = (() => {
    const a = process.argv.find((x) => x.startsWith("--from="));
    return a ? Number(a.slice("--from=".length)) : 1;
  })();

  const surahs = only ?? Array.from({ length: 114 - from + 1 }, (_, i) => i + from);

  let ok = 0;
  let fail = 0;

  for (const n of surahs) {
    const outPath = path.join(OUT_DIR, `${n}.json`);

    // Skip if file already exists (re-run safety)
    try {
      await fs.access(outPath);
      console.log(`[${n}/114] surah ${n}… skipped (exists)`);
      ok++;
      continue;
    } catch {
      // doesn't exist — proceed
    }

    process.stdout.write(`[${n}/114] surah ${n}… `);
    try {
      const data = await fetchSurah(n);
      await fs.writeFile(outPath, JSON.stringify(data));
      console.log(`ok (${Object.keys(data).length} ayahs)`);
      ok++;
    } catch (err) {
      console.error(`FAILED — ${err.message}`);
      fail++;
    }

    await sleep(300);
  }

  console.log(`\n✓ done. ${ok} ok, ${fail} failed.`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
