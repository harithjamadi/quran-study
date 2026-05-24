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
    <section className="card p-5 flex items-center gap-4 border-[color:var(--accent)]/30 bg-[color:var(--accent-soft)]/40">
      <div className="h-10 w-10 rounded-full bg-[color:var(--accent)] text-white grid place-items-center" aria-hidden>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
          <path d="M4 4h12a4 4 0 014 4v12l-5-3-5 3-5-3-5 3V4z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[color:var(--muted)]">{t.last_continue}</p>
        <p className="font-medium truncate">
          {lastRead.surahName} · {t.last_verse} {lastRead.ayahNumber}
        </p>
        <p className="text-xs text-[color:var(--muted)]">
          {t.last_read} {formatDate(lastRead.timestamp)}
        </p>
      </div>
      <Link
        href={`/surah/${lastRead.surahNumber}#v${lastRead.ayahNumber}`}
        className="rounded-full bg-[color:var(--accent)] text-white px-4 py-2 text-sm hover:bg-[color:var(--accent-strong)]"
      >
        {t.last_resume}
      </Link>
    </section>
  );
}
