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
    <div className="space-y-16 sm:space-y-20">
      {/* ── Editorial hero ──
          Asymmetric two-column grid on desktop, stacked on mobile. The Arabic
          bismillah sits as a quiet marginal note at the top, the display
          headline takes the page weight, and the body type sits below in a
          narrower measure for comfortable reading. */}
      <section className="relative pt-4 sm:pt-8 stagger-children">
        <p className="eyebrow text-[color:var(--gold)] mb-3 sm:mb-4">
          مُبِين · Mubin
        </p>
        <p
          className="arabic text-[color:var(--gold-strong)] text-[clamp(1.5rem,1.2rem+1.2vw,2.25rem)] mb-6 sm:mb-8 dark:text-[color:var(--gold)]"
          lang="ar"
          dir="rtl"
        >
          بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
        </p>
        <h1
          className="display text-[length:var(--text-display)] leading-[1.05] text-[color:var(--foreground)] max-w-[18ch]"
          style={{ fontWeight: 500 }}
        >
          {t.home_hero_title.split(",").map((part, i) => (
            <span key={i} className="block">
              {i === 0 ? part + "," : (
                <span className="display-italic text-[color:var(--accent-strong)]">
                  {part.trim()}
                </span>
              )}
            </span>
          ))}
        </h1>
        <p className="mt-6 sm:mt-8 max-w-[52ch] text-[length:var(--text-lg)] text-[color:var(--foreground-soft)] leading-[1.7]">
          {t.home_hero_desc}
        </p>
        <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-3">
          <Link
            href="/learn/session"
            className="touch-target inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] text-white px-6 sm:px-7 py-3 text-[15px] font-semibold transition-all duration-200 hover:bg-[color:var(--accent-strong)] hover:shadow-[var(--shadow-glow)] active:scale-[0.97]"
          >
            {t.dash_start_quest}
            <span aria-hidden className="text-base">→</span>
          </Link>
          <Link
            href="/surahs"
            className="touch-target inline-flex items-center gap-2 rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-6 sm:px-7 py-3 text-[15px] font-semibold transition-all duration-200 hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)] active:scale-[0.97]"
          >
            {t.home_read_title}
          </Link>
        </div>
      </section>

      {/* Last-read continuation strip */}
      <LastReadCard />

      {/* ── Three pillars ──
          A horizontal triptych on desktop with varied weight: the Word Quest
          card is visually prominent (gold tinted), the other two are quieter
          companions. */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 stagger-children">
        <article className="relative overflow-hidden rounded-[var(--radius-lg)] border-2 border-[color:var(--gold)]/40 bg-gradient-to-br from-[color:var(--gold-soft)] to-[color:var(--surface)] p-6 sm:p-7">
          <div
            aria-hidden
            className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-[color:var(--gold)]/15 blur-2xl"
          />
          <p className="eyebrow text-[color:var(--gold-strong)] mb-3">01 · {t.nav_learn}</p>
          <h3 className="display text-2xl mb-3" style={{ fontWeight: 600 }}>
            {t.home_quest_title}
          </h3>
          <p className="text-sm text-[color:var(--foreground-soft)] leading-relaxed">
            {t.home_quest_desc}
          </p>
          <Link
            href="/learn"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--gold-strong)] hover:gap-2.5 transition-all"
          >
            {t.dash_start_quest}
            <span aria-hidden>→</span>
          </Link>
        </article>

        <article className="rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 sm:p-7">
          <p className="eyebrow mb-3">02 · {t.nav_read}</p>
          <h3 className="display text-2xl mb-3" style={{ fontWeight: 600 }}>
            {t.home_tap_title}
          </h3>
          <p className="text-sm text-[color:var(--foreground-soft)] leading-relaxed">
            {t.home_tap_desc}
          </p>
        </article>

        <article className="rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 sm:p-7">
          <p className="eyebrow mb-3">03</p>
          <h3 className="display text-2xl mb-3" style={{ fontWeight: 600 }}>
            {t.home_forever_title}
          </h3>
          <p className="text-sm text-[color:var(--foreground-soft)] leading-relaxed">
            {t.home_forever_desc}
          </p>
        </article>
      </section>

      {/* ── Popular surahs ── */}
      <section>
        <header className="flex items-end justify-between mb-6 sm:mb-8">
          <div>
            <p className="eyebrow mb-1">سورة</p>
            <h2 className="display text-[length:var(--text-2xl)]" style={{ fontWeight: 600 }}>
              {t.home_popular}
            </h2>
          </div>
          <Link
            href="/surahs"
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--accent-strong)] hover:gap-2.5 transition-all"
          >
            {t.home_view_all}
            <span aria-hidden>→</span>
          </Link>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {popular.map((s) => (
            <SurahCard key={s.number} surah={s} />
          ))}
        </div>
      </section>

      {/* ── Short surahs ── */}
      <section>
        <header className="mb-6 sm:mb-8">
          <p className="eyebrow mb-1">قصار السور</p>
          <h2 className="display text-[length:var(--text-2xl)]" style={{ fontWeight: 600 }}>
            {t.home_short_surahs}
          </h2>
          <p className="text-sm text-[color:var(--muted)] mt-1">{t.home_short_desc}</p>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {short.map((s) => (
            <SurahCard key={s.number} surah={s} />
          ))}
        </div>
      </section>
    </div>
  );
}
