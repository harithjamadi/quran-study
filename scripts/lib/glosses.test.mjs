import { describe, it, expect, vi } from "vitest";
import {
  normalize,
  buildGlossTables,
  resolveGloss,
  cleanEnGloss,
} from "./glosses.mjs";

describe("normalize", () => {
  it("strips short-vowel marks and shadda", () => {
    expect(normalize("إِنَّ")).toBe("إن");
    expect(normalize("إِن")).toBe("إن");
    expect(normalize(null)).toBe("");
  });
});

describe("buildGlossTables + resolveGloss — minimal pairs", () => {
  // The whole point: إِنَّ ("indeed") and إِنْ ("if") differ only by a shadda,
  // which normalize() strips. They must NOT be conflated. This is the exact bug
  // a real user hit — the word إِنَّ was being taught as "if".
  const RAW = { "إِنّ": "indeed / surely", "إِن": "if" };
  const tables = buildGlossTables(RAW, "TEST", () => {});

  it("resolves inna (with shadda) to 'indeed', never 'if'", () => {
    const gloss = resolveGloss(tables, { lemma: "إِنّ", text: "إِنَّ", pos: "P" });
    expect(gloss).toBe("indeed / surely");
    expect(gloss).not.toBe("if");
  });

  it("resolves in (no shadda) to 'if'", () => {
    expect(resolveGloss(tables, { lemma: "إِن", text: "وَإِن", pos: "P" })).toBe("if");
  });

  it("keeps both lemmas distinct in the exact table", () => {
    expect(tables.exact["إِنّ"]).toBe("indeed / surely");
    expect(tables.exact["إِن"]).toBe("if");
  });
});

describe("buildGlossTables — collision handling", () => {
  it("first definition wins and a diacritized collision does NOT warn", () => {
    const warn = vi.fn();
    buildGlossTables({ "إِنّ": "indeed", "إِن": "if" }, "TEST", warn);
    // Both are recoverable via the exact layer, so no warning.
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns when a BARE key is shadowed by an earlier entry (genuinely ambiguous)", () => {
    const warn = vi.fn();
    // A diacritized key sets the normalized bucket, then a later *bare* key lands
    // in the same bucket. The exact layer can't recover the bare one, so it's a
    // real silent-override risk worth flagging.
    buildGlossTables({ "مِن": "from", "من": "shadowed" }, "TEST", warn);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("first definition wins for the normalized fallback", () => {
    const t = buildGlossTables({ من: "from", "مْن": "second" }, "TEST", () => {});
    expect(t.norm["من"]).toBe("from");
  });
});

describe("resolveGloss — precedence and fallback", () => {
  const tables = buildGlossTables(
    { "رَبّ": "Lord", "من|P": "from", "من|N": "who" },
    "TEST",
    () => {}
  );

  it("disambiguates a homograph by part of speech", () => {
    expect(resolveGloss(tables, { lemma: "من", text: "مِن", pos: "P" })).toBe("from");
    expect(resolveGloss(tables, { lemma: "من", text: "مَن", pos: "N" })).toBe("who");
  });

  it("falls back through the normalized table when diacritics differ", () => {
    // Dataset carries a different vowelling than our curated key, but the
    // diacritic-stripped form still matches.
    expect(resolveGloss(tables, { lemma: "رَبُّ", text: "رَبِّ", pos: "N" })).toBe("Lord");
  });

  it("returns null when nothing matches", () => {
    expect(resolveGloss(tables, { lemma: "زقم", text: "زقم", pos: "N" })).toBeNull();
  });
});

describe("cleanEnGloss", () => {
  it("strips a leading conjunction artifact from a per-word gloss", () => {
    expect(cleanEnGloss("And when")).toBe("when");
    expect(cleanEnGloss("Then he said")).toBe("he said");
    expect(cleanEnGloss("so that they may commit")).toBe("that they may commit");
  });

  it("never reduces a standalone conjunction to empty", () => {
    expect(cleanEnGloss("and")).toBe("and");
    expect(cleanEnGloss("then")).toBe("then");
  });

  it("leaves a clean gloss untouched", () => {
    expect(cleanEnGloss("indeed / surely")).toBe("indeed / surely");
    expect(cleanEnGloss(null)).toBeNull();
  });
});
