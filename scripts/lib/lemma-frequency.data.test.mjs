import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalize } from "./glosses.mjs";

// Validates the *shipped* data file (the one the learning engine teaches from),
// not just the build logic. These assertions guard the purity of meaning: a
// regression here means real users would be taught a wrong gloss for a Quranic
// word, so the bar is correctness, not coverage.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, "../../public/data/lemma-frequency.json");
const lemmas = JSON.parse(readFileSync(DATA, "utf8"));
const byLemma = new Map(lemmas.map((e) => [e.lemma, e]));
// Diacritic-agnostic lookup — robust against the exact vowelling/codepoint order
// of a lemma in the dataset.
const byBare = new Map(lemmas.map((e) => [normalize(e.lemma), e]));

describe("lemma-frequency.json — meaning integrity", () => {
  it("teaches إِنَّ (inna) as 'indeed', never 'if'", () => {
    const inna = byLemma.get("إِنّ");
    expect(inna).toBeDefined();
    expect(inna.en.toLowerCase()).toContain("indeed");
    expect(inna.en.toLowerCase()).not.toContain("if");
    expect(inna.ms).toBe("sesungguhnya");
  });

  it("teaches إِنْ (in) as the conditional 'if'", () => {
    const inWord = byLemma.get("إِن");
    expect(inWord).toBeDefined();
    expect(inWord.en).toBe("if");
    expect(inWord.ms.toLowerCase()).toContain("jika");
    // inna and in must be two distinct entries with different glosses.
    expect(inWord.en).not.toBe(byLemma.get("إِنّ").en);
  });

  it("gives the core conjunctions their dictionary meaning", () => {
    expect(byLemma.get("و").en).toBe("and");
    expect(byLemma.get("و").ms).toBe("dan");
    expect(byLemma.get("ف").en).toBe("so / then");
  });

  it("spot-checks a few high-frequency sacred words", () => {
    expect(byBare.get("الله").en.toLowerCase()).toContain("allah");
    expect(byBare.get("رب").en.toLowerCase()).toContain("lord");
  });

  it("never ships an English gloss that opens with a conjunction artifact", () => {
    const offenders = lemmas.filter((e) => /^(And|Then|But)\s/.test(e.en || ""));
    expect(offenders.map((e) => `${e.lemma}=${e.en}`)).toEqual([]);
  });

  it("never ships an empty English gloss", () => {
    const empty = lemmas.filter((e) => e.en !== null && !String(e.en).trim());
    expect(empty).toHaveLength(0);
  });
});
