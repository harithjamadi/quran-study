"use client";

import { useMemo, useState } from "react";
import { useLearning } from "@/store/learning";
import { UI_STRINGS } from "@/lib/i18n";
import type { SurahMeta } from "@/lib/types";
import { SurahCard } from "@/components/SurahCard";
import { classNames } from "@/lib/format";

type Filter = "all" | "Meccan" | "Medinan";

export function SurahsList({ surahs }: { surahs: SurahMeta[] }) {
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return surahs.filter((s) => {
      if (filter !== "all" && s.revelationType !== filter) return false;
      if (!needle) return true;
      return (
        String(s.number) === needle ||
        s.englishName.toLowerCase().includes(needle) ||
        s.englishNameTranslation.toLowerCase().includes(needle) ||
        s.name.includes(needle)
      );
    });
  }, [surahs, q, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[14rem]">
          <input
            type="search"
            placeholder={t.surah_search}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]"
            aria-label={t.surah_search}
          />
        </div>
        <div className="flex rounded-full border border-[color:var(--border)] overflow-hidden text-xs">
          <button
            onClick={() => setFilter("all")}
            className={classNames(
              "px-3 py-2",
              filter === "all"
                ? "bg-[color:var(--accent)] text-white"
                : "hover:bg-[color:var(--accent-soft)]/40"
            )}
          >
            {t.vocab_filter_all}
          </button>
          <button
            onClick={() => setFilter("Meccan")}
            className={classNames(
              "px-3 py-2",
              filter === "Meccan"
                ? "bg-[color:var(--accent)] text-white"
                : "hover:bg-[color:var(--accent-soft)]/40"
            )}
          >
            Meccan
          </button>
          <button
            onClick={() => setFilter("Medinan")}
            className={classNames(
              "px-3 py-2",
              filter === "Medinan"
                ? "bg-[color:var(--accent)] text-white"
                : "hover:bg-[color:var(--accent-soft)]/40"
            )}
          >
            Medinan
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-[color:var(--muted)] py-10 text-center">
          {t.surah_none}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((s) => (
            <SurahCard key={s.number} surah={s} />
          ))}
        </div>
      )}
    </div>
  );
}
