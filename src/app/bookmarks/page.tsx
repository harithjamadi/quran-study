"use client";

import { BookmarksList } from "@/components/BookmarksList";
import { useLearning } from "@/store/learning";
import { UI_STRINGS } from "@/lib/i18n";
import { useHydrated } from "@/lib/use-hydrated";

export default function BookmarksPage() {
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];
  const hydrated = useHydrated();

  if (!hydrated) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t.book_title}</h1>
        <p className="text-sm text-[color:var(--muted)] mt-1">
          {t.book_desc}
        </p>
      </header>
      <BookmarksList />
    </div>
  );
}
