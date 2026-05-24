"use client";

import Link from "next/link";
import { useLearning } from "@/store/learning";
import { UI_STRINGS } from "@/lib/i18n";
import { LastReadCard } from "@/components/LastReadCard";
import { SurahCard } from "@/components/SurahCard";
import { SURAHS } from "@/data/surahs";
import { useHydrated } from "@/lib/use-hydrated";

const POPULAR_IDS = [1, 2, 18, 36, 55, 67];
const SHORT_IDS = [112, 113, 114, 110, 108, 103];

export default function HomePage() {
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];
  const hydrated = useHydrated();

  const popular = SURAHS.filter((s) => POPULAR_IDS.includes(s.number));
  const short = SURAHS.filter((s) => SHORT_IDS.includes(s.number));

  if (!hydrated) return null;

  return (
    <div className="space-y-12">
      <section className="text-center space-y-5 py-8">
        <p className="arabic text-3xl text-[color:var(--gold)] mb-2" lang="ar">
          بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[color:var(--foreground)]">
          {t.home_hero_title}
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-[color:var(--muted)] leading-relaxed">
          {t.home_hero_desc}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/learn/session"
            className="rounded-full bg-[color:var(--accent)] text-white px-8 py-3 font-semibold hover:bg-[color:var(--accent-strong)] shadow-lg shadow-[color:var(--accent)]/20 transition-all active:scale-95"
          >
            {t.dash_start_quest} →
          </Link>
          <Link
            href="/surahs"
            className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-8 py-3 font-semibold hover:bg-[color:var(--accent-soft)]/20 transition-all active:scale-95"
          >
            {t.home_read_title}
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-10">
          <LastReadCard />

          <section>
            <header className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t.home_popular}</h2>
              <Link
                href="/surahs"
                className="text-sm font-medium text-[color:var(--accent-strong)] hover:underline"
              >
                {t.home_view_all}
              </Link>
            </header>
            <div className="grid sm:grid-cols-2 gap-4">
              {popular.map((s) => (
                <SurahCard key={s.number} surah={s} />
              ))}
            </div>
          </section>

          <section>
            <header className="mb-6">
              <h2 className="text-xl font-bold">{t.home_short_surahs}</h2>
              <p className="text-sm text-[color:var(--muted)]">{t.home_short_desc}</p>
            </header>
            <div className="grid sm:grid-cols-2 gap-4">
              {short.map((s) => (
                <SurahCard key={s.number} surah={s} />
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="card p-6 border-[color:var(--gold)]/20 bg-[color:var(--gold)]/5">
            <h3 className="font-bold flex items-center gap-2 mb-3">
              <span className="text-xl">🏆</span>
              {t.home_quest_title}
            </h3>
            <p className="text-sm text-[color:var(--muted)] leading-relaxed">
              {t.home_quest_desc}
            </p>
            <Link
              href="/learn"
              className="mt-4 block text-center rounded-xl bg-[color:var(--gold)] text-white py-2.5 text-sm font-bold hover:opacity-90 shadow-sm"
            >
              {t.nav_learn}
            </Link>
          </div>

          <div className="card p-6">
            <h3 className="font-bold flex items-center gap-2 mb-3">
              <span className="text-xl">📖</span>
              {t.home_tap_title}
            </h3>
            <p className="text-sm text-[color:var(--muted)] leading-relaxed">
              {t.home_tap_desc}
            </p>
          </div>

          <div className="card p-6">
            <h3 className="font-bold flex items-center gap-2 mb-3">
              <span className="text-xl">✨</span>
              {t.home_forever_title}
            </h3>
            <p className="text-sm text-[color:var(--muted)] leading-relaxed">
              {t.home_forever_desc}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
