"use client";

import Link from "next/link";
import { useBookmarks } from "@/store/bookmarks";
import { useLearning } from "@/store/learning";
import { UI_STRINGS } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { EmptyState } from "@/components/EmptyState";

export function BookmarksList() {
  const hydrated = useHydrated();
  const bookmarks = useBookmarks((s) => s.bookmarks);
  const remove = useBookmarks((s) => s.remove);
  const updateNote = useBookmarks((s) => s.updateNote);
  const clearAll = useBookmarks((s) => s.clearAll);
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];

  if (!hydrated) {
    return <p className="text-sm text-[color:var(--muted)] py-10 text-center">{UI_STRINGS.en.set_loading}</p>;
  }

  if (bookmarks.length === 0) {
    return (
      <EmptyState
        illustration="bookmark"
        title={t.book_empty}
        body={t.book_empty_hint}
        cta={{
          label: language === "ms" ? "Mula membaca" : "Start reading",
          href: "/surahs",
        }}
      />
    );
  }

  const sorted = [...bookmarks].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[color:var(--muted)]">
          {bookmarks.length} {t.vocab_tracked.split(" ")[1]}
        </p>
        <button
          onClick={() => {
            if (confirm(t.book_clear_conf)) clearAll();
          }}
          className="text-xs text-[color:var(--danger)] hover:underline"
        >
          {t.book_clear}
        </button>
      </div>
      {sorted.map((b) => (
        <article key={b.id} className="card p-5">
          <header className="flex items-center justify-between gap-2 mb-2">
            <Link
              href={`/surah/${b.surahNumber}#v${b.ayahNumber}`}
              className="font-medium hover:text-[color:var(--accent-strong)]"
            >
              {b.surahName} · {b.surahNumber}:{b.ayahNumber}
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[color:var(--muted)]">
                {formatDate(b.createdAt)}
              </span>
              <button
                onClick={() => remove(b.id)}
                aria-label={t.book_remove}
                className="text-xs text-[color:var(--danger)] hover:underline"
              >
                {t.book_remove}
              </button>
            </div>
          </header>
          <p className="arabic text-right text-2xl mt-2" lang="ar">
            {b.ayahText}
          </p>
          {b.translation && (
            <p className="mt-2 text-sm text-[color:var(--foreground)]/90">{b.translation}</p>
          )}
          <textarea
            placeholder={t.book_note_placeholder}
            defaultValue={b.note ?? ""}
            onBlur={(e) => updateNote(b.id, e.target.value)}
            rows={2}
            className="mt-3 w-full resize-y rounded-lg border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]"
          />
        </article>
      ))}
    </div>
  );
}
