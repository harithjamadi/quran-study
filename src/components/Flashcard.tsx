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

  const onPick = (idx: number) => {
    if (phase !== "guessing") return;
    
    setPickedIndex(idx);
    const isCorrect = idx === correctIndex;
    
    if (isCorrect) {
      // eslint-disable-next-line react-hooks/purity
      const now = Date.now();
      const duration = now - startTime.current;
      const grade = autoGrade(attempts === 0, duration);
      onResult(grade);
      setPhase("revealed");
    } else {
      setAttempts((a) => a + 1);
    }
  };

  const replay = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => undefined);
  };

  return (
    <div className="card p-6 sm:p-8 space-y-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-[color:var(--muted)] mb-3">
          {t.flash_question}
        </p>
        <p
          className="arabic text-5xl sm:text-6xl text-[color:var(--accent-strong)]"
          lang="ar"
          dir="rtl"
        >
          {card.sampleText}
        </p>
        {card.translit && (
          <p className="mt-2 italic text-[color:var(--muted)]">{card.translit}</p>
        )}
        <button
          type="button"
          onClick={replay}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border)] px-4 py-1.5 text-sm font-medium text-[color:var(--accent-strong)] hover:bg-[color:var(--accent-soft)]/40 transition-colors"
          aria-label="Play audio"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
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
                "group relative rounded-2xl border-2 px-4 py-4 text-left transition-all active:scale-[0.98]",
                !revealed && !wasWrong && "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)] hover:shadow-md",
                !revealed && wasWrong && "border-[color:var(--danger)] bg-[color:var(--danger)]/5 opacity-60 grayscale-[0.5]",
                revealed && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent)] text-white shadow-lg shadow-[color:var(--accent)]/30 scale-[1.02] z-10",
                revealed && !isCorrect && "border-[color:var(--border)] bg-[color:var(--surface)] opacity-40 grayscale"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={classNames(
                    "text-[15px] font-bold transition-colors flex items-baseline gap-1.5",
                  )}
                >
                  {(() => {
                    const g = effectiveGloss(o, language);
                    if (!g) return "—";
                    return (
                      <>
                        <span>{g.text}</span>
                        {g.isFallback && (
                          <span
                            className="text-[9px] font-semibold tracking-widest uppercase opacity-60"
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
                  <svg className="text-white animate-in zoom-in duration-300" viewBox="0 0 20 20" fill="currentColor" width="22" height="22">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {phase === "revealed" && (
        <div className="pt-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col gap-4">
            <button
              onClick={onNext}
              className="w-full rounded-2xl bg-[color:var(--accent)] py-4 text-lg font-bold text-white shadow-xl shadow-[color:var(--accent)]/30 hover:bg-[color:var(--accent-strong)] transition-all active:scale-[0.97]"
            >
              {t.flash_next} →
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
