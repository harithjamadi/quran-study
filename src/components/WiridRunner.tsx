"use client";

import { useRouter } from "next/navigation";
import { getSurah } from "@/data/surahs";
import { resolveText, type WiridItem, type WiridTime } from "@/data/wirid";
import type { WiridPassages } from "@/lib/wirid-fetch";
import { useWirid, itemCount } from "@/store/wirid";
import { useSettings } from "@/store/settings";
import { useLearning } from "@/store/learning";
import { useHydrated } from "@/lib/use-hydrated";
import { classNames, toArabicDigits } from "@/lib/format";

const T = {
  progress: { en: "completed", ms: "selesai" },
  reset: { en: "Start over", ms: "Mula semula" },
  done: { en: "Done", ms: "Selesai" },
  countTap: { en: "Tap to count", ms: "Ketik untuk kira" },
  source: { en: "Narrated by", ms: "Riwayat" },
  loadFailed: {
    en: "This passage couldn't be loaded. Check your connection and try again.",
    ms: "Petikan ini tidak dapat dimuatkan. Semak sambungan anda dan cuba lagi.",
  },
  retry: { en: "Try again", ms: "Cuba lagi" },
  allDone: {
    en: "Alhamdulillah — today's wirid is complete.",
    ms: "Alhamdulillah — wirid hari ini telah selesai.",
  },
} as const;

interface Props {
  /** Progress bucket, e.g. "mathurat-morning" — counts are stored under it. */
  routineId: string;
  items: readonly WiridItem[];
  passages: WiridPassages;
  /** Resolves morning/evening dhikr variants. Manzil passes "morning" (no variants). */
  time: WiridTime;
}

export function WiridRunner({ routineId, items, passages, time }: Props) {
  const router = useRouter();
  const language = useLearning((s) => s.language);
  const arabicFontSize = useSettings((s) => s.arabicFontSize);
  const translationFontSize = useSettings((s) => s.translationFontSize);
  const day = useWirid((s) => s.day);
  const counts = useWirid((s) => s.counts);
  const increment = useWirid((s) => s.increment);
  const resetRoutine = useWirid((s) => s.resetRoutine);
  const hydrated = useHydrated();

  const state = { day, counts };
  const doneCount = items.filter(
    (it) => itemCount(state, routineId, it.id) >= (it.repeat ?? 1)
  ).length;
  const allDone = hydrated && doneCount === items.length;

  return (
    <div className="space-y-4">
      {/* Sticky progress — always shows where you are in the routine. */}
      <div className="sticky top-14 sm:top-16 z-30 -mx-4 px-4 py-2.5 bg-[color:var(--background)]/92 backdrop-blur-md border-b border-[color:var(--border)]">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--border)]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={items.length}
            aria-valuenow={hydrated ? doneCount : 0}
          >
            <div
              className={classNames(
                "h-full rounded-full transition-[width] duration-500",
                allDone ? "bg-[color:var(--gold)]" : "bg-[color:var(--accent)]"
              )}
              style={{ width: `${hydrated ? (doneCount / items.length) * 100 : 0}%` }}
            />
          </div>
          <p className="shrink-0 text-xs tabular-nums text-[color:var(--muted-strong)]">
            {hydrated ? doneCount : 0}/{items.length} {T.progress[language]}
          </p>
          <button
            type="button"
            onClick={() => resetRoutine(routineId)}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-[color:var(--muted-strong)] hover:bg-[color:var(--border)]/50 hover:text-[color:var(--foreground)] transition-colors"
          >
            {T.reset[language]}
          </button>
        </div>
      </div>

      {allDone && (
        <p className="mx-auto max-w-2xl rounded-[var(--radius)] border border-[color:var(--gold)]/40 bg-[color:var(--gold-soft)] px-4 py-3 text-sm font-medium text-[color:var(--gold-strong)] animate-fade-up">
          ✦ {T.allDone[language]}
        </p>
      )}

      <ol className="mx-auto max-w-2xl space-y-4">
        {items.map((item, i) => {
          const target = item.repeat ?? 1;
          const count = hydrated ? itemCount(state, routineId, item.id) : 0;
          const done = count >= target;
          return (
            <li key={item.id}>
              <article
                className={classNames(
                  "rounded-2xl border bg-[color:var(--surface)] p-5 sm:p-6 transition-colors",
                  done
                    ? "border-[color:var(--gold)]/50"
                    : "border-[color:var(--border)]"
                )}
              >
                <header className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold tabular-nums text-[color:var(--muted)]">
                    {i + 1} · {itemHeading(item, language)}
                  </p>
                  {done && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="m4.5 12.5 5 5 10-11" />
                      </svg>
                      {T.done[language]}
                    </span>
                  )}
                </header>

                {item.kind === "quran" ? (
                  <QuranPassage item={item} passages={passages} language={language} arabicFontSize={arabicFontSize} translationFontSize={translationFontSize} onRetry={() => router.refresh()} />
                ) : (
                  <>
                    <p
                      className="arabic text-right leading-[1.9] text-[color:var(--foreground)]"
                      style={{ fontSize: `${arabicFontSize}px` }}
                      lang="ar"
                      dir="rtl"
                    >
                      {resolveText(item.arabic, time)}
                    </p>
                    <p
                      className="mt-3 leading-relaxed text-[color:var(--foreground)]/90"
                      style={{ fontSize: `${translationFontSize}px` }}
                    >
                      {resolveText(language === "ms" ? item.ms : item.en, time)}
                    </p>
                    {item.source && (
                      <p className="mt-2 text-xs text-[color:var(--muted)]">
                        {T.source[language]} {item.source[language]}
                      </p>
                    )}
                  </>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => increment(routineId, item.id, target)}
                    disabled={done}
                    aria-label={`${itemHeading(item, language)} — ${count}/${target}`}
                    className={classNames(
                      "touch-target inline-flex min-w-[5.5rem] items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold tabular-nums transition-all active:scale-[0.96]",
                      done
                        ? "border-[color:var(--gold)]/50 bg-[color:var(--gold-soft)] text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]"
                        : "border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] text-[color:var(--foreground)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
                    )}
                  >
                    {done ? (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="m4.5 12.5 5 5 10-11" />
                      </svg>
                    ) : (
                      <span className="sr-only">{T.countTap[language]} — </span>
                    )}
                    {count}/{target}
                  </button>
                </div>
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function itemHeading(item: WiridItem, language: "en" | "ms"): string {
  if (item.kind === "quran") {
    const surah = getSurah(item.surah);
    const name = surah?.englishName ?? `Surah ${item.surah}`;
    const range = item.from === item.to ? `${item.from}` : `${item.from}–${item.to}`;
    return `${name} · ${item.surah}:${range}`;
  }
  return language === "ms" ? "Zikir" : "Dhikr";
}

function QuranPassage({
  item,
  passages,
  language,
  arabicFontSize,
  translationFontSize,
  onRetry,
}: {
  item: Extract<WiridItem, { kind: "quran" }>;
  passages: WiridPassages;
  language: "en" | "ms";
  arabicFontSize: number;
  translationFontSize: number;
  onRetry: () => void;
}) {
  const ayahs = passages[item.id];
  if (!ayahs) {
    return (
      <div className="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-4 text-sm text-[color:var(--muted-strong)]">
        <p>{T.loadFailed[language]}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 font-semibold text-[color:var(--accent-strong)] hover:underline"
        >
          {T.retry[language]}
        </button>
      </div>
    );
  }
  // In Al-Fatihah the basmalah IS ayah 1 — set it apart as the centred
  // ornamental line a mushaf gives it (keeping its ayah marker), and let the
  // passage flow from ayah 2. Every other surah-opening passage gets the
  // unnumbered decorative basmalah, exactly like the surah reader (At-Tawbah,
  // surah 9, traditionally opens without one).
  const fatihahBasmalah =
    item.surah === 1 && ayahs[0]?.numberInSurah === 1 ? ayahs[0] : null;
  const decorativeBasmalah = item.from === 1 && item.surah !== 1 && item.surah !== 9;
  const flow = fatihahBasmalah ? ayahs.slice(1) : ayahs;
  return (
    <>
      {fatihahBasmalah && (
        <p className="bismillah ornament mb-3" lang="ar" dir="rtl">
          {fatihahBasmalah.arabic}
          <span className="inline-block mx-1.5" aria-hidden>
            ﴿{toArabicDigits(1)}﴾
          </span>
        </p>
      )}
      {decorativeBasmalah && (
        <p className="bismillah ornament mb-3" lang="ar" dir="rtl">
          بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
        </p>
      )}
      <p
        className="arabic text-right leading-[1.9] text-[color:var(--foreground)]"
        style={{ fontSize: `${arabicFontSize}px` }}
        lang="ar"
        dir="rtl"
      >
        {flow.map((a) => (
          <span key={a.numberInSurah}>
            {a.arabic}
            <span className="inline-block mx-1.5 text-[color:var(--gold)]" aria-hidden>
              ﴿{toArabicDigits(a.numberInSurah)}﴾
            </span>{" "}
          </span>
        ))}
      </p>
      <div
        className="mt-3 space-y-1.5 leading-relaxed text-[color:var(--foreground)]/90"
        style={{ fontSize: `${translationFontSize}px` }}
      >
        {ayahs.map((a) => {
          const text = language === "ms" ? a.ms : a.en;
          if (!text) return null;
          return (
            <p key={a.numberInSurah}>
              <span className="mr-1.5 text-xs tabular-nums text-[color:var(--muted)]">
                {a.numberInSurah}
              </span>
              {text}
            </p>
          );
        })}
      </div>
    </>
  );
}
