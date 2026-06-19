import { describe, it, expect } from "vitest";
import { stripTajweedAnnotations } from "./tajweed-parser";

describe("stripTajweedAnnotations", () => {
  it("reduces [code[text] spans to their inner text", () => {
    const raw = "بِسْمِ [h:1[ٱ]للَّهِ [h:2[ٱ][l[ل]رَّحْمَ[n[ـٰ]نِ";
    expect(stripTajweedAnnotations(raw)).toBe("بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ");
  });

  it("returns plain text unchanged", () => {
    expect(stripTajweedAnnotations("ٱلْحَمْدُ لِلَّهِ")).toBe("ٱلْحَمْدُ لِلَّهِ");
  });
});
