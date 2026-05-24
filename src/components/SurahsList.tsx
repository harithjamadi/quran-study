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
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search — recessed input with leading icon + inner shadow so it
            clearly reads as an interactive field. */}
        <div className="relative flex-1 min-w-[14rem]">
          <span
            aria-hidden
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--muted)]"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <input
            type="search"
            placeholder={t.surah_search}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-full border border-[color:var(--border-strong)] bg-[color:var(--background)] pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:border-[color:var(--accent)] focus:bg-[color:var(--surface)] transition-colors"
            aria-label={t.surah_search}
            style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.04)" }}
          />
        </div>
        <div className="flex rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface)] overflow-hidden text-xs shrink-0">
          <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>
            {t.vocab_filter_all}
          </FilterTab>
          <FilterTab
            active={filter === "Meccan"}
            onClick={() => setFilter("Meccan")}
            dotColor="var(--gold)"
          >
            {t.surah_meccan}
          </FilterTab>
          <FilterTab
            active={filter === "Medinan"}
            onClick={() => setFilter("Medinan")}
            dotColor="var(--accent)"
          >
            {t.surah_medinan}
          </FilterTab>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="display-italic text-[color:var(--muted)]">{t.surah_none}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((s) => (
            <SurahCard key={s.number} surah={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  children,
  dotColor,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dotColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={classNames(
        "inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 transition-colors whitespace-nowrap",
        active
          ? "bg-[color:var(--accent)] text-white"
          : "text-[color:var(--muted-strong)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--accent-soft)]/40"
      )}
    >
      {dotColor && (
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: active ? "rgba(255,255,255,0.85)" : dotColor }}
        />
      )}
      {children}
    </button>
  );
}
