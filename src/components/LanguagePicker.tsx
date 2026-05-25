"use client";

import { useLearning } from "@/store/learning";
import type { Language } from "@/store/learning";

export function LanguagePicker() {
  const setLanguage = useLearning((s) => s.setLanguage);
  const setHasChosenLanguage = useLearning((s) => s.setHasChosenLanguage);

  function pick(lang: Language) {
    setLanguage(lang);
    setHasChosenLanguage(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[color:var(--background)]"
      role="dialog"
      aria-modal="true"
      aria-label="Choose language"
    >
      {/* atmospheric glows */}
      <div
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 h-[36rem] w-[36rem] rounded-full bg-[color:var(--accent)]/10 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-[color:var(--gold)]/10 blur-3xl pointer-events-none"
      />

      <div className="relative w-full max-w-xs mx-auto text-center">
        {/* brand mark */}
        <p
          className="arabic text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] text-[5rem] leading-none mb-3 select-none"
          lang="ar"
          dir="rtl"
          aria-hidden
        >
          مُبِين
        </p>

        <p className="eyebrow mb-1 text-[color:var(--foreground-soft)]">
          Language · Bahasa
        </p>
        <h1 className="display text-[length:var(--text-2xl)] mb-8" style={{ fontWeight: 600 }}>
          Choose your language
        </h1>

        <div className="space-y-3 text-left">
          <button
            onClick={() => pick("en")}
            className="group w-full rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--accent)]/60 hover:shadow-[var(--shadow-glow)] active:scale-[0.98]"
          >
            <div className="flex items-center gap-3.5">
              <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)] text-xs font-bold tracking-wide shrink-0" aria-hidden>EN</span>
              <div className="flex-1">
                <p className="font-semibold text-[color:var(--foreground)]">English</p>
                <p className="text-sm text-[color:var(--foreground-soft)] mt-0.5">
                  Understand the Quran
                </p>
              </div>
              <span
                aria-hidden
                className="text-[color:var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                →
              </span>
            </div>
          </button>

          <button
            onClick={() => pick("ms")}
            className="group w-full rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--accent)]/60 hover:shadow-[var(--shadow-glow)] active:scale-[0.98]"
          >
            <div className="flex items-center gap-3.5">
              <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)] text-xs font-bold tracking-wide shrink-0" aria-hidden>MS</span>
              <div className="flex-1">
                <p className="font-semibold text-[color:var(--foreground)]">Bahasa Melayu</p>
                <p className="text-sm text-[color:var(--foreground-soft)] mt-0.5">
                  Fahami Al-Quran
                </p>
              </div>
              <span
                aria-hidden
                className="text-[color:var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                →
              </span>
            </div>
          </button>
        </div>

        <p className="mt-8 text-xs text-[color:var(--muted)]">
          You can change this later in Settings.
        </p>
      </div>
    </div>
  );
}
