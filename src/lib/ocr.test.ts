import { describe, it, expect } from "vitest";
import { stubOcrEngine } from "./ocr";
import { _binarizeAdaptive } from "./ocr-tesseract";

describe("stubOcrEngine", () => {
  it("conforms to the OcrEngine interface and returns empty text for now", async () => {
    // The stub ignores its argument; cast a placeholder so the test does not
    // depend on a DOM `ImageData` global being present in the test environment.
    const img = { width: 1, height: 1, data: new Uint8ClampedArray(4) } as ImageData;
    await expect(stubOcrEngine.recognize(img)).resolves.toBe("");
  });
});

describe("_binarizeAdaptive", () => {
  it("keeps text black and paper white across an illumination gradient", () => {
    // Page lit from the left: background falls 230 → 90 across the width —
    // the regime where a single global threshold erases one side entirely.
    const w = 200;
    const h = 100;
    const d = new Uint8ClampedArray(w * h * 4);
    const bg = (x: number) => Math.round(230 - (140 * x) / w);
    const put = (x: number, y: number, v: number) => {
      const i = (y * w + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) put(x, y, bg(x));
    // 5x5 "glyphs" 60 below the local paper tone, one per side.
    for (let y = 48; y < 53; y++) {
      for (let x = 28; x < 33; x++) put(x, y, bg(x) - 60);
      for (let x = 168; x < 173; x++) put(x, y, bg(x) - 60);
    }

    _binarizeAdaptive(d, w, h);
    const at = (x: number, y: number) => d[(y * w + x) * 4];

    expect(at(30, 50)).toBe(0); // text on the bright side
    expect(at(170, 50)).toBe(0); // text deep in the shadow
    expect(at(10, 10)).toBe(255); // bright paper
    expect(at(190, 10)).toBe(255); // shadowed paper stays paper, not ink
  });

  it("matches a naive local-mean reference exactly (rolling-sum equivalence)", () => {
    // The shipped implementation slides box sums for O(width) memory; this
    // re-derives every pixel's clamped-window mean directly and must agree
    // bit-for-bit. Odd dimensions + seeded noise exercise all border paths.
    const w = 61;
    const h = 37;
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % 256;
    };
    const d = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < d.length; i += 4) {
      d[i] = rand();
      d[i + 1] = rand();
      d[i + 2] = rand();
      d[i + 3] = 255;
    }

    const gray = new Uint8Array(w * h);
    for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
      gray[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    }
    const half = Math.max(15, Math.floor(Math.min(w, h) / 8)) >> 1;
    const expected = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let count = 0;
        for (let yy = Math.max(0, y - half); yy <= Math.min(h - 1, y + half); yy++) {
          for (let xx = Math.max(0, x - half); xx <= Math.min(w - 1, x + half); xx++) {
            sum += gray[yy * w + xx];
            count++;
          }
        }
        expected[y * w + x] = gray[y * w + x] * count > sum - 10 * count ? 255 : 0;
      }
    }

    _binarizeAdaptive(d, w, h);
    for (let p = 0; p < gray.length; p++) {
      expect(d[p * 4]).toBe(expected[p]);
    }
  });
});
