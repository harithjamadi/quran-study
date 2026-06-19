// Build public/data/corpus/ayat.json from the annotated tajweed edition.
// Run: node scripts/build-corpus.mjs
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TAJWEED_DIR = join(ROOT, "public/data/tajweed");
const OUT = join(ROOT, "public/data/corpus/ayat.json");

// Same reduction as stripTajweedAnnotations: drop [code[ openers and ] closers,
// keeping inner text. Build-time mirror of the runtime helper.
const TAG_OPEN = /\[[a-z][a-z0-9]*(?::[0-9]+)?\[/g;
function strip(raw) {
  return raw.replace(TAG_OPEN, "").replace(/\]/g, "");
}

const out = [];
for (let s = 1; s <= 114; s++) {
  const data = JSON.parse(await readFile(join(TAJWEED_DIR, `${s}.json`), "utf8"));
  for (const [ayah, raw] of Object.entries(data)) {
    out.push({ key: `${s}:${ayah}`, text: strip(raw).replace(/\s+/g, " ").trim() });
  }
}

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(out));
console.log(`Wrote ${out.length} ayat to ${OUT}`);
