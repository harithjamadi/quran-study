/**
 * OCR seam for the camera/upload path. The live engine is tesseract.js
 * running on-device (see ocr-tesseract.ts for accuracy envelope: solid on
 * plain naskh print, weak on ornate mushaf script pending the fine-tuned
 * Uthmanic model). The stub remains for tests and as the interface's
 * reference no-op.
 */
export interface OcrEngine {
  recognize(image: ImageData): Promise<string>;
}

export const stubOcrEngine: OcrEngine = {
  async recognize(): Promise<string> {
    return "";
  },
};
