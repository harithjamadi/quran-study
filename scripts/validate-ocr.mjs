/**
 * OCR pipeline validation — run manually, not part of CI (uses network).
 *
 *   node scripts/validate-ocr.mjs
 *
 * Fetches real rendered ayah images (cdn.islamic.network, Uthmani script),
 * runs them through tesseract.js with the same traineddata the app self-hosts
 * (public/ocr/tessdata/v1/ara.traineddata), then feeds the OCR output through
 * the same rasm-normalize + MiniSearch retrieval the app uses, and reports
 * top-1 retrieval accuracy. The bar: OCR only has to get enough of the
 * consonant skeleton right for the closed-corpus retrieval to land on the
 * correct verse — not to transcribe perfectly.
 */
import { createWorker, PSM } from "tesseract.js";
import { Jimp } from "jimp";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { buildRetrieval, onlyArabic } from "./lib/retrieval-mirror.mjs";

// Knobs for A/B runs:  OCR_LANG=ara|ara_best  OCR_SCALE=1|2|3  OCR_PSM=6|7|3
const LANG = process.env.OCR_LANG ?? "ara";
const SCALE = Number(process.env.OCR_SCALE ?? "1");
const PSM_MODE = process.env.OCR_PSM ?? PSM.SINGLE_BLOCK;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = path.join(root, ".cache", "ocr-validate");

/* Mix of short/long, common/rare, across the mushaf. */
const CASES = [
  "1:1", "1:2", "1:5", "2:255", "2:286", "18:10", "36:1", "36:2",
  "55:13", "67:1", "112:1", "112:2", "113:1", "114:1",
];

async function fetchImage(key) {
  const [s, a] = key.split(":");
  const file = path.join(cacheDir, `${s}_${a}.png`);
  try {
    return await readFile(file);
  } catch {
    const url = `https://cdn.islamic.network/quran/images/high-resolution/${s}_${a}.png`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(file, buf);
    return buf;
  }
}

/** Simple flatten + grayscale for the CDN renders (clean digital images —
 *  the app's adaptive binarization targets uneven camera lighting, which
 *  these never have, so it is not replicated here).
 *  Critical: these CDN renders are TRANSPARENT PNGs (dark glyphs, alpha-0
 *  background) — Leptonica drops alpha, so without flattening onto white
 *  first, tesseract effectively sees white-on-white. */
async function preprocess(buf, scale) {
  const img = await Jimp.read(buf);
  // Flatten onto white with a margin (tesseract segments better with one).
  const pad = 32;
  const flat = new Jimp({ width: img.width + pad * 2, height: img.height + pad * 2, color: 0xffffffff });
  flat.composite(img, pad, pad);
  if (scale !== 1) flat.resize({ w: flat.width * scale });
  flat.greyscale().contrast(0.3);
  if (process.env.OCR_BIN) flat.threshold({ max: Number(process.env.OCR_BIN) });
  return flat.getBuffer("image/png");
}

/** Simulate the real camera use case — a photo covering several consecutive
 *  lines — by stacking consecutive ayah renders into one image. Success =
 *  the top retrieval hits land inside the photographed passage. */
async function stackedTest(retrieval, worker, keys) {
  const imgs = [];
  for (const key of keys) imgs.push(await Jimp.read(await fetchImage(key)));
  const width = Math.max(...imgs.map((i) => i.width)) + 64;
  const height = imgs.reduce((h, i) => h + i.height, 0) + 64;
  const page = new Jimp({ width, height, color: 0xffffffff });
  let y = 32;
  for (const img of imgs) {
    page.composite(img, Math.round((width - img.width) / 2), y);
    y += img.height;
  }
  page.greyscale().contrast(0.3);
  const buf = await page.getBuffer("image/png");

  const start = Date.now();
  const { data } = await worker.recognize(buf);
  const text = onlyArabic(data.text);
  const { hits: results } = retrieval.recognize(text);
  const top3 = results.slice(0, 3).map((r) => r.id);
  const hit = top3.some((id) => keys.includes(id));
  console.log(
    `${hit ? "PASS" : "FAIL"}  stacked [${keys.join(", ")}] -> top3: ${top3.join(", ")} (${Date.now() - start}ms)` +
    `\n      ocr: ${text.slice(0, 110)}`
  );
  return hit;
}

async function main() {
  await mkdir(cacheDir, { recursive: true });

  const corpus = JSON.parse(
    await readFile(path.join(root, "public", "data", "corpus", "ayat.json"), "utf8")
  );
  const retrieval = buildRetrieval(corpus);
  console.log(`corpus: ${corpus.length} ayat indexed`);

  console.log(`lang=${LANG} scale=${SCALE} psm=${PSM_MODE}`);
  const worker = await createWorker(LANG, 1, {
    langPath: path.join(root, "public", "ocr", "tessdata", "v1"),
    gzip: false,
    cachePath: cacheDir,
  });
  await worker.setParameters({
    tessedit_pageseg_mode: String(PSM_MODE),
    preserve_interword_spaces: "1",
    user_defined_dpi: "300",
  });

  if (process.env.OCR_STACKED) {
    let stackHits = 0;
    const stacks = [
      ["2:255", "2:256", "2:257"],
      ["67:1", "67:2", "67:3"],
      ["112:1", "112:2", "112:3", "112:4"],
      ["1:1", "1:2", "1:3", "1:4", "1:5"],
      ["36:1", "36:2", "36:3", "36:4"],
    ];
    for (const keys of stacks) {
      if (await stackedTest(retrieval, worker, keys)) stackHits++;
    }
    console.log(`\nstacked (multi-line photo simulation): ${stackHits}/${stacks.length}`);
    await worker.terminate();
    process.exit(stackHits === stacks.length ? 0 : 1);
  }

  let hits = 0;
  const t0 = Date.now();
  for (const key of CASES) {
    const img = await preprocess(await fetchImage(key), SCALE);
    const start = Date.now();
    const { data } = await worker.recognize(img);
    const text = onlyArabic(data.text);
    const ms = Date.now() - start;

    const { tokens, top } = retrieval.recognize(text);
    const matched = Object.keys(top?.match ?? {}).length;
    const queryTerms = tokens.length;
    const conf = queryTerms ? Math.min(1, matched / queryTerms) : 0;
    const ok = top?.id === key;
    if (ok) hits++;
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${key.padEnd(7)} -> ${String(top?.id ?? "-").padEnd(7)}` +
      ` conf=${conf.toFixed(2)} ocr_conf=${Math.round(data.confidence)} ${ms}ms` +
      `\n      ocr: ${text.slice(0, 90)}`
    );
  }
  await worker.terminate();
  console.log(`\ntop-1 retrieval: ${hits}/${CASES.length}  (${Date.now() - t0}ms total)`);
  process.exit(hits === CASES.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
