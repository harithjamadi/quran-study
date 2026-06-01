import { describe, it, expect } from "vitest";
import { normalizeSearch, surahMatches } from "./search";

const yaseen = { number: 36, name: "يس", englishName: "Yaseen", englishNameTranslation: "Yaseen" };
const kawthar = { number: 108, name: "الكوثر", englishName: "Al-Kawthar", englishNameTranslation: "A River in Paradise" };
const nuh = { number: 71, name: "نوح", englishName: "Nuh", englishNameTranslation: "Noah" };
const fatihah = { number: 1, name: "الفاتحة", englishName: "Al-Fatihah", englishNameTranslation: "The Opening" };

describe("normalizeSearch", () => {
  it("folds e/i and collapses doubles (yaseen variants)", () => {
    const forms = ["Yaseen", "Yasin", "Yasiin", "yāsīn"].map(normalizeSearch);
    expect(new Set(forms).size).toBe(1);
  });

  it("folds w/u (kawthar variants)", () => {
    expect(normalizeSearch("kawthar")).toBe(normalizeSearch("kauthar"));
  });

  it("folds o/u (nuh variants)", () => {
    expect(normalizeSearch("nooh")).toBe(normalizeSearch("nuh"));
  });

  it("strips accents and punctuation", () => {
    expect(normalizeSearch("Al-Fātiḥah")).toBe(normalizeSearch("alfatihah"));
  });
});

describe("surahMatches", () => {
  it("matches spelling variants of Yaseen", () => {
    for (const q of ["yaseen", "yasin", "yasiin", "YASIN"]) {
      expect(surahMatches(yaseen, q)).toBe(true);
    }
  });

  it("matches Kawthar / Kauthar", () => {
    expect(surahMatches(kawthar, "kawthar")).toBe(true);
    expect(surahMatches(kawthar, "kauthar")).toBe(true);
  });

  it("matches Nuh / Nooh / Noah meaning", () => {
    expect(surahMatches(nuh, "nooh")).toBe(true);
    expect(surahMatches(nuh, "noah")).toBe(true);
  });

  it("matches partial and meaning", () => {
    expect(surahMatches(fatihah, "fatiha")).toBe(true);
    expect(surahMatches(fatihah, "opening")).toBe(true);
  });

  it("matches by surah number", () => {
    expect(surahMatches(yaseen, "36")).toBe(true);
    expect(surahMatches(yaseen, "37")).toBe(false);
  });

  it("matches Arabic script", () => {
    expect(surahMatches(fatihah, "الفاتحة")).toBe(true);
  });

  it("rejects non-matches", () => {
    expect(surahMatches(yaseen, "baqarah")).toBe(false);
  });

  it("empty query matches everything", () => {
    expect(surahMatches(yaseen, "")).toBe(true);
    expect(surahMatches(yaseen, "   ")).toBe(true);
  });
});
