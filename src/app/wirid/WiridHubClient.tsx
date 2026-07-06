"use client";

import Link from "next/link";
import { MATHURAT, MANZIL } from "@/data/wirid";
import { useWirid, itemCount } from "@/store/wirid";
import { useLearning } from "@/store/learning";
import { useHydrated } from "@/lib/use-hydrated";
import { classNames } from "@/lib/format";

const T = {
  eyebrow: { en: "Wirid", ms: "Wirid" },
  title: { en: "Daily remembrance", ms: "Zikir harian" },
  hint: {
    en: "Short, steady routines of dhikr and Quranic protection — the same texts read in homes and halaqahs every day.",
    ms: "Rutin zikir dan perlindungan Al-Quran yang ringkas dan konsisten — teks yang sama dibaca di rumah dan halaqah setiap hari.",
  },
  mathurat_title: { en: "Al-Ma'thurat", ms: "Al-Ma'thurat" },
  mathurat_desc: {
    en: "Morning & evening adhkar (sughra): Al-Fatiha, Ayat al-Kursi, the three Quls, and the Prophet's ﷺ daily supplications.",
    ms: "Zikir pagi & petang (sughra): Al-Fatihah, Ayat al-Kursi, tiga Qul, dan doa-doa harian Rasulullah ﷺ.",
  },
  manzil_title: { en: "Manzil", ms: "Manzil" },
  manzil_desc: {
    en: "33 Quranic passages recited daily for protection — from Al-Fatiha through An-Nas.",
    ms: "33 petikan Al-Quran dibaca setiap hari sebagai perlindungan — dari Al-Fatihah hingga An-Nas.",
  },
  morning: { en: "Morning", ms: "Pagi" },
  evening: { en: "Evening", ms: "Petang" },
  read: { en: "Begin", ms: "Mula" },
  progress: { en: "today", ms: "hari ini" },
} as const;

function routineProgress(
  state: { day: string; counts: Record<string, number> },
  routineId: string,
  items: readonly { id: string; repeat?: number }[]
): number {
  return items.filter((it) => itemCount(state, routineId, it.id) >= (it.repeat ?? 1)).length;
}

export function WiridHubClient() {
  const language = useLearning((s) => s.language);
  const day = useWirid((s) => s.day);
  const counts = useWirid((s) => s.counts);
  const hydrated = useHydrated();
  const state = { day, counts };

  const cards = [
    {
      href: "/wirid/mathurat",
      title: T.mathurat_title[language],
      desc: T.mathurat_desc[language],
      arabic: "المأثورات",
      done: hydrated
        ? Math.max(
            routineProgress(state, "mathurat-morning", MATHURAT),
            routineProgress(state, "mathurat-evening", MATHURAT)
          )
        : 0,
      total: MATHURAT.length,
      badges: [T.morning[language], T.evening[language]],
    },
    {
      href: "/wirid/manzil",
      title: T.manzil_title[language],
      desc: T.manzil_desc[language],
      arabic: "منزل",
      done: hydrated ? routineProgress(state, "manzil", MANZIL) : 0,
      total: MANZIL.length,
      badges: [],
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-up">
      <header className="space-y-2">
        <p className="eyebrow text-[color:var(--accent-strong)]">{T.eyebrow[language]}</p>
        <h1 className="display text-[length:var(--text-2xl)]" style={{ fontWeight: 700 }}>
          {T.title[language]}
        </h1>
        <p className="max-w-[60ch] text-sm text-[color:var(--muted)] leading-relaxed">
          {T.hint[language]}
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card) => {
          const complete = card.done >= card.total;
          return (
            <Link
              key={card.href}
              href={card.href}
              className={classNames(
                "group relative overflow-hidden rounded-[var(--radius-lg)] border bg-[color:var(--surface)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-glow)]",
                complete
                  ? "border-[color:var(--gold)]/50"
                  : "border-[color:var(--border)] hover:border-[color:var(--accent)]/60"
              )}
            >
              <p
                aria-hidden
                className="arabic absolute -top-3 right-3 select-none text-[4.5rem] leading-none text-[color:var(--accent-strong)]/8 dark:text-[color:var(--accent)]/15"
                lang="ar"
                dir="rtl"
              >
                {card.arabic}
              </p>
              <h2 className="display relative text-[length:var(--text-xl)] mb-2" style={{ fontWeight: 600 }}>
                {card.title}
              </h2>
              <p className="relative text-sm text-[color:var(--foreground-soft)] leading-relaxed">
                {card.desc}
              </p>
              {card.badges.length > 0 && (
                <div className="relative mt-3 flex gap-1.5">
                  {card.badges.map((b) => (
                    <span
                      key={b}
                      className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-raised)] px-2.5 py-0.5 text-[11px] font-medium text-[color:var(--muted-strong)]"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}
              <div className="relative mt-4 flex items-center justify-between gap-3">
                <span className="text-xs tabular-nums text-[color:var(--muted)]">
                  {card.done}/{card.total} {T.progress[language]}
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--accent-strong)] transition-all group-hover:gap-2.5">
                  {T.read[language]}
                  <span aria-hidden>→</span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
