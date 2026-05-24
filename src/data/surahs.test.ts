import { describe, it, expect } from "vitest";
import { SURAHS, getSurah } from "./surahs";

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
