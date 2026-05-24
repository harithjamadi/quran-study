"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { lemmaAudioUrl } from "@/lib/frequency";
import { autoGrade, effectiveGloss, type Grade, type LemmaMeta } from "@/lib/learning";
import { classNames } from "@/lib/format";
import { LemmaContext } from "@/components/LemmaContext";
import { UI_STRINGS, type Language } from "@/lib/i18n";
import { useLearning } from "@/store/learning";
import { getSurah } from "@/data/surahs";

interface Props {
  /** The card to drill. */
  card: LemmaMeta;
  /** Pool of other lemmas, used to generate plausible wrong-answer distractors. */
  distractorPool: LemmaMeta[];
  /** Called when the user gets the answer right (passes the calculated grade). */
  onResult: (grade: Grade) => void;
  /** Called when the user clicks 'Next Word'. */
  onNext: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildOptions(card: LemmaMeta, pool: LemmaMeta[], lang: Language): LemmaMeta[] {
  const correct = effectiveGloss(card, lang)?.text.toLowerCase().trim();
  const candidates = pool.filter((l) => {
    if (l.lemma === card.lemma) return false;
    const gloss = effectiveGloss(l, lang)?.text.toLowerCase().trim();
    // Accept any lemma that has SOME gloss (Malay or English fallback) and
    // whose effective gloss differs from the correct answer.
    return !!gloss && gloss !== correct;
  });
  const distractors = shuffle(candidates).slice(0, 3);
  return shuffle([card, ...distractors]);
}

type Phase = "guessing" | "revealed";

export function Flashcard({ card, distractorPool, onResult, onNext }: Props) {
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];

  const [phase, setPhase] = useState<Phase>("guessing");
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  // Options are computed once using the language active at mount
  const [options] = useState(() => buildOptions(card, distractorPool, language));
  const [attempts, setAttempts] = useState(0);
  const [showDeepDive, setShowDeepDive] = useState(false);
  const startTime = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    startTime.current = Date.now();
    const url = lemmaAudioUrl(card.sampleSurah, card.sampleAyah, card.sampleWord);
    const a = new Audio(url);
    a.preload = "auto";
    audioRef.current = a;
    
    const playPromise = a.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }

    return () => {
      a.pause();
      a.src = "";
      audioRef.current = null;
    };
  }, [card.sampleSurah, card.sampleAyah, card.sampleWord]);

  const correctIndex = useMemo(() => options.findIndex((o) => o.lemma === card.lemma), [options, card.lemma]);

  const firstSurah = getSurah(card.sampleSurah);
  const firstRef = firstSurah 
    ? `${firstSurah.englishName} (${card.sampleSurah}:${card.sampleAyah})`
    : `${card.sampleSurah}:${card.sampleAyah}`;

  const [feedbackTone, setFeedbackTone] = useState<"good" | "bad" | null>(null);

  const onPick = (idx: number) => {
    if (phase !== "guessing") return;

    setPickedIndex(idx);
    const isCorrect = idx === correctIndex;
    setFeedbackTone(isCorrect ? "good" : "bad");

    if (isCorrect) {
      // eslint-disable-next-line react-hooks/purity
      const now = Date.now();
      const duration = now - startTime.current;
      const grade = autoGrade(attempts === 0, duration);
      onResult(grade);
      setPhase("revealed");
    } else {
      setAttempts((a) => a + 1);
      // Keep the wrong choice marked — bottom feedback bar stays visible
      // until the user clicks "Try again" to clear it. No auto-reset.
    }
  };

  const replay = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => undefined);
  };

  return (
    <div className="card-raised relative overflow-hidden p-6 sm:p-10 space-y-8 animate-fade-up transform-gpu">
      {/* Subtle gold accent — top edge */}
      <div
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-32 bg-gradient-to-r from-transparent via-[color:var(--gold)] to-transparent opacity-60"
      />

      {/* Bottom feedback bar — Duolingo style. Fixed at viewport bottom,
          full-width, persistent. Slides up. The user MUST see this. */}
      {feedbackTone && (
        <FeedbackBar
          tone={feedbackTone}
          correctAnswer={
            feedbackTone === "bad"
              ? effectiveGloss(options[correctIndex], language)?.text ?? null
              : null
          }
          language={language}
          onDismiss={() => {
            if (feedbackTone === "bad") {
              setFeedbackTone(null);
              setPickedIndex(null);
            }
          }}
        />
      )}
      <div className="text-center pt-2 sm:pt-4">
        <p className="eyebrow mb-5 sm:mb-6">{t.flash_question}</p>
        <p
          className="arabic-display text-[color:var(--foreground)] transform-gpu"
          lang="ar"
          dir="rtl"
          style={{ fontSize: "var(--arabic-xl)", textRendering: "geometricPrecision" }}
        >
          {card.sampleText}
        </p>
        {card.translit && (
          <p className="mt-3 sm:mt-4 display-italic text-[color:var(--muted-strong)] text-[length:var(--text-base)] tracking-wide">
            {card.translit}
          </p>
        )}
        <button
          type="button"
          onClick={replay}
          className="mt-5 sm:mt-6 inline-flex items-center gap-2 rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium text-[color:var(--accent-strong)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]/40 transition-all active:scale-95"
          aria-label="Play audio"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
            <path d="M8 5l12 7-12 7z" />
          </svg>
          {t.flash_replay}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((o, idx) => {
          const isCorrect = idx === correctIndex;
          const revealed = phase === "revealed";
          const wasWrong = pickedIndex !== null && idx === pickedIndex && !isCorrect;

          return (
            <button
              key={o.lemma + idx}
              type="button"
              onClick={() => onPick(idx)}
              disabled={revealed}
              className={classNames(
                "group relative rounded-2xl border-2 px-4 py-4 text-left transition-all duration-300 active:scale-[0.98] min-h-[72px] transform-gpu",
                !revealed && !wasWrong &&
                  "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]/30 hover:shadow-[var(--shadow)]",
                // Wrong-answer feedback: full red border, red bg, shake. Obvious.
                !revealed && wasWrong &&
                  "border-[color:var(--danger)] bg-[color:var(--danger)]/15 text-[color:var(--danger)] animate-shake",
                // Correct reveal — soft so it doesn't compete with Next CTA
                revealed && isCorrect &&
                  "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/60 text-[color:var(--accent-strong)]",
                revealed && !isCorrect &&
                  "border-[color:var(--border)] bg-[color:var(--surface)] opacity-30"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-semibold transition-colors flex flex-col gap-0.5">
                  {(() => {
                    const g = effectiveGloss(o, language);
                    if (!g) return "—";
                    return (
                      <>
                        <span className="leading-tight">{g.text}</span>
                        {g.secondary && (
                          <span className="text-[11px] font-medium text-[color:var(--muted)] leading-tight">
                            {g.secondary}
                          </span>
                        )}
                        {g.isFallback && (
                          <span
                            className="text-[9px] font-semibold tracking-widest uppercase opacity-60 mt-1"
                            title={
                              language === "ms"
                                ? "Terjemahan Melayu belum tersedia — ditunjukkan dalam Bahasa Inggeris"
                                : "Malay translation not yet available — shown in English"
                            }
                          >
                            {language === "ms" ? "EN" : "MS"}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </span>
                {revealed && isCorrect && (
                  <svg
                    className="text-[color:var(--accent)] animate-scale-in shrink-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    width="20"
                    height="20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {phase === "revealed" && (
        <div className="pt-4 space-y-5 animate-fade-up">
          <div className="flex flex-col gap-3">
            {/* The Next Word CTA — owns the hierarchy. Gradient, glow, larger. */}
            <button
              onClick={onNext}
              className="group relative w-full overflow-hidden rounded-2xl py-5 text-lg font-bold text-white transition-all active:scale-[0.98] hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%)",
                boxShadow:
                  "0 16px 40px -12px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.12)",
              }}
            >
              <span
                aria-hidden
                className="absolute inset-y-0 -left-full w-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-all duration-700 group-hover:left-full"
              />
              <span className="relative inline-flex items-center gap-2">
                {t.flash_next}
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
              </span>
            </button>

            <button
              onClick={() => setShowDeepDive(!showDeepDive)}
              className="flex items-center justify-center gap-2 text-xs font-semibold text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-colors py-2"
            >
              <svg 
                className={classNames("transition-transform duration-300", showDeepDive && "rotate-180")}
                viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3"
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
              {t.flash_deep_dive}
            </button>
          </div>

          {showDeepDive && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-6">
              <div className="rounded-2xl border border-[color:var(--border)] p-5 bg-[color:var(--surface)]">
                <div className="flex justify-between items-start mb-3 border-b border-[color:var(--border)] pb-2">
                  <p className="text-[10px] uppercase tracking-widest text-[color:var(--muted)] font-bold">{t.flash_lemma_root}</p>
                  <p className="text-[10px] uppercase tracking-wider text-white bg-[color:var(--accent)] px-2 py-0.5 rounded-full font-bold shadow-sm">
                    {t.flash_correct_answer}
                  </p>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                  <p className="arabic text-4xl text-[color:var(--accent-strong)]" lang="ar" dir="rtl">
                    {card.lemma}
                  </p>
                  {card.root && (
                    <p className="text-sm text-[color:var(--muted)] font-medium">
                      {t.flash_root}: <span className="arabic text-xl align-middle" lang="ar" dir="rtl">{card.root}</span>
                    </p>
                  )}
                </div>
                <p className="text-xs text-[color:var(--muted)] mt-4 font-medium flex items-center gap-2">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 8v4l3 3" />
                  </svg>
                  {t.flash_first_appears} {firstRef} ·{" "}
                  {card.count.toLocaleString()}× {t.flash_in_quran}
                </p>
              </div>

              <LemmaContext card={card} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Bottom feedback bar — fixed to viewport bottom, full-width on
   mobile / max-width on desktop, persistent. Big icon + headline so
   the user instantly knows if they got the answer right or wrong.
   ──────────────────────────────────────────────────────────────────── */
function FeedbackBar({
  tone,
  correctAnswer,
  language,
  onDismiss,
}: {
  tone: "good" | "bad";
  correctAnswer: string | null;
  language: "en" | "ms";
  onDismiss: () => void;
}) {
  const isGood = tone === "good";
  return (
    <div
      role="status"
      aria-live="polite"
      className={classNames(
        "fixed inset-x-0 bottom-0 z-[60] animate-fade-up",
        "border-t-4 shadow-[0_-12px_32px_-8px_rgba(0,0,0,0.25)]",
        isGood
          ? "bg-[color:var(--accent)] border-[color:var(--accent-strong)] text-white"
          : "bg-[color:var(--danger)] border-[color:var(--ink)] text-white"
      )}
    >
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-4 sm:py-5 flex items-center gap-4">
        {/* Big circular icon */}
        <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-full bg-white/20 grid place-items-center animate-pop">
          {isGood ? (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m5 12 5 5L20 7" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          )}
        </div>

        {/* Headline + correct-answer hint */}
        <div className="flex-1 min-w-0">
          <p className="display text-[length:var(--text-xl)] sm:text-[length:var(--text-2xl)] leading-none" style={{ fontWeight: 700 }}>
            {isGood
              ? language === "ms"
                ? "Tepat!"
                : "Correct!"
              : language === "ms"
              ? "Tidak tepat"
              : "Not quite"}
          </p>
          {!isGood && correctAnswer && (
            <p className="text-sm sm:text-base opacity-90 mt-1 truncate">
              {language === "ms" ? "Jawapan: " : "Answer: "}
              <span className="font-bold">{correctAnswer}</span>
            </p>
          )}
        </div>

        {/* Action button — only for wrong (correct shows Next Word in card) */}
        {!isGood && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white text-[color:var(--danger)] px-5 sm:px-6 py-2.5 sm:py-3 text-sm font-bold hover:bg-white/90 active:scale-95 transition-all"
          >
            {language === "ms" ? "Cuba lagi" : "Try again"}
            <span aria-hidden>→</span>
          </button>
        )}
      </div>
    </div>
  );
}
