"use client";

import { useRouter } from "next/navigation";
import { SURAHS } from "@/data/surahs";

interface Props {
  current: number;
  translationId: string;
}

export function SurahPager({ current, translationId }: Props) {
  const router = useRouter();

  const onChange = (n: number) => {
    const qs =
      translationId && translationId !== "en.sahih"
        ? `?translation=${encodeURIComponent(translationId)}`
        : "";
    router.push(`/surah/${n}${qs}`);
  };

  return (
    <div className="card p-4 flex flex-wrap items-center gap-3 justify-between text-sm">
      <span className="text-[color:var(--muted)]">Jump to surah</span>
      <select
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5 focus:outline-none focus:border-[color:var(--accent)]"
        aria-label="Jump to surah"
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
