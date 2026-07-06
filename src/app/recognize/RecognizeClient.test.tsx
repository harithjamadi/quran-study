import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RecognizeClient } from "./RecognizeClient";

const recognizeAyahMock = vi.fn();
vi.mock("@/lib/ayah-recognition", () => ({
  loadAyahIndex: vi.fn().mockResolvedValue({}),
  recognizeAyah: (...args: unknown[]) => recognizeAyahMock(...args),
}));

const MATCH = {
  key: "1:2",
  text: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ",
  score: 5,
  confidence: 1,
  matchedTerms: 4,
  queryTerms: 4,
};

// TajweedText fetches surah data + uses portals; stub it to a marker.
vi.mock("@/components/TajweedText", () => ({
  TajweedText: ({ surahNumber, ayahNumber }: { surahNumber: number; ayahNumber: number }) => (
    <div data-testid="tajweed">{`${surahNumber}:${ayahNumber}`}</div>
  ),
}));

function recognize(value = "الحمد لله رب العالمين") {
  render(<RecognizeClient />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: /recognize|kenal pasti/i }));
}

describe("RecognizeClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recognizeAyahMock.mockReturnValue(MATCH);
  });

  it("recognizes pasted text and renders the Tajweed breakdown", async () => {
    recognize();
    await waitFor(() => expect(screen.getByTestId("tajweed")).toHaveTextContent("1:2"));
  });

  it("links the result to the verse in its surah context", async () => {
    recognize();
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /read in context|baca dalam konteks/i })).toHaveAttribute(
        "href",
        "/surah/1#v2"
      )
    );
  });

  it("flags a low-confidence match for double-checking, hides it when confident", async () => {
    recognizeAyahMock.mockReturnValue({ ...MATCH, confidence: 0.5, matchedTerms: 2 });
    recognize();
    await waitFor(() => expect(screen.getByText(/close match|padanan hampir/i)).toBeInTheDocument());
  });

  it("shows no caution note on a confident match", async () => {
    recognize();
    await waitFor(() => expect(screen.getByTestId("tajweed")).toBeInTheDocument());
    expect(screen.queryByText(/close match|padanan hampir/i)).toBeNull();
  });
});
