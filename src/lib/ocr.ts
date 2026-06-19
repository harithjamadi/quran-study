/**
 * OCR seam for the camera path. The real Arabic OCR model (a separate Python/ML
 * track, P3) will implement OcrEngine and run on-device via ONNX/WASM. Until
 * then, stubOcrEngine is a no-op placeholder so the camera UI and recognition
 * flow can be built and tested independently of the model.
 */
export interface OcrEngine {
  recognize(image: ImageData): Promise<string>;
}

export const stubOcrEngine: OcrEngine = {
  async recognize(): Promise<string> {
    return "";
  },
};
