"use client";

import { useRouter } from "next/navigation";
import { SURAHS } from "@/data/surahs";
import { useLearning } from "@/store/learning";
import { UI_STRINGS } from "@/lib/i18n";

interface Props {
  current: number;
  translationId: string;
}

export function SurahPager({ current, translationId }: Props) {
  const router = useRouter();
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];

  const onChange = (n: number) => {
    const qs =
      translationId && translationId !== "en.sahih"
        ? `?translation=${encodeURIComponent(translationId)}`
        : "";
    router.push(`/surah/${n}${qs}`);
  };

  return (
    <div className="card p-4 flex flex-wrap items-center gap-3 justify-between text-sm">
      <span className="text-[color:var(--muted)]">{t.read_jump}</span>
      <select
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5 focus:outline-none focus:border-[color:var(--accent)]"
        aria-label={t.read_jump}
      >
        {SURAHS.map((s) => (
          <option key={s.number} value={s.number}>
            {s.number}. {s.englishName}
          </option>
        ))}
      </select>
    </div>
  );
}
