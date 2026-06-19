import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RecognizeClient } from "./RecognizeClient";

vi.mock("@/lib/ayah-recognition", () => ({
  loadAyahIndex: vi.fn().mockResolvedValue({}),
  recognizeAyah: vi.fn().mockReturnValue({
    key: "1:2",
    text: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ",
    score: 5,
    confidence: 1,
    matchedTerms: 4,
    queryTerms: 4,
  }),
}));

// TajweedText fetches surah data + uses portals; stub it to a marker.
vi.mock("@/components/TajweedText", () => ({
  TajweedText: ({ surahNumber, ayahNumber }: { surahNumber: number; ayahNumber: number }) => (
    <div data-testid="tajweed">{`${surahNumber}:${ayahNumber}`}</div>
  ),
}));

describe("RecognizeClient", () => {
  beforeEach(() => vi.clearAllMocks());

  it("recognizes pasted text and renders the Tajweed breakdown", async () => {
    render(<RecognizeClient />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "الحمد لله رب العالمين" },
    });
    fireEvent.click(screen.getByRole("button", { name: /recognize|kenal pasti/i }));

    await waitFor(() => expect(screen.getByTestId("tajweed")).toHaveTextContent("1:2"));
  });
});
