"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { TRANSLATIONS } from "@/lib/editions";
import { useSettings } from "@/store/settings";

interface Props {
  current: string;
  surahNumber: number;
}

export function TranslationPicker({ current, surahNumber }: Props) {
  const router = useRouter();
  const setTranslation = useSettings((s) => s.setTranslation);
  const preferred = useSettings((s) => s.translationId);
  const syncedRef = useRef(false);

  useEffect(() => {
    if (syncedRef.current) return;
    syncedRef.current = true;
    if (preferred && preferred !== current) {
      const qs = `?translation=${encodeURIComponent(preferred)}`;
      router.replace(`/surah/${surahNumber}${qs}`, { scroll: false });
    }
  }, [preferred, current, surahNumber, router]);

  const onChange = (next: string) => {
    setTranslation(next);
    const qs = `?translation=${encodeURIComponent(next)}`;
    router.replace(`/surah/${surahNumber}${qs}`, { scroll: false });
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
