import { describe, it, expect } from "vitest";
import { toRasm } from "./arabic-normalize";

describe("toRasm", () => {
  it("strips harakat and tanwin", () => {
    expect(toRasm("بِسْمِ")).toBe("بسم");
    expect(toRasm("نَسْتَعِينُ")).toBe("نستعين");
  });

  it("strips shadda, sukun and superscript alif", () => {
    expect(toRasm("ٱلرَّحْمَـٰنِ")).toBe("الرحمن");
  });

  it("normalizes alif, hamza seats, alif-maqsura and ta-marbuta", () => {
    expect(toRasm("أُولَـٰئِكَ")).toBe("اوليك");
    expect(toRasm("عَلَىٰ")).toBe("علي");
    expect(toRasm("رَحْمَةٌ")).toBe("رحمه");
  });

  it("strips tatweel and collapses whitespace", () => {
    expect(toRasm("الـــرحمن   الرحيم")).toBe("الرحمن الرحيم");
  });
});
