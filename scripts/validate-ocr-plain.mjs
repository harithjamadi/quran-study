/**
 * OCR validation on PLAIN naskh renders (Traditional Arabic font, GDI+),
 * i.e. what a user photographs from a translation book, learning material,
 * or a plain-text Quran app — as opposed to ornate KFGQPC mushaf script.
 *
 *   node scripts/validate-ocr-plain.mjs        (expects .cache/ocr-plain/*.png)
 *
 * Retrieval goes through scripts/lib/retrieval-mirror.mjs — the same
 * normalize → word-break → search → alignment-re-rank path the app uses.
 */
import { createWorker, PSM } from "tesseract.js";
import { readFile, readdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { buildRetrieval, onlyArabic } from "./lib/retrieval-mirror.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LANG = process.env.OCR_LANG ?? "ara";

async function main() {
  const corpus = JSON.parse(
    await readFile(path.join(root, "public", "data", "corpus", "ayat.json"), "utf8")
  );
  const retrieval = buildRetrieval(corpus);

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
    const { tokens, hits: results, top } = retrieval.recognize(text);
    if (process.env.OCR_DEBUG) {
      const rasm = tokens.join(" ");
      console.log(`      rasm(${rasm.length}): ${JSON.stringify(rasm.slice(0, 60))} hits=${results.length}`);
      console.log(`      codepoints: ${[...text.slice(0, 12)].map((c) => c.codePointAt(0).toString(16)).join(" ")}`);
    }
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
