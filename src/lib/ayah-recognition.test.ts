import { describe, it, expect, afterEach, vi } from "vitest";
import {
  buildAyahIndex,
  recognizeAyah,
  loadAyahIndex,
  _resetAyahIndexCache,
  type AyahEntry,
} from "./ayah-recognition";

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

  it("reports the matched word range within the ayah (1-based)", () => {
    expect(recognizeAyah(index, "رب العالمين")?.matchedRange).toEqual([3, 4]);
    expect(recognizeAyah(index, "الحمد لله رب العالمين")?.matchedRange).toEqual([1, 4]);
  });

  it("anchors repeated words to the aligned occurrence, not the first", () => {
    // 112:4 has لم twice after rasm; a naive per-word indexOf would pin both
    // query words to the first occurrence. The window alignment must not.
    const repeatIndex = buildAyahIndex([
      { key: "94:5", text: "فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا" },
      { key: "94:6", text: "إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا" },
      { key: "109:2", text: "لَآ أَعْبُدُ مَا تَعْبُدُونَ" },
      { key: "109:4", text: "وَلَآ أَنَا۠ عَابِدٌ مَّا عَبَدتُّمْ" },
    ]);
    // Tail fragment of 94:5 — words 2..4, not re-anchored to word 1.
    const r = recognizeAyah(repeatIndex, "مع العسر يسرا");
    expect(r?.matchedRange).toEqual([2, 4]);
  });

  it("confidence is matchedTerms/queryTerms (boundary for the UI gate)", () => {
    // Two-word query with one word matched sits exactly at 0.5.
    const r = recognizeAyah(index, "قل زخرف");
    expect(r?.key).toBe("112:1");
    expect(r?.confidence).toBe(0.5);
  });

  it("returns null for non-Quranic gibberish", () => {
    expect(recognizeAyah(index, "xyzzy plugh")).toBeNull();
  });

  it("splits words that OCR/typing merged together (closed-corpus word-break)", () => {
    // OCR frequently drops the inter-word space: ربالعالمين, اللهاحد.
    expect(recognizeAyah(index, "الحمد لله ربالعالمين")?.key).toBe("1:2");
    const r = recognizeAyah(index, "قل هو اللهاحد");
    expect(r?.key).toBe("112:1");
    expect(r?.confidence).toBeGreaterThanOrEqual(0.75);
  });
});

describe("loadAyahIndex", () => {
  afterEach(() => {
    _resetAyahIndexCache();
    vi.restoreAllMocks();
  });

  it("fetches the corpus once and builds a queryable index", async () => {
    const corpus = [{ key: "112:1", text: "قُلْ هُوَ ٱللَّهُ أَحَدٌ" }];
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(corpus)));

    const index = await loadAyahIndex();
    await loadAyahIndex(); // second call should not re-fetch

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(recognizeAyah(index!, "قل هو الله احد")?.key).toBe("112:1");
  });
});
