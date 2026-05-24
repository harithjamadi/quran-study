import { describe, it, expect } from "vitest";
import { toArabicDigits, ayahRef, parseAyahRef, classNames } from "./format";

describe("toArabicDigits", () => {
  it("converts ASCII digits to Arabic-Indic digits", () => {
    expect(toArabicDigits(0)).toBe("٠");
    expect(toArabicDigits(7)).toBe("٧");
    expect(toArabicDigits(2025)).toBe("٢٠٢٥");
  });
  it("leaves non-digit characters alone", () => {
    expect(toArabicDigits("v12-3")).toBe("v١٢-٣");
  });
});

describe("ayahRef / parseAyahRef", () => {
  it("round-trips ref strings", () => {
    expect(ayahRef(2, 255)).toBe("2:255");
    expect(parseAyahRef("2:255")).toEqual({ surah: 2, ayah: 255 });
  });
  it("returns null for malformed refs", () => {
    expect(parseAyahRef("not-a-ref")).toBeNull();
    expect(parseAyahRef("2:")).toBeNull();
    expect(parseAyahRef(":255")).toBeNull();
  });
});

describe("classNames", () => {
  it("joins truthy class names", () => {
    expect(classNames("a", false, "b", null, undefined, "c")).toBe("a b c");
  });
});
