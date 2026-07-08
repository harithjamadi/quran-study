import { describe, it, expect, vi, afterEach } from "vitest";
import { _postImage } from "./ocr-cloud";
import { OcrError } from "./ocr";

function mockFetch(res: Partial<Response> & { json?: () => Promise<unknown> }) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res));
}

describe("_postImage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns trimmed text on 200", async () => {
    mockFetch({ ok: true, status: 200, json: async () => ({ text: "  بِسْمِ ٱللَّهِ  " }) });
    await expect(_postImage("x")).resolves.toBe("بِسْمِ ٱللَّهِ");
  });

  it("returns '' when the model found no text (200, empty)", async () => {
    mockFetch({ ok: true, status: 200, json: async () => ({ text: "" }) });
    await expect(_postImage("x")).resolves.toBe("");
  });

  it("returns '' when 200 body lacks a text field", async () => {
    mockFetch({ ok: true, status: 200, json: async () => ({}) });
    await expect(_postImage("x")).resolves.toBe("");
  });

  it.each([
    [429, "rate-limited"],
    [413, "too-large"],
    [415, "bad-image"],
    [500, "server"],
    [502, "server"],
  ] as const)("maps status %i to OcrError(%s)", async (status, reason) => {
    mockFetch({ ok: false, status, json: async () => ({}) });
    await expect(_postImage("x")).rejects.toMatchObject({ reason });
  });

  it("throws OcrError('offline') when the request fails to send", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(_postImage("x")).rejects.toBeInstanceOf(OcrError);
    await expect(_postImage("x")).rejects.toMatchObject({ reason: "offline" });
  });
});
