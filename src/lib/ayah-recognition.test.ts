import { describe, it, expect } from "vitest";
import { buildAyahIndex, recognizeAyah, type AyahEntry } from "./ayah-recognition";

const CORPUS: AyahEntry[] = [
  { key: "1:1", text: "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ" },
  { key: "1:2", text: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ" },
  { key: "112:1", text: "قُلْ هُوَ ٱللَّهُ أَحَدٌ" },
];

describe("recognizeAyah", () => {
  const index = buildAyahIndex(CORPUS);

  it("matches an exact ayah regardless of diacritics", () => {
    const r = recognizeAyah(index, "الحمد لله رب العالمين");
    expect(r?.key).toBe("1:2");
    expect(r?.confidence).toBeGreaterThan(0.9);
  });

  it("matches from a partial, noisy fragment", () => {
    const r = recognizeAyah(index, "رب العلمين"); // missing alif in العالمين
    expect(r?.key).toBe("1:2");
  });

  it("returns null for non-Quranic gibberish", () => {
    expect(recognizeAyah(index, "xyzzy plugh")).toBeNull();
  });
});
