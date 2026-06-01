"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLearning } from "@/store/learning";
import { useSettings } from "@/store/settings";
import { UI_STRINGS } from "@/lib/i18n";
import { LastReadCard } from "@/components/LastReadCard";
import { LanguagePicker } from "@/components/LanguagePicker";
import { SurahCard } from "@/components/SurahCard";
import { SURAHS } from "@/data/surahs";
import { useHydrated } from "@/lib/use-hydrated";

const POPULAR_IDS = [1, 2, 18, 36, 55, 67];
const SHORT_IDS = [112, 113, 114, 110, 108, 103];

/* Tick a number up from 0 to `target` over ~1.2s on mount. setState
 * only happens inside a rAF callback so the react-hooks/set-state-in-effect
 * rule is satisfied. */
function useCountUp(target: number, durationMs = 1200) {
  const [ratio, setRatio] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    if (reduced) {
      raf = requestAnimationFrame(() => setRatio(1));
      return () => cancelAnimationFrame(raf);
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setRatio(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return Math.round(target * ratio);
}

export default function HomePage() {
  const language = useLearning((s) => s.language);
  const hasChosenLanguage = useLearning((s) => s.hasChosenLanguage);
  const setTranslation = useSettings((s) => s.setTranslation);
  const translationId = useSettings((s) => s.translationId);

  const lastSyncedLanguage = useRef<string | null>(null);
  useEffect(() => {
    // Only sync once per language value — prevents overwriting a manual translation choice.
    if (lastSyncedLanguage.current === language) return;
    lastSyncedLanguage.current = language;
    if (language === "ms" && translationId === "en.sahih") {
      setTranslation("ms.basmeih");
    }
  }, [language, translationId, setTranslation]);

  const t = UI_STRINGS[language];
  const hydrated = useHydrated();
  const lemmaCount = useCountUp(500, 1400);
  const pctCount = useCountUp(80, 1400);

  const popular = SURAHS.filter((s) => POPULAR_IDS.includes(s.number));
  const short = SURAHS.filter((s) => SHORT_IDS.includes(s.number));

  if (!hydrated) return null;
  if (!hasChosenLanguage) return <LanguagePicker />;

  return (
    <div className="space-y-20 sm:space-y-28">
      {/* atmospheric Green glow behind hero */}
      <section className="relative pt-2 sm:pt-6 lg:pt-10 overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-32 -left-32 h-[40rem] w-[40rem] rounded-full bg-[color:var(--accent)]/10 blur-3xl pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute -top-24 right-0 h-[30rem] w-[30rem] rounded-full bg-[color:var(--gold)]/10 blur-3xl pointer-events-none"
        />

        <div className="relative grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-center">
          <div className="stagger-children relative z-10 lg:pr-2">
            <div className="flex items-center gap-4 mb-5 sm:mb-7">
              <span
                aria-hidden
                className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-[color:var(--gold)]/70"
              />
              <p
                className="arabic text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] text-[clamp(1.05rem,0.9rem+0.6vw,1.4rem)] leading-none"
                lang="ar"
                dir="rtl"
              >
                بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
              </p>
            </div>

            <h1
              className="display text-[clamp(2.5rem,2rem+4vw,5.2rem)] leading-[0.98] tracking-tight text-[color:var(--foreground)]"
              style={{ fontWeight: 500 }}
            >
              {(() => {
                const parts = t.home_hero_title.split(",");
                if (parts.length < 2) return parts[0];
                return (
                  <>
                    <span className="block">{parts[0]},</span>
                    <span className="display-italic text-[color:var(--accent-strong)] block">
                      {parts.slice(1).join(",").trim()}
                    </span>
                  </>
                );
              })()}
            </h1>

            <p className="mt-6 sm:mt-8 max-w-[48ch] text-[length:var(--text-lg)] text-[color:var(--foreground-soft)] leading-[1.65]">
              {t.home_hero_desc}
            </p>

            <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/learn/session"
                className="touch-target group inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] text-white px-7 py-3.5 text-[15px] font-semibold transition-all duration-200 hover:bg-[color:var(--accent-strong)] hover:shadow-[var(--shadow-glow)] active:scale-[0.97]"
              >
                {t.dash_start_quest}
                <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="/surahs"
                className="touch-target inline-flex items-center gap-2 rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-7 py-3.5 text-[15px] font-semibold transition-all duration-200 hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)] active:scale-[0.97]"
              >
                {t.home_read_title}
              </Link>
            </div>

            <div className="mt-10 sm:mt-12 flex items-baseline gap-3 sm:gap-4 border-t border-[color:var(--border)] pt-6 sm:pt-7 max-w-md">
              <span className="stat-display text-[length:var(--text-3xl)] text-[color:var(--accent-strong)] tabular-nums">
                {lemmaCount.toLocaleString()}
              </span>
              <p className="text-sm text-[color:var(--foreground-soft)] leading-snug">
                {language === "ms" ? (
                  <>perkataan teras meliputi{" "}
                    <span className="stat-display text-[color:var(--foreground)] tabular-nums">{pctCount}%</span>{" "}
                    daripada Al-Quran</>
                ) : (
                  <>core lemmas cover{" "}
                    <span className="stat-display text-[color:var(--foreground)] tabular-nums">{pctCount}%</span>{" "}
                    of the Quran</>
                )}
              </p>
            </div>
          </div>

          <div className="relative hidden lg:flex items-center justify-center min-h-[28rem]">
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <p
              className="arabic select-none pointer-events-none text-[color:var(--accent-strong)]/15 dark:text-[color:var(--accent)]/30 text-[clamp(12rem,16vw,19rem)] leading-none"
              lang="ar"
              dir="rtl"
              style={{ fontWeight: 400 }}
              aria-hidden
            >
              مُبِين
            </p>
            <div className="absolute bottom-8 right-0 flex items-center gap-3 rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface)]/80 backdrop-blur px-4 py-2.5 shadow-[var(--shadow)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)] animate-pulse-soft" />
              <span className="text-xs font-medium text-[color:var(--foreground-soft)]">
                {language === "ms" ? "4,769 lema · 1,651 akar" : "4,769 lemmas · 1,651 roots"}
              </span>
            </div>
          </div>

          <p
            className="lg:hidden arabic absolute -right-2 top-0 select-none pointer-events-none text-[color:var(--accent-strong)]/8 dark:text-[color:var(--accent)]/15 text-[clamp(6rem,22vw,10rem)] leading-none -z-0 overflow-hidden"
            lang="ar"
            dir="rtl"
            aria-hidden
          >
            مُبِين
          </p>
        </div>
      </section>

      <div className="divider" />
      <LastReadCard />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 stagger-children">
        <PillarCard
          ordinal="01"
          eyebrow={t.nav_learn}
          title={t.home_quest_title}
          body={t.home_quest_desc}
          icon={<IconBrain />}
          href="/learn"
          cta={t.dash_start_quest}
          primary
        />
        <PillarCard
          ordinal="02"
          eyebrow={t.nav_read}
          title={t.home_tap_title}
          body={t.home_tap_desc}
          icon={<IconBookOpen />}
          href="/surahs"
          cta={t.home_read_title}
        />
        <PillarCard
          ordinal="03"
          eyebrow={language === "ms" ? "Peribadi" : "Private"}
          title={t.home_forever_title}
          body={t.home_forever_desc}
          icon={<IconShield />}
          href="/analytics"
          cta={language === "ms" ? "Lihat statistik anda" : "View your stats"}
        />
      </section>

      <div className="divider" />

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

function PillarCard({
  ordinal,
  eyebrow,
  title,
  body,
  icon,
  href,
  cta,
  primary = false,
}: {
  ordinal: string;
  eyebrow: string;
  title: string;
  body: string;
  icon: React.ReactNode;
  href?: string;
  cta?: string;
  primary?: boolean;
}) {
  const Wrapper: React.ElementType = href ? Link : "div";
  const wrapperProps = href ? { href } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`group relative overflow-hidden rounded-[var(--radius-lg)] p-6 sm:p-7 transition-all duration-300 ${
        primary
          ? "border-2 border-[color:var(--gold)]/40 bg-gradient-to-br from-[color:var(--gold-soft)] via-[color:var(--surface)] to-[color:var(--surface)] hover:-translate-y-1 hover:shadow-[0_16px_40px_-12px_rgba(168,132,47,0.25)]"
          : "border border-[color:var(--border)] bg-[color:var(--surface)] hover:-translate-y-1 hover:border-[color:var(--accent)]/60 hover:shadow-[var(--shadow-glow)]"
      } ${href ? "cursor-pointer" : ""}`}
    >
      <div
        aria-hidden
        className={`absolute -top-12 -right-12 h-40 w-40 rounded-full blur-3xl transition-opacity duration-500 ${
          primary
            ? "bg-[color:var(--gold)]/20 opacity-80"
            : "bg-[color:var(--accent)]/0 group-hover:bg-[color:var(--accent)]/15"
        }`}
      />

      <div
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl mb-5 ${
          primary
            ? "bg-[color:var(--gold)]/15 text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]"
            : "bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]"
        }`}
      >
        {icon}
      </div>

      <p className={`eyebrow mb-2 ${primary ? "text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]" : ""}`}>
        {ordinal} · {eyebrow}
      </p>
      <h3 className="display text-[length:var(--text-2xl)] mb-3" style={{ fontWeight: 600 }}>
        {title}
      </h3>
      <p className="text-sm text-[color:var(--foreground-soft)] leading-relaxed">{body}</p>

      {cta && href && (
        <span
          className={`relative mt-5 inline-flex items-center gap-1.5 text-sm font-semibold transition-all ${
            primary ? "text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]" : "text-[color:var(--accent-strong)]"
          } group-hover:gap-2.5`}
        >
          {cta}
          <span aria-hidden>→</span>
        </span>
      )}
    </Wrapper>
  );
}

function IconBrain() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.5 2a3 3 0 0 0-3 3v0a3 3 0 0 0-3 3v1a3 3 0 0 0 0 6v1a3 3 0 0 0 3 3v0a3 3 0 0 0 3 3h.5V2H9.5Z" />
      <path d="M14.5 2a3 3 0 0 1 3 3v0a3 3 0 0 1 3 3v1a3 3 0 0 1 0 6v1a3 3 0 0 1-3 3v0a3 3 0 0 1-3 3H14V2h.5Z" />
      <path d="M9 9c1.5 0 2 .5 3 .5s1.5-.5 3-.5" />
      <path d="M9 15c1.5 0 2-.5 3-.5s1.5.5 3 .5" />
    </svg>
  );
}

function IconBookOpen() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 6.5C10 5 7 4 3 4v15c4 0 7 1 9 2.5" />
      <path d="M12 6.5C14 5 17 4 21 4v15c-4 0-7 1-9 2.5" />
      <path d="M12 6.5v15" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3 5 6v6c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
