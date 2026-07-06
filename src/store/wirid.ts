"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Daily wirid progress — tasbih-style tap counts per routine item, reset each
 * calendar day (adhkar are a daily practice; yesterday's counts are history,
 * not backlog). Routine ids: "mathurat-morning", "mathurat-evening", "manzil".
 */
interface WiridState {
  /** Local calendar day the counts belong to, yyyy-mm-dd. */
  day: string;
  /** Tap counts keyed `${routineId}/${itemId}`. */
  counts: Record<string, number>;
  /** Increment an item's count, capped at its repeat target. */
  increment: (routineId: string, itemId: string, target: number) => void;
  /** Clear one routine's counts (leaves other routines untouched). */
  resetRoutine: (routineId: string) => void;
}

function today(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Counts survive only for the day they were made. */
function freshCounts(state: { day: string; counts: Record<string, number> }): Record<string, number> {
  return state.day === today() ? state.counts : {};
}

export const useWirid = create<WiridState>()(
  persist(
    (set, get) => ({
      day: today(),
      counts: {},
      increment: (routineId, itemId, target) => {
        const counts = freshCounts(get());
        const key = `${routineId}/${itemId}`;
        const next = Math.min(target, (counts[key] ?? 0) + 1);
        set({ day: today(), counts: { ...counts, [key]: next } });
      },
      resetRoutine: (routineId) => {
        const counts = freshCounts(get());
        const kept = Object.fromEntries(
          Object.entries(counts).filter(([k]) => !k.startsWith(`${routineId}/`))
        );
        set({ day: today(), counts: kept });
      },
    }),
    {
      name: "mubin.wirid.v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

/** Read an item's count for today (0 if the stored day is stale). */
export function itemCount(state: Pick<WiridState, "day" | "counts">, routineId: string, itemId: string): number {
  if (state.day !== today()) return 0;
  return state.counts[`${routineId}/${itemId}`] ?? 0;
}
