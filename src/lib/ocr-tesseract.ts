"use client";

/**
 * On-device Arabic OCR via tesseract.js (WASM). Everything runs in the
 * browser and every asset is served same-origin: the engine (worker + WASM
 * core, copied from node_modules by scripts/copy-ocr-engine.mjs) and the
 * Arabic traineddata both live under public/ocr/, so no image and no request
 * ever leaves the device/site — and OCR keeps working offline once cached.
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

/**
 * Same-origin engine assets, in a directory versioned by the installed
 * tesseract.js/tesseract.js-core versions so /ocr/engine/* can be served
 * immutable. scripts/copy-ocr-engine.mjs asserts this constant matches the
 * installed packages and fails the build otherwise — bump it when upgrading.
 */
const OCR_ENGINE_DIR = "/ocr/engine/v7.0.0-7.0.0";

/**
 * Versioned model directory: doubles as the IndexedDB cache key prefix
 * (tesseract caches traineddata as `${cachePath}/ara.traineddata`). Shipping
 * a new model — e.g. the future fine-tuned Uthmani one — means placing it
 * under v2 and bumping this, which invalidates both the HTTP cache (new URL)
 * and the IndexedDB cache (new key) for returning visitors.
 */
const OCR_MODEL_DIR = "/ocr/tessdata/v1";

/** A stuck download or a pathological image must never hang the UI; past
 *  this we terminate the worker and report "no text" (a fresh worker is
 *  created on the next attempt). Generous: a midrange phone reads a capped
 *  2400px frame in a few seconds, and first use also downloads ~5 MB. */
const RECOGNIZE_TIMEOUT_MS = 60_000;

/** The WASM heap holds tens of MB — meaningful on low-end phones. Tear the
 *  worker down after a quiet period; re-warming is cheap (HTTP cache +
 *  IndexedDB) and happens off the user's critical path. */
const IDLE_TERMINATE_MS = 90_000;

/** Longest image side fed to tesseract. Camera frames are already ≤1080p;
 *  this guards multi-megapixel uploads, where full-size canvases would
 *  allocate hundreds of MB and stall or crash mobile browsers. Text stays
 *  comfortably readable at this size. */
const MAX_DIMENSION = 2400;

let workerPromise: Promise<Worker> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | undefined;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker, PSM } = await import("tesseract.js");
      const worker = await createWorker("ara", 1, {
        workerPath: `${OCR_ENGINE_DIR}/worker.min.js`,
        corePath: OCR_ENGINE_DIR,
        // Self-hosted, uncompressed (formula: `${langPath}/${lang}.traineddata`).
        langPath: OCR_MODEL_DIR,
        cachePath: OCR_MODEL_DIR,
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

/** Drop the current worker (best-effort) so the next call starts fresh. */
function discardWorker() {
  const stale = workerPromise;
  workerPromise = null;
  stale?.then((w) => w.terminate()).catch(() => {});
}

function scheduleIdleTeardown() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(discardWorker, IDLE_TERMINATE_MS);
}

/** Keep only Arabic-block characters — tesseract sometimes hallucinates
 *  Latin/digits from page furniture, which would pollute retrieval. */
const onlyArabic = (s: string) =>
  s.replace(/[^؀-ۿ\s]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Flatten onto white (uploads can be transparent PNGs — Leptonica drops
 * alpha, turning them white-on-white), normalise size (up for thumbnails,
 * down for multi-megapixel photos), and boost contrast. Returns a canvas
 * tesseract can consume directly.
 */
function preprocess(image: ImageData): HTMLCanvasElement {
  // Tesseract's LSTM wants a comfortable glyph size; small camera frames
  // and thumbnails benefit from 2x, huge photos must come down (memory).
  let scale = image.width < 1000 ? 2 : 1;
  const longest = Math.max(image.width, image.height) * scale;
  if (longest > MAX_DIMENSION) scale *= MAX_DIMENSION / longest;

  const src = document.createElement("canvas");
  src.width = image.width;
  src.height = image.height;
  src.getContext("2d")!.putImageData(image, 0, 0);

  const pad = 24;
  const w = Math.max(1, Math.round(image.width * scale));
  const h = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w + pad * 2;
  canvas.height = h + pad * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, pad, pad, w, h);

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
    clearTimeout(idleTimer); // don't tear the worker down mid-recognition
    let timedOut: ReturnType<typeof setTimeout> | undefined;
    try {
      const attempt = (async () => {
        const worker = await getWorker();
        const { data } = await worker.recognize(preprocess(image));
        return onlyArabic(data.text ?? "");
      })();
      // If the timeout wins the race, `attempt` rejects later (its worker got
      // terminated) with nobody awaiting it — mark it handled.
      attempt.catch(() => {});
      const result = await Promise.race([
        attempt,
        new Promise<never>((_, reject) => {
          timedOut = setTimeout(() => reject(new Error("ocr-timeout")), RECOGNIZE_TIMEOUT_MS);
        }),
      ]);
      return result;
    } catch (err) {
      // A timed-out worker may still be grinding (or wedged) — replace it so
      // the next attempt starts clean. Other failures also read as "no text".
      if (err instanceof Error && err.message === "ocr-timeout") discardWorker();
      return "";
    } finally {
      clearTimeout(timedOut);
      scheduleIdleTeardown();
    }
  },
};
