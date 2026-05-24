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

  return (
    <Link
      href={`/surah/${surah.number}`}
      className="card p-4 flex items-center gap-4 hover:border-[color:var(--accent)]/60 hover:bg-[color:var(--accent-soft)]/30 transition-colors group"
      prefetch={false}
    >
      <div
        className="h-11 w-11 shrink-0 rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)] grid place-items-center text-sm font-medium relative"
        aria-hidden
      >
        <span className="absolute inset-0 grid place-items-center text-[color:var(--gold)]/40 text-2xl pointer-events-none">
          ◇
        </span>
        <span className="relative">{surah.number}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <h3 className="font-medium truncate">{surah.englishName}</h3>
          <span className="text-xs text-[color:var(--muted)] truncate">
            {surah.englishNameTranslation}
          </span>
        </div>
        <p className="text-xs text-[color:var(--muted)] mt-0.5">
          {t.surah_revelation
            .replace("{type}", typeLabel)
            .replace("{count}", toArabicDigits(surah.numberOfAyahs))}
        </p>
      </div>
      <span className="arabic text-xl text-[color:var(--accent-strong)] shrink-0">
        {surah.name}
      </span>
    </Link>
  );
}
