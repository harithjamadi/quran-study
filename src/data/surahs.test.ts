import { describe, it, expect } from "vitest";
import { SURAHS, getSurah, globalAyahNumber } from "./surahs";

describe("SURAHS dataset", () => {
  it("contains exactly 114 chapters", () => {
    expect(SURAHS).toHaveLength(114);
  });
  it("is numbered 1..114 in order", () => {
    SURAHS.forEach((s, i) => expect(s.number).toBe(i + 1));
  });
  it("has only Meccan or Medinan revelation types", () => {
    for (const s of SURAHS) {
      expect(["Meccan", "Medinan"]).toContain(s.revelationType);
    }
  });
  it("has positive ayah counts", () => {
    for (const s of SURAHS) {
      expect(s.numberOfAyahs).toBeGreaterThan(0);
    }
  });
});

describe("getSurah", () => {
  it("finds a chapter by number", () => {
    const s = getSurah(1);
    expect(s?.englishName).toBe("Al-Fatihah");
    expect(s?.numberOfAyahs).toBe(7);
  });
  it("returns undefined for out-of-range numbers", () => {
    expect(getSurah(0)).toBeUndefined();
    expect(getSurah(115)).toBeUndefined();
  });
});

describe("globalAyahNumber", () => {
  it("maps the first ayah of the Quran to 1", () => {
    expect(globalAyahNumber(1, 1)).toBe(1);
  });
  it("maps 2:1 to 8 (after Al-Fatihah's 7 ayahs)", () => {
    expect(globalAyahNumber(2, 1)).toBe(8);
  });
  it("maps Ayat al-Kursi (2:255) to 262", () => {
    expect(globalAyahNumber(2, 255)).toBe(262);
  });
  it("maps the final ayah (114:6) to 6236", () => {
    expect(globalAyahNumber(114, 6)).toBe(6236);
  });
  it("has 6236 total ayahs across all surahs", () => {
    expect(SURAHS.reduce((n, s) => n + s.numberOfAyahs, 0)).toBe(6236);
  });
  it("returns 0 for out-of-range input", () => {
    expect(globalAyahNumber(0, 1)).toBe(0);
    expect(globalAyahNumber(115, 1)).toBe(0);
    expect(globalAyahNumber(1, 0)).toBe(0);
  });
});
