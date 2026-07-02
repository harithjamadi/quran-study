/**
 * OCR validation on PLAIN naskh renders (Traditional Arabic font, GDI+),
 * i.e. what a user photographs from a translation book, learning material,
 * or a plain-text Quran app — as opposed to ornate KFGQPC mushaf script.
 *
 *   node scripts/validate-ocr-plain.mjs        (expects .cache/ocr-plain/*.png)
 */
import { createWorker, PSM } from "tesseract.js";
import MiniSearch from "minisearch";
import { readFile, readdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LANG = process.env.OCR_LANG ?? "ara";

// Escaped form of the class in src/lib/arabic-normalize.ts — raw Arabic
// combining marks inside a regex literal are easily corrupted by bidi editing.
const MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL = /ـ/g;
const FOLDS = [[/[آأإٱ]/g, "ا"], [/ؤ/g, "و"], [/ئ/g, "ي"], [/ى/g, "ي"], [/ة/g, "ه"]];
function toRasm(text) {
  let out = text.normalize("NFC").replace(MARKS, "").replace(TATWEEL, "");
  for (const [re, to] of FOLDS) out = out.replace(re, to);
  return out.replace(/\s+/g, " ").trim();
}
const tokenize = (s) => s.split(/\s+/).filter(Boolean);
const onlyArabic = (s) => s.replace(/[^؀-ۿ\s]/g, " ").replace(/\s+/g, " ").trim();

async function main() {
  const corpus = JSON.parse(
    await readFile(path.join(root, "public", "data", "corpus", "ayat.json"), "utf8")
  );
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
  const noAlif = (s) => s.replace(/ا/g, "");
  index.addAll(corpus.map((a) => {
    const rasm = toRasm(a.text);
    for (const w of tokenize(rasm)) {
      vocab.add(w);
      vocabNoAlif.add(noAlif(w));
    }
    return { ...a, rasm };
  }));
  // Same merged-word splitting as src/lib/ayah-recognition.ts:
  // exact vocab first, alif-folded as fallback.
  function splitWith(token, known, depth) {
    if (known(token)) return [token];
    if (depth === 1 || token.length < 4) return null;
    for (let i = token.length - 2; i >= 2; i--) {
      if (!known(token.slice(0, i))) continue;
      const rest = splitWith(token.slice(i), known, depth - 1);
      if (rest) return [token.slice(0, i), ...rest];
    }
    return null;
  }
  const exact = (w) => vocab.has(w);
  const folded = (w) => vocab.has(w) || vocabNoAlif.has(noAlif(w));
  const splitMerged = (token, depth = 3) =>
    splitWith(token, exact, depth) ?? splitWith(token, folded, depth);
  const expandQuery = (rasm) =>
    tokenize(rasm).flatMap((t) => splitMerged(t) ?? [t]).join(" ");

  const worker = await createWorker(LANG, 1, {
    langPath: path.join(root, "public", "ocr", "tessdata", "v1"),
    gzip: false,
    cachePath: path.join(root, ".cache", "ocr-validate"),
  });
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    preserve_interword_spaces: "1",
    user_defined_dpi: "300",
  });

  const dir = path.join(root, ".cache", "ocr-plain");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".png"));
  let hits = 0;
  for (const f of files) {
    const key = f.replace(".png", "").replace("_", ":");
    const start = Date.now();
    const { data } = await worker.recognize(path.join(dir, f));
    const text = onlyArabic(data.text);
    const rasm = expandQuery(toRasm(text));
    const results = index.search(rasm);
    if (process.env.OCR_DEBUG) {
      console.log(`      rasm(${rasm.length}): ${JSON.stringify(rasm.slice(0, 60))} hits=${results.length}`);
      console.log(`      codepoints: ${[...text.slice(0, 12)].map((c) => c.codePointAt(0).toString(16)).join(" ")}`);
    }
    const top = results[0];
    const ok = top?.id === key;
    if (ok) hits++;
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${key.padEnd(7)} -> ${String(top?.id ?? "-").padEnd(7)}` +
      ` ocr_conf=${Math.round(data.confidence)} ${Date.now() - start}ms\n      ocr: ${text.slice(0, 90)}`
    );
  }
  await worker.terminate();
  console.log(`\nplain-print top-1: ${hits}/${files.length} (lang=${LANG})`);
  process.exit(hits === files.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
