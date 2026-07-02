"use client";

/**
 * On-device Arabic OCR via tesseract.js (WASM). Everything runs in the
 * browser: the Arabic traineddata is self-hosted (public/ocr/tessdata,
 * cached in IndexedDB after first use) and no image ever leaves the device.
 * The engine WASM + worker come from jsDelivr pinned to the installed
 * version — the same runtime-CDN pattern as the mushaf page fonts.
 *
 * Validated (scripts/validate-ocr-plain.mjs): near-perfect on clear plain
 * naskh print (books, screenshots, learning material) — the closed-corpus
 * retrieval absorbs the residual errors (merged words, odd letters).
 * Ornate KFGQPC mushaf script is NOT reliably readable with stock
 * traineddata (scripts/validate-ocr.mjs, ~3/14); that path needs the
 * fine-tuned Uthmani model milestone.
 */
import type { OcrEngine } from "@/lib/ocr";
import type { Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker, PSM } = await import("tesseract.js");
      const worker = await createWorker("ara", 1, {
        // Self-hosted, uncompressed (formula: `${langPath}/${lang}.traineddata`).
        langPath: "/ocr/tessdata",
        gzip: false,
      });
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });
      return worker;
    })().catch((err) => {
      // Allow a retry on the next call instead of caching the failure.
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

/** Keep only Arabic-block characters — tesseract sometimes hallucinates
 *  Latin/digits from page furniture, which would pollute retrieval. */
const onlyArabic = (s: string) =>
  s.replace(/[^؀-ۿ\s]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Flatten onto white (uploads can be transparent PNGs — Leptonica drops
 * alpha, turning them white-on-white), upscale small frames, and boost
 * contrast. Returns a canvas tesseract can consume directly.
 */
function preprocess(image: ImageData): HTMLCanvasElement {
  // Tesseract's LSTM wants a comfortable glyph size; small camera frames
  // and thumbnails benefit from 2x.
  const scale = image.width < 1000 ? 2 : 1;

  const src = document.createElement("canvas");
  src.width = image.width;
  src.height = image.height;
  src.getContext("2d")!.putImageData(image, 0, 0);

  const pad = 24;
  const canvas = document.createElement("canvas");
  canvas.width = image.width * scale + pad * 2;
  canvas.height = image.height * scale + pad * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, pad, pad, image.width * scale, image.height * scale);

  // Grayscale + mild contrast stretch.
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = frame.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const boosted = Math.max(0, Math.min(255, (gray - 128) * 1.25 + 128));
    d[i] = d[i + 1] = d[i + 2] = boosted;
    d[i + 3] = 255;
  }
  ctx.putImageData(frame, 0, 0);
  return canvas;
}

export const tesseractOcrEngine: OcrEngine = {
  async recognize(image: ImageData): Promise<string> {
    try {
      const worker = await getWorker();
      const { data } = await worker.recognize(preprocess(image));
      return onlyArabic(data.text ?? "");
    } catch {
      // OCR is best-effort — a load/recognize failure reads as "no text".
      return "";
    }
  },
};
