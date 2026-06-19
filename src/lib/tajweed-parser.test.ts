import { describe, it, expect } from "vitest";
import { stripTajweedAnnotations, segmentWordStarts, parseTajweedVerse } from "./tajweed-parser";

describe("stripTajweedAnnotations", () => {
  it("reduces [code[text] spans to their inner text", () => {
    const raw = "بِسْمِ [h:1[ٱ]للَّهِ [h:2[ٱ][l[ل]رَّحْمَ[n[ـٰ]نِ";
    expect(stripTajweedAnnotations(raw)).toBe("بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ");
  });

  it("returns plain text unchanged", () => {
    expect(stripTajweedAnnotations("ٱلْحَمْدُ لِلَّهِ")).toBe("ٱلْحَمْدُ لِلَّهِ");
  });
});

describe("segmentWordStarts", () => {
  it("maps each segment to the 1-based word index it begins in", () => {
    // "بِسْمِ " (word 1) → "ٱ"+"للَّهِ" (word 2)
    const segments = parseTajweedVerse("بِسْمِ [h:1[ٱ]للَّهِ");
    expect(segmentWordStarts(segments)).toEqual([1, 2, 2]);
  });
});
