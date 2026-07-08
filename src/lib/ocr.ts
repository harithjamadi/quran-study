/**
 * OCR seam for the camera/upload path. The live engine (ocr-cloud.ts) sends the
 * captured frame to a same-origin route that runs a vision model, then returns
 * the raw Arabic text for the closed-corpus retrieval to resolve to a verse.
 * The stub remains for tests and as the interface's reference no-op.
 *
 * Contract: `recognize` resolves to the recognized Arabic text, or "" when the
 * model found no readable Arabic in the image. Transport/guard failures
 * (offline, rate limited, rejected upload, server error) reject with an
 * `OcrError` so the UI can tell the user the actual fix — distinct from the
 * empty-string "nothing to read" case.
 */
export interface OcrEngine {
  recognize(image: ImageData): Promise<string>;
}

/** Why a recognition attempt could not complete (as opposed to completing with
 *  no text). Each maps to a specific, actionable message in the UI. */
export type OcrErrorReason =
  | "offline" // network unreachable / request never landed
  | "rate-limited" // 429 from the route's abuse guard
  | "too-large" // 413 — image exceeded the size cap
  | "bad-image" // 415 — not a decodable image
  | "server"; // 5xx / model failure

export class OcrError extends Error {
  constructor(readonly reason: OcrErrorReason) {
    super(reason);
    this.name = "OcrError";
  }
}

export const stubOcrEngine: OcrEngine = {
  async recognize(): Promise<string> {
    return "";
  },
};
