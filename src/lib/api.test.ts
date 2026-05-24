import { describe, it, expect } from "vitest";
import { audioUrlForAyah, audioUrlForSurah } from "./api";

describe("audio URL builders", () => {
  it("builds verse-level audio URLs against the public CDN", () => {
    const url = audioUrlForAyah(262, "ar.alafasy");
    expect(url).toMatch(/^https:\/\/cdn\.islamic\.network\/quran\/audio\/128\/ar\.alafasy\/262\.mp3$/);
  });
  it("uses the default reciter when none is supplied", () => {
    expect(audioUrlForAyah(1)).toContain("/ar.alafasy/1.mp3");
  });
  it("builds surah-level audio URLs", () => {
    const url = audioUrlForSurah(112, "ar.husary");
    expect(url).toContain("/quran/audio-surah/128/ar.husary/112.mp3");
  });
});
