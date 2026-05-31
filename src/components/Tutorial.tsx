"use client";

import { useEffect, useState } from "react";
import { useLearning } from "@/store/learning";
import { UI_STRINGS } from "@/lib/i18n";
import { useHydrated } from "@/lib/use-hydrated";
import { classNames } from "@/lib/format";

/**
 * First-run onboarding tour. Auto-shows once after the user picks a language
 * (gated on the persisted `hasSeenTutorial` flag) and is replayable on demand
 * from the "How it works" entry in the nav. Each step pairs a short, plain
 * explanation with an illustration so it reads clearly for any age.
 *
 * Visibility is derived directly from store state — no setState-in-effect — so
 * replaying is just `setHasSeenTutorial(false)`.
 */
export function Tutorial() {
  const hydrated = useHydrated();
  const language = useLearning((s) => s.language);
  const hasChosenLanguage = useLearning((s) => s.hasChosenLanguage);
  const hasSeenTutorial = useLearning((s) => s.hasSeenTutorial);
  const setHasSeenTutorial = useLearning((s) => s.setHasSeenTutorial);
  const t = UI_STRINGS[language];

  const [step, setStep] = useState(0);

  const open = hydrated && hasChosenLanguage && !hasSeenTutorial;

  const steps = [
    { title: t.tut_welcome_title, body: t.tut_welcome_body, art: <ArtWelcome /> },
    { title: t.tut_learn_title, body: t.tut_learn_body, art: <ArtLearn label={t.nav_learn} /> },
    { title: t.tut_read_title, body: t.tut_read_body, art: <ArtRead /> },
    { title: t.tut_nav_title, body: t.tut_nav_body, art: <ArtNav t={t} /> },
  ];
  const total = steps.length;
  const safeStep = Math.min(step, total - 1);
  const isLast = safeStep === total - 1;

  function finish() {
    setHasSeenTutorial(true);
    setStep(0);
  }

  // Lock body scroll + Escape-to-skip while the tour is open. (No React state
  // set here, so this stays clear of the set-state-in-effect rule.)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const current = steps[safeStep];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={current.title}
    >
      <button
        aria-label={t.tut_skip}
        onClick={finish}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-fade-in"
      />

      <div className="relative w-full sm:max-w-md rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_-12px_50px_-12px_rgba(0,0,0,0.5)] sm:shadow-[var(--shadow)] animate-slide-up sm:animate-scale-in overflow-hidden">
        {/* Skip (top-right) */}
        <button
          onClick={finish}
          className="absolute top-3 right-3 z-10 rounded-full px-3 py-1.5 text-xs font-semibold text-[color:var(--muted)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--border)]/40 transition-colors"
        >
          {t.tut_skip}
        </button>

        {/* Illustration */}
        <div className="relative h-44 sm:h-48 grid place-items-center overflow-hidden bg-gradient-to-br from-[color:var(--accent-soft)]/50 via-[color:var(--surface)] to-[color:var(--gold-soft)]/40">
          <div aria-hidden className="absolute -top-16 -right-12 h-48 w-48 rounded-full bg-[color:var(--gold)]/15 blur-3xl" />
          <div aria-hidden className="absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-[color:var(--accent)]/12 blur-3xl" />
          <div key={safeStep} className="relative animate-scale-in">{current.art}</div>
        </div>

        {/* Copy */}
        <div className="p-6 sm:p-7 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-7">
          <p className="eyebrow text-[10px] text-[color:var(--accent-strong)] mb-2">
            {t.tut_step.replace("{n}", String(safeStep + 1)).replace("{total}", String(total))}
          </p>
          <h2 className="display text-[length:var(--text-2xl)] leading-tight" style={{ fontWeight: 600 }}>
            {current.title}
          </h2>
          <p className="mt-2.5 text-sm text-[color:var(--foreground-soft)] leading-relaxed">
            {current.body}
          </p>

          {/* Progress dots */}
          <div className="mt-5 flex items-center gap-1.5" aria-hidden>
            {steps.map((_, i) => (
              <span
                key={i}
                className={classNames(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === safeStep ? "w-6 bg-[color:var(--accent)]" : "w-1.5 bg-[color:var(--border-strong)]"
                )}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="mt-6 flex items-center gap-3">
            {safeStep > 0 ? (
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="touch-target inline-flex items-center rounded-full border border-[color:var(--border-strong)] px-5 py-2.5 text-sm font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)] transition-colors"
              >
                {t.tut_back}
              </button>
            ) : (
              <button
                onClick={finish}
                className="touch-target inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-colors"
              >
                {t.tut_skip}
              </button>
            )}
            <button
              onClick={() => (isLast ? finish() : setStep((s) => Math.min(total - 1, s + 1)))}
              className="touch-target group ml-auto inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] text-white px-6 py-2.5 text-sm font-semibold transition-all hover:bg-[color:var(--accent-strong)] hover:shadow-[var(--shadow-glow)] active:scale-[0.97]"
            >
              {isLast ? t.tut_done : t.tut_next}
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Illustrations ──
 * Lightweight, theme-aware JSX "images" — no binary assets needed. */

function ArtWelcome() {
  return (
    <div className="relative grid place-items-center">
      <p
        className="arabic select-none text-[color:var(--accent-strong)]/15 dark:text-[color:var(--accent)]/25 text-[6.5rem] leading-none"
        lang="ar"
        dir="rtl"
        aria-hidden
      >
        مُبِين
      </p>
      <span aria-hidden className="absolute text-[color:var(--gold)] text-4xl drop-shadow-sm">✦</span>
    </div>
  );
}

function ArtLearn({ label }: { label: string }) {
  return (
    <div className="relative h-28 w-44" aria-hidden>
      {/* stacked flashcards */}
      <div className="absolute inset-x-6 top-3 h-24 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/60 rotate-[-6deg]" />
      <div className="absolute inset-x-4 top-1.5 h-24 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] rotate-[3deg]" />
      <div className="absolute inset-x-2 top-0 h-24 rounded-2xl border border-[color:var(--accent)]/40 bg-[color:var(--surface)] shadow-[var(--shadow)] grid place-items-center">
        <p className="arabic text-[color:var(--accent-strong)] text-3xl leading-none" lang="ar" dir="rtl">رَبّ</p>
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]">
          {label}
        </span>
      </div>
    </div>
  );
}

function ArtRead() {
  return (
    <div className="relative" aria-hidden>
      <p className="arabic text-[color:var(--foreground)] text-3xl leading-loose text-center" lang="ar" dir="rtl">
        ٱلْحَمْدُ <span className="relative inline-block text-[color:var(--accent-strong)]">
          لِلَّهِ
          <span className="absolute -inset-x-1 -inset-y-0.5 rounded-md ring-2 ring-[color:var(--accent)]/60" />
        </span> رَبِّ
      </p>
      {/* tap popover */}
      <div className="mt-2 mx-auto w-fit rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5 shadow-[var(--shadow)] flex items-center gap-2">
        <span className="text-[11px] font-semibold text-[color:var(--foreground)]">Allah</span>
        <span className="text-[10px] text-[color:var(--muted)]">· ء ل ه</span>
      </div>
    </div>
  );
}

function ArtNav({ t }: { t: (typeof UI_STRINGS)["en"] }) {
  const tabs = [
    { label: t.nav_home, icon: <PathHome />, active: false },
    { label: t.nav_learn, icon: <PathLearn />, active: false },
    { label: t.nav_read, icon: <PathBook />, active: true },
    { label: t.nav_search, icon: <PathSearch />, active: false },
    { label: t.nav_more, icon: <PathMore />, active: false },
  ];
  return (
    <div className="w-[17rem] rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/80 backdrop-blur shadow-[var(--shadow)] px-1.5 py-1.5 flex items-stretch" aria-hidden>
      {tabs.map((tab) => (
        <div
          key={tab.label}
          className={classNames(
            "flex-1 flex flex-col items-center justify-center gap-1 py-1.5",
            tab.active ? "text-[color:var(--accent-strong)]" : "text-[color:var(--muted)]"
          )}
        >
          <span className={classNames("flex items-center justify-center rounded-full px-2.5 py-0.5", tab.active ? "bg-[color:var(--accent-soft)]" : "")}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {tab.icon}
            </svg>
          </span>
          <span className={classNames("text-[8.5px] leading-none", tab.active ? "font-bold" : "font-medium")}>{tab.label}</span>
        </div>
      ))}
    </div>
  );
}

function PathHome() {
  return (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    </>
  );
}
function PathLearn() {
  return (
    <>
      <path d="M12 4 2.5 9 12 14l9.5-5L12 4Z" />
      <path d="M6 11v4.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V11" />
    </>
  );
}
function PathBook() {
  return (
    <>
      <path d="M12 6.5C10 5 7 4 3.5 4.2v14C7 18 10 19 12 20.5" />
      <path d="M12 6.5C14 5 17 4 20.5 4.2v14C17 18 14 19 12 20.5" />
      <path d="M12 6.5v14" />
    </>
  );
}
function PathSearch() {
  return (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </>
  );
}
function PathMore() {
  return (
    <>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  );
}
