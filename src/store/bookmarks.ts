"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Bookmark, LastRead } from "@/lib/types";

interface BookmarksState {
  bookmarks: Bookmark[];
  lastRead: LastRead | null;
  add: (b: Omit<Bookmark, "id" | "createdAt">) => void;
  remove: (id: string) => void;
  toggle: (b: Omit<Bookmark, "id" | "createdAt">) => boolean;
  has: (surah: number, ayah: number) => boolean;
  updateNote: (id: string, note: string) => void;
  clearAll: () => void;
  setLastRead: (r: LastRead) => void;
}

function bookmarkId(surah: number, ayah: number): string {
  return `${surah}:${ayah}`;
}

export const useBookmarks = create<BookmarksState>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      lastRead: null,
      add: (b) => {
        const id = bookmarkId(b.surahNumber, b.ayahNumber);
        const existing = get().bookmarks.find((x) => x.id === id);
        if (existing) return;
        set({
          bookmarks: [
            ...get().bookmarks,
            { ...b, id, createdAt: Date.now() },
          ],
        });
      },
      remove: (id) => set({ bookmarks: get().bookmarks.filter((b) => b.id !== id) }),
      toggle: (b) => {
        const id = bookmarkId(b.surahNumber, b.ayahNumber);
        const list = get().bookmarks;
        if (list.some((x) => x.id === id)) {
          set({ bookmarks: list.filter((x) => x.id !== id) });
          return false;
        }
        set({ bookmarks: [...list, { ...b, id, createdAt: Date.now() }] });
        return true;
      },
      has: (surah, ayah) => {
        const id = bookmarkId(surah, ayah);
        return get().bookmarks.some((b) => b.id === id);
      },
      updateNote: (id, note) =>
        set({
          bookmarks: get().bookmarks.map((b) => (b.id === id ? { ...b, note } : b)),
        }),
      clearAll: () => set({ bookmarks: [] }),
      setLastRead: (r) => set({ lastRead: r }),
    }),
    {
      name: "noor.bookmarks.v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
