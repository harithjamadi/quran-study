import { describe, it, expect } from "vitest";
import {
  parseMorphology,
  mergeSurah,
  buildRootOccurrences,
} from "./morphology.mjs";

// Real lines from the first three words of Al-Fatiha.
const SAMPLE = `1:1:1:1\tبِ\tP\tP|PREF|LEM:ب
1:1:1:2\tسْمِ\tN\tROOT:سمو|LEM:اسْم|M|GEN
1:1:2:1\tٱللَّهِ\tN\tPN|ROOT:أله|LEM:اللَّه|GEN
1:1:3:1\tٱل\tP\tDET|PREF|LEM:ال
1:1:3:2\tرَّحْمَٰنِ\tN\tROOT:رحم|LEM:رَحْمٰن|MS|GEN|ADJ
1:5:1:1\tإِيَّاكَ\tN\tPRON|LEM:إِيّا|2MS
`;

describe("parseMorphology", () => {
  it("collapses multi-segment words to the stem's root + lemma", () => {
    const map = parseMorphology(SAMPLE);
    expect(map.get("1:1:1")).toEqual({
      root: "سمو",
      lemma: "اسْم",
      pos: "N",
      segCount: 2,
    });
    expect(map.get("1:1:3")).toEqual({
      root: "رحم",
      lemma: "رَحْمٰن",
      pos: "N",
      segCount: 2,
    });
  });

  it("keeps lemma but null root for words without a triliteral root", () => {
    const map = parseMorphology(SAMPLE);
    const w = map.get("1:5:1");
    expect(w?.root).toBeNull();
    expect(w?.lemma).toBe("إِيّا");
  });

  it("ignores blank lines and comments", () => {
    const m = parseMorphology("\n# comment\n\n" + SAMPLE);
    expect(m.size).toBe(4);
  });
});

describe("mergeSurah", () => {
  const morph = parseMorphology(SAMPLE);
  const quranWords = {
    "1": [
      { position: 1, text: "بِسْمِ", translit: "bis'mi", gloss: "In (the) name" },
      { position: 2, text: "ٱللَّهِ", translit: "l-lahi", gloss: "(of) Allah" },
    ],
    "5": [
      { position: 1, text: "إِيَّاكَ", translit: "iyyāka", gloss: "You alone" },
    ],
  };

  it("attaches root/lemma/pos to each word by surah:ayah:position", () => {
    const merged = mergeSurah(morph, quranWords, 1);
    expect(merged[1][0]).toMatchObject({
      i: 1,
      text: "بِسْمِ",
      gloss: "In (the) name",
      root: "سمو",
      lemma: "اسْم",
      pos: "N",
    });
    expect(merged[1][1]).toMatchObject({ root: "أله", lemma: "اللَّه" });
  });

  it("returns null root/lemma when no morphology entry exists", () => {
    const merged = mergeSurah(morph, { "9": [{ position: 1, text: "x", translit: null, gloss: null }] }, 1);
    expect(merged[9][0]).toMatchObject({ root: null, lemma: null, pos: null });
  });
});

describe("buildRootOccurrences", () => {
  it("indexes each rooted word by its 3-letter root", () => {
    const all = {
      "1": {
        "1": [
          { i: 1, text: "بِسْمِ", root: "سمو", lemma: "اسْم", gloss: "name", translit: null, pos: "N" },
          { i: 2, text: "ٱللَّهِ", root: "أله", lemma: "اللَّه", gloss: "Allah", translit: null, pos: "N" },
        ],
        "3": [
          { i: 1, text: "ٱلرَّحْمَـٰنِ", root: "رحم", lemma: "رَحْمٰن", gloss: "Merciful", translit: null, pos: "N" },
          { i: 2, text: "ٱلرَّحِيمِ", root: "رحم", lemma: "رَحِيم", gloss: "Compassionate", translit: null, pos: "N" },
        ],
      },
    };
    const map = buildRootOccurrences(all);
    expect(map.get("رحم")?.length).toBe(2);
    expect(map.get("أله")?.length).toBe(1);
    expect(map.get("رحم")?.[0]).toMatchObject({ s: 1, a: 3, i: 1, lemma: "رَحْمٰن" });
  });

  it("skips words with null root", () => {
    const all = {
      "1": { "5": [{ i: 1, text: "إِيَّاكَ", root: null, lemma: "إِيّا", gloss: "You", translit: null, pos: "N" }] },
    };
    const map = buildRootOccurrences(all);
    expect(map.size).toBe(0);
  });
});
