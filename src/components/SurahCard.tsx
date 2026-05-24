"use client";

import Link from "next/link";
import { useLearning } from "@/store/learning";
import { UI_STRINGS } from "@/lib/i18n";
import type { SurahMeta } from "@/lib/types";
import { toArabicDigits } from "@/lib/format";

export function SurahCard({ surah }: { surah: SurahMeta }) {
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];

  const typeLabel =
    surah.revelationType === "Meccan" ? t.surah_meccan : t.surah_medinan;
  const isMeccan = surah.revelationType === "Meccan";

  return (
    <Link
      href={`/surah/${surah.number}`}
      className={`group relative overflow-hidden card p-4 sm:p-5 flex items-center gap-4 transition-all duration-300 hover:shadow-[var(--shadow)] hover:-translate-y-0.5 ${
        isMeccan
          ? "hover:border-[color:var(--gold)]/50"
          : "hover:border-[color:var(--accent)]/50"
      }`}
      prefetch={false}
    >
      {/* Subtle left edge tint indicates revelation type */}
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: isMeccan ? "var(--gold)" : "var(--accent)", opacity: 0.55 }}
      />
      <div
        className="relative h-11 w-11 sm:h-12 sm:w-12 shrink-0 grid place-items-center text-[color:var(--accent-strong)]"
        aria-hidden
      >
        <svg
          viewBox="0 0 36 36"
          className="absolute inset-0 text-[color:var(--gold)]/60"
          aria-hidden
        >
          <polygon
            points="18,2 22,10 31,10 26,17 31,24 22,24 18,32 14,24 5,24 10,17 5,10 14,10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>
        <span className="relative stat-display text-sm sm:text-[15px]">
          {surah.number}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <h3
          className="display text-[length:var(--text-lg)] truncate leading-tight"
          style={{ fontWeight: 600 }}
        >
          {surah.englishName}
        </h3>
        <p className="text-xs text-[color:var(--muted)] mt-0.5 truncate">
          <span className="display-italic">{surah.englishNameTranslation}</span>
          {" · "}
          {t.surah_revelation
            .replace("{type}", typeLabel)
            .replace("{count}", toArabicDigits(surah.numberOfAyahs))}
        </p>
      </div>

      <span
        className="arabic text-[length:var(--arabic-sm)] text-[color:var(--accent-strong)] shrink-0 leading-none transition-colors group-hover:text-[color:var(--gold-strong)]"
        lang="ar"
        dir="rtl"
      >
        {surah.name}
      </span>
    </Link>
  );
}
