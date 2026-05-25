/**
 * Root-Based Progression
 *
 * When a user correctly reviews a lemma, words that share the same Arabic root
 * receive a small stability boost. The intuition: knowing كَتَبَ (he wrote)
 * makes كِتَاب (book) easier to retain, so we extend their review intervals
 * proportionally to the answer quality.
 *
 * Only Review-state cards (state=2) are eligible for boosts — learning-phase
 * cards are not affected because their stability is still settling.
 */

import type { LemmaState } from "@/lib/learning";
import type { RootIndexEntry } from "@/lib/words";

const DAY_MS = 86_400_000;

/** Stability multiplier applied to root siblings on a correct answer. */
const BOOST: Record<"good" | "easy", number> = {
  good: 1.08,
  easy: 1.15,
};

/**
 * Compute partial LemmaState updates for lemmas sharing the same root as
 * the just-graded lemma. Returns only the changed fields for each sibling.
 *
 * Does nothing for "again" grades — a forgotten word shouldn't affect siblings.
 */
export function computeRootBoosts(
  gradedLemmaKey: string,
  grade: "again" | "good" | "easy",
  currentStates: Record<string, LemmaState>,
  rootEntry: RootIndexEntry | undefined
): Record<string, Pick<LemmaState, "stability" | "due" | "scheduledDays">> {
  if (!rootEntry || grade === "again") return {};

  const factor = BOOST[grade];
  const boosts: Record<string, Pick<LemmaState, "stability" | "due" | "scheduledDays">> = {};
  const now = Date.now();

  for (const sibling of rootEntry.lemmas) {
    if (sibling === gradedLemmaKey) continue;
    const s = currentStates[sibling];
    // Only boost cards that have graduated to Review — don't interfere with
    // the learning-phase scheduling which FSRS handles precisely.
    if (!s || s.state !== 2) continue;

    const newStability = s.stability * factor;
    const lastR = s.lastReview > 0 ? s.lastReview : now;
    // Never pull the due date earlier — only push it further out.
    const newDue = Math.max(s.due, lastR + newStability * DAY_MS);

    boosts[sibling] = {
      stability: newStability,
      due: newDue,
      scheduledDays: Math.round(newStability),
    };
  }

  return boosts;
}
