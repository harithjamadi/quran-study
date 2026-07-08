"use client";

/**
 * Live OCR engine: encode the captured frame to a compact JPEG and post it to
 * the same-origin /api/recognize route, which runs a vision model and returns
 * the transcribed Arabic. The image leaves the device (unlike the retired
 * on-device engine) — the route processes it in memory and does not store it.
 */
import { type OcrEngine, OcrError, type OcrErrorReason } from "@/lib/ocr";

const ENDPOINT = "/api/recognize";

/** Downscale ceiling before upload. The model reads a page comfortably at this
 *  size; smaller uploads mean less latency and cost and stay under the route's
 *  byte cap even for multi-megapixel phone photos. */
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

/** Route error codes → typed reasons the UI can act on. Anything else (5xx,
 *  unexpected) reads as a generic server failure. */
const STATUS_REASON: Readonly<Record<number, OcrErrorReason>> = {
  413: "too-large",
  415: "bad-image",
  429: "rate-limited",
};

/** ImageData → downscaled JPEG blob via canvas. Kept separate from the network
 *  step so the transport mapping below stays unit-testable without a canvas. */
function toJpegBlob(image: ImageData): Promise<Blob> {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const w = Math.max(1, Math.round(image.width * scale));
  const h = Math.max(1, Math.round(image.height * scale));

  const src = document.createElement("canvas");
  src.width = image.width;
  src.height = image.height;
  src.getContext("2d")!.putImageData(image, 0, 0);

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, w, h);

  return new Promise((resolve, reject) =>
    out.toBlob(
      (b) => (b ? resolve(b) : reject(new OcrError("bad-image"))),
      "image/jpeg",
      JPEG_QUALITY
    )
  );
}

/**
 * Post an encoded image to the recognize route and return its text. Rejects
 * with a typed OcrError for a failed request (offline) or any non-2xx status,
 * so callers can distinguish "couldn't reach/allow the request" from the "200
 * but empty text" case (the model saw no readable Arabic).
 */
export async function _postImage(body: BlobPart): Promise<string> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: body as BodyInit,
    });
  } catch {
    throw new OcrError("offline");
  }
  if (!res.ok) {
    throw new OcrError(STATUS_REASON[res.status] ?? "server");
  }
  const data = (await res.json().catch(() => null)) as { text?: string } | null;
  return (data?.text ?? "").trim();
}

export const cloudVisionOcrEngine: OcrEngine = {
  async recognize(image: ImageData): Promise<string> {
    return _postImage(await toJpegBlob(image));
  },
};
