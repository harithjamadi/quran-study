"use client";

import { SURAHS } from "@/data/surahs";
import { SurahsList } from "@/components/SurahsList";
import { useLearning } from "@/store/learning";
import { UI_STRINGS } from "@/lib/i18n";
import { useHydrated } from "@/lib/use-hydrated";

export default function SurahsPage() {
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];
  const hydrated = useHydrated();

  if (!hydrated) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t.surah_title}</h1>
        <p className="text-sm text-[color:var(--muted)] mt-1 max-w-2xl">
          {t.surah_desc}
        </p>
      </header>
      <SurahsList surahs={SURAHS} />
    </div>
  );
}
