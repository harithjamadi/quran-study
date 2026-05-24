"use client";

import { useLearning } from "@/store/learning";
import { UI_STRINGS } from "@/lib/i18n";

export function LearnPageHeader() {
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];

  return (
    <header className="space-y-3 pt-2 sm:pt-4">
      <p className="eyebrow text-[color:var(--gold)]">تعلم · Word Quest</p>
      <h1
        className="display text-[length:var(--text-4xl)] leading-[1.05]"
        style={{ fontWeight: 600 }}
      >
        {t.dash_learn_title}
      </h1>
      <p className="max-w-[55ch] text-[length:var(--text-base)] text-[color:var(--foreground-soft)] leading-relaxed">
        {t.dash_quest_long_desc}
      </p>
    </header>
  );
}
