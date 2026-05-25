/**
 * Part-of-speech color system for syntactic highlighting.
 *
 * The word data uses a single-character POS tag derived from the Quranic
 * Arabic Corpus:  V = verb,  N = nominal (noun/adj/…),  P = particle.
 *
 * Colors are kept subtle — low-opacity underlines — so Arabic text remains
 * readable while giving learners an intuitive feel for sentence structure
 * without requiring explicit grammar lessons.
 */

export type PosTag = "V" | "N" | "P" | null;

/**
 * Returns Tailwind utility classes for the colored underline of a word.
 * Falls back to no decoration for unknown/null POS.
 */
export function posUnderlineClass(pos: PosTag): string {
  switch (pos) {
    case "V":
      return "underline decoration-blue-400/50 dark:decoration-blue-400/60 decoration-[1.5px] underline-offset-[3px]";
    case "N":
      return "underline decoration-emerald-500/50 dark:decoration-emerald-400/60 decoration-[1.5px] underline-offset-[3px]";
    case "P":
      // Particles are extremely common; use a faint amber so they don't dominate
      return "underline decoration-amber-400/35 dark:decoration-amber-400/40 decoration-[1.5px] underline-offset-[3px]";
    default:
      return "";
  }
}

/** Short human-readable label for a POS tag (bilingual). */
export function posLabel(pos: PosTag, lang: "en" | "ms"): string {
  if (lang === "ms") {
    switch (pos) {
      case "V": return "Kata Kerja";
      case "N": return "Kata Nama";
      case "P": return "Kata Tugas";
      default: return "—";
    }
  }
  switch (pos) {
    case "V": return "Verb";
    case "N": return "Noun";
    case "P": return "Particle";
    default: return "—";
  }
}

/** Color badge class for the POS chip shown in WordPopover. */
export function posBadgeClass(pos: PosTag): string {
  switch (pos) {
    case "V": return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    case "N": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "P": return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    default: return "bg-[color:var(--border)] text-[color:var(--muted)]";
  }
}
