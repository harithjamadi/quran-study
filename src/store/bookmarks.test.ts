import { describe, it, expect, beforeEach } from "vitest";
import { useBookmarks } from "./bookmarks";

function reset() {
  useBookmarks.setState({ bookmarks: [], lastRead: null });
}

describe("bookmarks store", () => {
  beforeEach(reset);

  const sample = {
    surahNumber: 2,
    ayahNumber: 255,
    surahName: "Al-Baqarah",
    ayahText: "[arabic]",
    translation: "[english]",
  };

  it("toggles a bookmark on/off", () => {
    const added = useBookmarks.getState().toggle(sample);
    expect(added).toBe(true);
    expect(useBookmarks.getState().bookmarks).toHaveLength(1);
    expect(useBookmarks.getState().has(2, 255)).toBe(true);

    const removed = useBookmarks.getState().toggle(sample);
    expect(removed).toBe(false);
    expect(useBookmarks.getState().bookmarks).toHaveLength(0);
    expect(useBookmarks.getState().has(2, 255)).toBe(false);
  });

  it("does not duplicate when adding the same verse twice", () => {
    useBookmarks.getState().add(sample);
    useBookmarks.getState().add(sample);
    expect(useBookmarks.getState().bookmarks).toHaveLength(1);
  });

  it("updates notes by id", () => {
    useBookmarks.getState().add(sample);
    const id = useBookmarks.getState().bookmarks[0].id;
    useBookmarks.getState().updateNote(id, "remember this");
    expect(useBookmarks.getState().bookmarks[0].note).toBe("remember this");
  });

  it("clears all bookmarks", () => {
    useBookmarks.getState().add(sample);
    useBookmarks.getState().add({ ...sample, ayahNumber: 1 });
    useBookmarks.getState().clearAll();
    expect(useBookmarks.getState().bookmarks).toHaveLength(0);
  });

  it("records last-read position", () => {
    useBookmarks.getState().setLastRead({
      surahNumber: 18,
      ayahNumber: 10,
      surahName: "Al-Kahf",
      timestamp: 1700000000000,
    });
    expect(useBookmarks.getState().lastRead?.surahNumber).toBe(18);
  });
});
