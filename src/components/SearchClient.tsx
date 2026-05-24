"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLearning } from "@/store/learning";
import { UI_STRINGS } from "@/lib/i18n";
import type { SearchMatch } from "@/lib/types";
import { TRANSLATIONS } from "@/lib/editions";
import { searchQuran } from "@/lib/api";
import { getSurah } from "@/data/surahs";

interface Props {
  initialQuery: string;
  initialEdition: string;
  initialResults: SearchMatch[];
  initialCount: number;
  initialError: string | null;
}

export function SearchClient({
  initialQuery,
  initialEdition,
  initialResults,
  initialCount,
  initialError,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];

  const [query, setQuery] = useState(initialQuery);
  const [edition, setEdition] = useState(initialEdition);
  const [results, setResults] = useState<SearchMatch[]>(initialResults);
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState<string | null>(initialError);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();

    const params = new URLSearchParams(sp?.toString() ?? "");
    params.set("q", trimmed);
    params.set("edition", edition);
    router.replace(`/search?${params.toString()}`);

    if (!trimmed) {
      setResults([]);
      setCount(0);
      setError(null);
      return;
    }

    startTransition(async () => {
      setError(null);
      try {
        const r = await searchQuran(trimmed, edition);
        setResults(r.matches);
        setCount(r.count);
      } catch {
        setError(t.search_failed);
      }
    });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="flex flex-wrap gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search_placeholder}
          className="flex-1 min-w-[14rem] rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]"
          aria-label={t.nav_search}
        />
        <select
          value={edition}
          onChange={(e) => setEdition(e.target.value)}
          className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]"
          aria-label={t.set_default_trans}
        >
          {TRANSLATIONS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.language} — {t.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-[color:var(--accent)] text-white px-5 py-2 text-sm hover:bg-[color:var(--accent-strong)] disabled:opacity-60"
        >
          {isPending ? t.search_loading : t.search_btn}
        </button>
      </form>

      {error && <p className="text-sm text-[color:var(--danger)]">{error}</p>}

      {!error && query.trim() && !isPending && (
        <p className="text-sm text-[color:var(--muted)]">
          {count === 0
            ? t.search_empty
            : t.search_results.replace("{count}", count.toString())}
        </p>
      )}

      <ul className="space-y-3">
        {results.map((m) => {
          const surah = getSurah(m.surah.number);
          const surahName = surah ? surah.englishName : m.surah.englishName;
          return (
            <li key={`${m.number}-${m.edition?.identifier}`}>
              <Link
                href={`/surah/${m.surah.number}#v${m.numberInSurah}`}
                className="card p-4 block hover:border-[color:var(--accent)]/60"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-medium">
                    {surahName} · {m.surah.number}:{m.numberInSurah}
                  </h3>
                  <span className="text-xs text-[color:var(--muted)]">
                    {m.edition?.englishName}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--foreground)]/90">
                  {highlight(m.text, query)}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function highlight(text: string, needle: string): React.ReactNode {
  const q = needle.trim();
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(re);
  return parts.map((p, i) =>
    re.test(p) ? (
      <mark
        key={i}
        className="bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)] px-0.5 rounded"
      >
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}
