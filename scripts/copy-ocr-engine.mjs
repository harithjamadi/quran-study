/**
 * Copies the tesseract.js OCR engine (worker + WASM cores) from node_modules
 * into public/ so the app serves it same-origin — no runtime CDN dependency,
 * which keeps the "images never leave your device" promise airtight and lets
 * OCR work offline / behind CDN-blocking networks.
 *
 * Runs automatically via predev/prebuild. Output is gitignored
 * (public/ocr/engine/) because it is derived from node_modules.
 *
 * The destination directory is versioned (v<tesseract.js>-<tesseract.js-core>)
 * so /ocr/engine/* can be served with immutable cache headers: an upgrade
 * changes the URL instead of the bytes. src/lib/ocr-tesseract.ts must point at
 * the same directory — OCR_ENGINE_DIR there is asserted against the installed
 * versions here, so a dependency upgrade fails the build until both agree.
 *
 * Only the three *-lstm cores are copied: the app initialises tesseract with
 * OEM 1 (LSTM_ONLY), so the worker requests exactly one of
 * relaxedsimd-lstm / simd-lstm / lstm based on the browser's WASM features.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const readVersion = (pkg) =>
  JSON.parse(fs.readFileSync(path.join(root, "node_modules", pkg, "package.json"), "utf8")).version;

const tesseractVersion = readVersion("tesseract.js");
const coreVersion = readVersion("tesseract.js-core");
const engineDir = `/ocr/engine/v${tesseractVersion}-${coreVersion}`;

// Fail the build loudly if the app constant drifted from the installed deps.
const appSource = fs.readFileSync(path.join(root, "src", "lib", "ocr-tesseract.ts"), "utf8");
const declared = appSource.match(/OCR_ENGINE_DIR = "([^"]+)"/)?.[1];
if (declared !== engineDir) {
  console.error(
    `[copy-ocr-engine] OCR_ENGINE_DIR mismatch:\n` +
      `  src/lib/ocr-tesseract.ts declares ${declared ?? "(not found)"}\n` +
      `  installed packages require   ${engineDir}\n` +
      `Update OCR_ENGINE_DIR after upgrading tesseract.js / tesseract.js-core.`
  );
  process.exit(1);
}

const files = [
  ["tesseract.js/dist/worker.min.js", "worker.min.js"],
  ["tesseract.js-core/tesseract-core-lstm.wasm.js", "tesseract-core-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js"],
  [
    "tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js",
    "tesseract-core-relaxedsimd-lstm.wasm.js",
  ],
];

const destRoot = path.join(root, "public", engineDir);
fs.mkdirSync(destRoot, { recursive: true });

let copied = 0;
for (const [from, to] of files) {
  const src = path.join(root, "node_modules", ...from.split("/"));
  const dest = path.join(destRoot, to);
  const srcStat = fs.statSync(src);
  const destStat = fs.existsSync(dest) ? fs.statSync(dest) : null;
  if (destStat && destStat.size === srcStat.size) continue; // already current
  fs.copyFileSync(src, dest);
  copied += 1;
}

console.log(
  `[copy-ocr-engine] ${engineDir} ready (${copied ? `${copied} file(s) copied` : "up to date"})`
);
