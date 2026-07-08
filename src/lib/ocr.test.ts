import { describe, it, expect } from "vitest";
import { stubOcrEngine, OcrError } from "./ocr";

describe("stubOcrEngine", () => {
  it("conforms to the OcrEngine interface and returns empty text", async () => {
    // The stub ignores its argument; cast a placeholder so the test does not
    // depend on a DOM `ImageData` global being present in the test environment.
    const img = { width: 1, height: 1, data: new Uint8ClampedArray(4) } as ImageData;
    await expect(stubOcrEngine.recognize(img)).resolves.toBe("");
  });
});

describe("OcrError", () => {
  it("carries a typed reason and is an Error instance", () => {
    const err = new OcrError("rate-limited");
    expect(err).toBeInstanceOf(Error);
    expect(err.reason).toBe("rate-limited");
    expect(err.name).toBe("OcrError");
  });
});
