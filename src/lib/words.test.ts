import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  loadSurahWords,
  loadRootOccurrences,
  loadRootIndex,
  _resetWordCaches,
} from "./words";

const realFetch = globalThis.fetch;

describe("words loader", () => {
  beforeEach(() => {
    _resetWordCaches();
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("loads and caches surah word data by number", async () => {
    let calls = 0;
    const data = {
      "1": [{ i: 1, text: "x", translit: null, gloss: null, root: null, lemma: null, pos: null }],
    };
    globalThis.fetch = vi.fn(async () => {
      calls++;
      return { ok: true, json: async () => data } as Response;
    });

    const first = await loadSurahWords(7);
    expect(first).toEqual(data);
    expect(calls).toBe(1);

    const second = await loadSurahWords(7);
    expect(second).toEqual(data);
    expect(calls).toBe(1); // cache hit, no extra fetch
  });

  it("returns null when the surah file is missing", async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, json: async () => null } as Response));
    const result = await loadSurahWords(999);
    expect(result).toBeNull();
  });

  it("URI-encodes Arabic root when building the occurrence URL", async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    globalThis.fetch = spy as unknown as typeof fetch;
    await loadRootOccurrences("رحم");
    const calledUrl = String(spy.mock.calls[0][0]);
    expect(calledUrl).toContain("/data/roots/");
    expect(calledUrl).toContain(encodeURIComponent("رحم"));
  });

  it("caches the root index across calls", async () => {
    let calls = 0;
    const idx = { "رحم": { count: 339, lemmas: ["رَحْمٰن"] } };
    globalThis.fetch = vi.fn(async () => {
      calls++;
      return { ok: true, json: async () => idx } as Response;
    });

    const a = await loadRootIndex();
    expect(a?.["رحم"].count).toBe(339);
    const b = await loadRootIndex();
    expect(b).toBe(a);
    expect(calls).toBe(1);
  });
});
