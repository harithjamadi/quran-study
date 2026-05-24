"use client";

import Link from "next/link";
import { useBookmarks } from "@/store/bookmarks";
import { useLearning } from "@/store/learning";
import { UI_STRINGS } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";

export function LastReadCard() {
  const hydrated = useHydrated();
  const lastRead = useBookmarks((s) => s.lastRead);
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];

  if (!hydrated || !lastRead) return null;

  return (
    <section className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--accent)]/30 bg-gradient-to-r from-[color:var(--accent-soft)]/60 via-[color:var(--surface)] to-[color:var(--surface)] p-5 sm:p-6 flex items-center gap-4">
      <div
        className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 rounded-full bg-[color:var(--accent)] text-white grid place-items-center shadow-[var(--shadow)]"
        aria-hidden
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
          <path d="M4 4h12a4 4 0 014 4v12l-5-3-5 3-5-3-5 3V4z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="eyebrow text-[color:var(--accent-strong)] mb-1">{t.last_continue}</p>
        <p className="display text-[length:var(--text-lg)] truncate" style={{ fontWeight: 600 }}>
          {lastRead.surahName}{" "}
          <span className="text-[color:var(--muted)] font-normal">· {t.last_verse} {lastRead.ayahNumber}</span>
        </p>
        <p className="text-xs text-[color:var(--muted)] mt-0.5">
          {t.last_read} {formatDate(lastRead.timestamp)}
        </p>
      </div>
      <Link
        href={`/surah/${lastRead.surahNumber}#v${lastRead.ayahNumber}`}
        className="touch-target shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--accent)] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[color:var(--accent-strong)] hover:shadow-[var(--shadow-glow)] transition-all active:scale-95"
      >
        {t.last_resume}
        <span aria-hidden>→</span>
      </Link>
    </section>
  );
}
