"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useLearning } from "@/store/learning";
import { useHydrated } from "@/lib/use-hydrated";
import { UI_STRINGS } from "@/lib/i18n";
import type { LemmaMeta } from "@/lib/learning";
import { effectiveGloss, statusOf } from "@/lib/learning";

interface Props {
  freq: LemmaMeta[];
}

export function VocabularyClient({ freq }: Props) {
  const hydrated = useHydrated();
  const lemmasState = useLearning((s) => s.lemmas);
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "mastered" | "learning">("all");

  const list = useMemo(() => {
    return freq
      .map((item) => ({
        ...item,
        state: lemmasState[item.lemma],
        status: statusOf(lemmasState[item.lemma]),
      }))
      .filter((item) => {
        // Only show words the user has at least introduced
        if (!item.state) return false;
        
        const matchesSearch = 
          item.lemma.includes(search) || 
          (item.en?.toLowerCase().includes(search.toLowerCase()));
        
        if (!matchesSearch) return false;

        if (filter === "mastered") return item.status === "strong" || item.status === "good";
        if (filter === "learning") return item.status === "weak" || item.status === "new";
        return true;
      });
  }, [freq, lemmasState, search, filter]);

  if (!hydrated) {
    return <div className="animate-pulse space-y-4">
      <div className="h-10 bg-[color:var(--border)] rounded-xl" />
      <div className="h-64 bg-[color:var(--border)] rounded-xl" />
    </div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t.vocab_title}</h1>
          <p className="text-sm text-[color:var(--muted)]">
            {t.vocab_tracked.replace("{count}", list.length.toString())}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/learn/session"
            className="rounded-full bg-[color:var(--accent)] text-white px-4 py-2 text-sm font-medium hover:bg-[color:var(--accent-strong)] transition-colors"
          >
            {t.dash_start_quest.split(" ")[0]} {t.nav_learn}
          </Link>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={t.vocab_search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm focus:border-[color:var(--accent)] focus:outline-none"
          />
        </div>
        <div className="flex rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-1">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              filter === "all"
                ? "bg-[color:var(--accent)] text-white"
                : "hover:bg-[color:var(--border)]/40"
            }`}
          >
            {t.vocab_filter_all}
          </button>
          <button
            onClick={() => setFilter("learning")}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              filter === "learning"
                ? "bg-[color:var(--accent)] text-white"
                : "hover:bg-[color:var(--border)]/40"
            }`}
          >
            {t.vocab_filter_learning}
          </button>
          <button
            onClick={() => setFilter("mastered")}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              filter === "mastered"
                ? "bg-[color:var(--accent)] text-white"
                : "hover:bg-[color:var(--border)]/40"
            }`}
          >
            {t.vocab_filter_mastered}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.length > 0 ? (
          list.map((item) => (
            <div
              key={item.lemma}
              className="group rounded-2xl border border-[color:var(--border)] p-4 bg-[color:var(--surface)] hover:border-[color:var(--accent)] transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="arabic text-2xl mb-1" lang="ar" dir="rtl">
                    {item.lemma}
                  </div>
                  <div className="text-sm font-medium text-[color:var(--foreground)] flex flex-col gap-0.5">
                    {(() => {
                      const g = effectiveGloss(item, language);
                      if (!g) return "—";
                      return (
                        <>
                          <span className="leading-tight">{g.text}</span>
                          {g.secondary && (
                            <span className="text-[11px] text-[color:var(--muted)] leading-tight">
                              {g.secondary}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold ${
                  item.status === "strong" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                  item.status === "good" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                  item.status === "weak" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                  "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                }`}>
                  {item.status}
                </div>
              </div>
              
              <div className="flex items-center justify-between text-[11px] text-[color:var(--muted)]">
                <span>{item.count.toLocaleString()}× in Quran</span>
                {item.state && (
                  <span>Streak: {item.state.streak}</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center card bg-[color:var(--surface)]/40 border-dashed">
            <p className="text-sm text-[color:var(--muted)]">{t.vocab_none}</p>
          </div>
        )}
      </div>
    </div>
  );
}
