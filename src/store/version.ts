"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { APP_VERSION, compareVersions } from "@/lib/app-version";

/**
 * Tracks the last app version whose changelog the user has seen, so we can
 * show a subtle "What's New" dot after an update. Kept in its own store
 * (separate from settings) so resetting preferences never clears it.
 */
interface VersionState {
  /** Newest version the user has opened the changelog for. Null = never. */
  lastSeenVersion: string | null;
  /** Mark the current version as seen (call when the changelog is viewed). */
  markSeen: () => void;
  /** Silently record the current version without it counting as an update. */
  initSeen: () => void;
}

export const useVersion = create<VersionState>()(
  persist(
    (set, get) => ({
      lastSeenVersion: null,
      markSeen: () => set({ lastSeenVersion: APP_VERSION }),
      initSeen: () => {
        if (get().lastSeenVersion === null) set({ lastSeenVersion: APP_VERSION });
      },
    }),
    {
      name: "mubin.version.v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

/**
 * True when there's a newer release than the one the user last viewed.
 * First-time users (null) see no dot — they have no past to catch up on.
 */
export function hasUnseenRelease(lastSeenVersion: string | null): boolean {
  if (lastSeenVersion === null) return false;
  return compareVersions(lastSeenVersion, APP_VERSION) < 0;
}
