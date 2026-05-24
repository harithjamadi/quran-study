"use client";

import { useLearning } from "@/store/learning";
import { UI_STRINGS } from "@/lib/i18n";

export function LearnPageHeader() {
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];

  return (
    <header>
      <h1 className="text-2xl font-bold tracking-tight">{t.dash_learn_title}</h1>
      <p className="text-sm text-[color:var(--muted)] mt-1">
        {t.dash_quest_long_desc}
      </p>
    </header>
  );
}
