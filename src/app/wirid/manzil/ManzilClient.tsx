"use client";

import { MANZIL } from "@/data/wirid";
import type { WiridPassages } from "@/lib/wirid-fetch";
import { WiridRunner } from "@/components/WiridRunner";
import { useLearning } from "@/store/learning";

const T = {
  eyebrow: { en: "Wirid · Manzil", ms: "Wirid · Manzil" },
  title: { en: "Manzil", ms: "Manzil" },
  hint: {
    en: "The classical compilation of 33 Quranic passages — from Al-Fatiha to An-Nas — recited daily for protection (ruqyah). Mark each passage as you read.",
    ms: "Himpunan klasik 33 petikan Al-Quran — dari Al-Fatihah hingga An-Nas — dibaca setiap hari sebagai perlindungan (ruqyah). Tandakan setiap petikan sambil anda membaca.",
  },
} as const;

export function ManzilClient({ passages }: { passages: WiridPassages }) {
  const language = useLearning((s) => s.language);
  return (
    <div className="space-y-6 animate-fade-up">
      <header className="mx-auto max-w-2xl space-y-2">
        <p className="eyebrow text-[color:var(--accent-strong)]">{T.eyebrow[language]}</p>
        <h1 className="display text-[length:var(--text-2xl)]" style={{ fontWeight: 700 }}>
          {T.title[language]}
        </h1>
        <p className="max-w-[60ch] text-sm text-[color:var(--muted)] leading-relaxed">
          {T.hint[language]}
        </p>
      </header>

      <WiridRunner routineId="manzil" items={MANZIL} passages={passages} time="morning" />
    </div>
  );
}
