"use client";

import { TRANSLATIONS } from "@/lib/editions";
import { useSettings } from "@/store/settings";

interface Props {
  current: string;
  surahNumber: number;
}

export function TranslationPicker({ current, surahNumber }: Props) {
  const setTranslation = useSettings((s) => s.setTranslation);

  const onChange = (next: string) => {
    // Update the preference only. The reader observes the store and swaps the
    // translation client-side — no navigation, no remount, no server round-trip
    // (that round-trip is what used to make switching lag badly).
    setTranslation(next);
    // Keep the URL shareable without triggering a server re-render.
    if (typeof window !== "undefined") {
      const qs = next === "en.sahih" ? "" : `?translation=${encodeURIComponent(next)}`;
      window.history.replaceState(null, "", `/surah/${surahNumber}${qs}`);
    }
  };

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-[color:var(--muted)]">Translation</span>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5 text-sm focus:outline-none focus:border-[color:var(--accent)]"
        aria-label="Choose translation"
      >
        {TRANSLATIONS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.language} — {t.label}
          </option>
        ))}
      </select>
    </label>
  );
}
