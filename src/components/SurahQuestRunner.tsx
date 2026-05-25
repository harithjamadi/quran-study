"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLearning } from "@/store/learning";
import { UI_STRINGS } from "@/lib/i18n";
import { effectiveGloss, type LemmaMeta } from "@/lib/learning";
import { lemmaAudioUrl } from "@/lib/frequency";
import { classNames } from "@/lib/format";

interface Props {
  surahNumber: number;
  surahName: string;
  lemmas: LemmaMeta[];
  /** Word texts per ayah (keyed by ayah number string) for the BuildTranslation stage. */
  ayahWords: Record<string, string[]>;
  /** 1 = Easy, 2 = Medium, 3 = Hard */
  difficulty: 1 | 2 | 3;
}

type Stage =
  | { kind: "memorize" }
  | { kind: "match-ar-to-gloss"; target: LemmaMeta; options: LemmaMeta[] }
  | { kind: "match-gloss-to-ar"; target: LemmaMeta; options: LemmaMeta[] }
  | { kind: "build-translation"; target: LemmaMeta; verseWordList: string[] }
  | { kind: "match-pairs"; lemmas: LemmaMeta[] }
  | { kind: "true-false"; target: LemmaMeta; pairedGloss: LemmaMeta; truthful: boolean }
  | { kind: "cloze"; target: LemmaMeta; options: LemmaMeta[]; verseWordList: string[] }
  | { kind: "listening"; target: LemmaMeta; options: LemmaMeta[] }
  | { kind: "complete" };

function seededRng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1_000_000) / 1_000_000;
  };
}
function shuffleSeeded<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function playWordAudio(card: LemmaMeta) {
  if (typeof Audio === "undefined") return;
  try {
    const a = new Audio(lemmaAudioUrl(card.sampleSurah, card.sampleAyah, card.sampleWord));
    a.play().catch(() => undefined);
  } catch {}
}

export function SurahQuestRunner({ surahNumber, surahName, lemmas, ayahWords, difficulty }: Props) {
  const language = useLearning((s) => s.language);
  const recordSurahStar = useLearning((s) => s.recordSurahStar);
  const introduceMany = useLearning((s) => s.introduceMany);
  const t = UI_STRINGS[language];

  const stages = useMemo<Stage[]>(() => {
    const rng = seededRng(`quest-${surahNumber}`);
    const list: Stage[] = [{ kind: "memorize" }];

    // Round 1 — Arabic → Meaning (all difficulties)
    for (const target of lemmas) {
      const others = lemmas.filter((l) => l.lemma !== target.lemma);
      const options = shuffleSeeded([target, ...shuffleSeeded(others, rng).slice(0, 3)], rng);
      list.push({ kind: "match-ar-to-gloss", target, options });
    }

    // Round 2 — Meaning → Arabic (all difficulties)
    for (const target of lemmas) {
      const others = lemmas.filter((l) => l.lemma !== target.lemma);
      const options = shuffleSeeded([target, ...shuffleSeeded(others, rng).slice(0, 3)], rng);
      list.push({ kind: "match-gloss-to-ar", target, options });
    }

    // Round 3 — Build Translation (Medium+)
    if (difficulty >= 2) {
      for (const target of lemmas) {
        const verseWordList = ayahWords[String(target.sampleAyah)] ?? [target.sampleText];
        list.push({ kind: "build-translation", target, verseWordList });
      }
    }

    // Round 4 — True / False (all difficulties)
    for (let i = 0; i < 2; i++) {
      const target = lemmas[i % lemmas.length];
      const truthful = rng() > 0.5;
      const pairedGloss = truthful
        ? target
        : lemmas.filter((l) => l.lemma !== target.lemma)[0];
      list.push({ kind: "true-false", target, pairedGloss, truthful });
    }

    // Round 5 — Match Pairs (Medium+)
    if (difficulty >= 2) {
      list.push({ kind: "match-pairs", lemmas });
    }

    // Round 6 — Cloze / Fill-in-blank (Hard only)
    if (difficulty >= 3) {
      for (const target of lemmas) {
        const others = lemmas.filter((l) => l.lemma !== target.lemma);
        const options = shuffleSeeded([target, ...shuffleSeeded(others, rng).slice(0, 3)], rng);
        const verseWordList = ayahWords[String(target.sampleAyah)] ?? [target.sampleText];
        list.push({ kind: "cloze", target, options, verseWordList });
      }
    }

    // Round 7 — Listening / Audio-only (Hard only)
    if (difficulty >= 3) {
      for (const target of lemmas) {
        const others = lemmas.filter((l) => l.lemma !== target.lemma);
        const options = shuffleSeeded([target, ...shuffleSeeded(others, rng).slice(0, 3)], rng);
        list.push({ kind: "listening", target, options });
      }
    }

    list.push({ kind: "complete" });
    return list;
  }, [surahNumber, lemmas, ayahWords, difficulty]);

  const [stageIdx, setStageIdx] = useState(0);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [feedback, setFeedback] = useState<{ tone: "good" | "bad"; key: number } | null>(null);

  const stage = stages[stageIdx];
  const totalQuestions = stages.filter((s) => s.kind !== "memorize" && s.kind !== "complete").length;

  useEffect(() => {
    if (stage.kind === "complete") {
      recordSurahStar(surahNumber, difficulty);
      introduceMany(lemmas.map((l) => ({ lemma: l.lemma, text: l.sampleText })));
    }
  }, [stage.kind, surahNumber, difficulty, recordSurahStar, introduceMany, lemmas]);

  const answered =
    stageIdx === 0
      ? 0
      : stages.slice(0, stageIdx).filter((s) => s.kind !== "memorize" && s.kind !== "complete").length;
  const pct = stage.kind === "complete" ? 100 : (answered / Math.max(1, totalQuestions)) * 100;

  function answer(isCorrect: boolean) {
    setFeedback({ tone: isCorrect ? "good" : "bad", key: Date.now() });
    if (isCorrect) setStats((s) => ({ ...s, correct: s.correct + 1 }));
    else setStats((s) => ({ ...s, wrong: s.wrong + 1 }));
    setTimeout(() => {
      setFeedback(null);
      setStageIdx((i) => Math.min(i + 1, stages.length - 1));
    }, 800);
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-4">
        <Link
          href="/learn"
          aria-label={t.sess_exit}
          className="h-9 w-9 grid place-items-center rounded-full border border-[color:var(--border)] text-[color:var(--muted)] hover:text-[color:var(--foreground)] hover:border-[color:var(--accent)] transition-colors"
        >
          <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden>
            <path d="M5.3 4.3a1 1 0 011.4 0L10 7.6l3.3-3.3a1 1 0 111.4 1.4L11.4 9l3.3 3.3a1 1 0 11-1.4 1.4L10 10.4l-3.3 3.3a1 1 0 11-1.4-1.4L8.6 9 5.3 5.7a1 1 0 010-1.4z" />
          </svg>
        </Link>
        <div className="flex-1">
          <p className="eyebrow text-[10px] mb-1">
            {language === "ms" ? "Cabaran Surah" : "Surah Quest"} ·{" "}
            <span className="display-italic">{surahName}</span>
          </p>
          <div className="relative h-2.5 rounded-full bg-[color:var(--border)] overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, var(--gold), var(--accent))",
                boxShadow: "0 0 12px var(--accent-glow)",
              }}
            />
          </div>
        </div>
        <div className="text-xs tabular-nums text-[color:var(--muted)] hidden sm:block">
          {stats.correct} · {stats.wrong}
        </div>
      </header>

      {/* Floating correct/wrong banner */}
      {feedback && (
        <div
          key={feedback.key}
          className={classNames(
            "fixed left-1/2 -translate-x-1/2 top-20 z-50 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold shadow-2xl animate-pop",
            feedback.tone === "good"
              ? "bg-[color:var(--accent)] text-white"
              : "bg-[color:var(--danger)] text-white"
          )}
          role="status"
        >
          {feedback.tone === "good" ? "✓ " + t.flash_correct : "✕ " + t.flash_incorrect}
        </div>
      )}

      {stage.kind === "memorize" && (
        <MemorizeStage
          key={stageIdx}
          lemmas={lemmas}
          surahName={surahName}
          onStart={() => setStageIdx(1)}
          language={language}
        />
      )}

      {stage.kind === "match-ar-to-gloss" && (
        <MatchArabicToGlossStage
          key={stageIdx}
          target={stage.target}
          options={stage.options}
          language={language}
          onAnswer={answer}
        />
      )}

      {stage.kind === "match-gloss-to-ar" && (
        <MatchGlossToArabicStage
          key={stageIdx}
          target={stage.target}
          options={stage.options}
          language={language}
          onAnswer={answer}
        />
      )}

      {stage.kind === "build-translation" && (
        <BuildTranslationStage
          key={stageIdx}
          target={stage.target}
          verseWordList={stage.verseWordList}
          allLemmas={lemmas}
          language={language}
          onAnswer={answer}
        />
      )}

      {stage.kind === "match-pairs" && (
        <MatchPairsStage
          key={stageIdx}
          lemmas={stage.lemmas}
          language={language}
          onAnswer={answer}
        />
      )}

      {stage.kind === "true-false" && (
        <TrueFalseStage
          key={stageIdx}
          target={stage.target}
          pairedGloss={stage.pairedGloss}
          truthful={stage.truthful}
          language={language}
          onAnswer={answer}
        />
      )}

      {stage.kind === "cloze" && (
        <ClozeStage
          key={stageIdx}
          target={stage.target}
          options={stage.options}
          verseWordList={stage.verseWordList}
          language={language}
          onAnswer={answer}
        />
      )}

      {stage.kind === "listening" && (
        <ListeningStage
          key={stageIdx}
          target={stage.target}
          options={stage.options}
          language={language}
          onAnswer={answer}
        />
      )}

      {stage.kind === "complete" && (
        <CompleteStage
          surahName={surahName}
          surahNumber={surahNumber}
          correct={stats.correct}
          total={totalQuestions}
          language={language}
        />
      )}
    </div>
  );
}

/* ── Memorize ── */
function MemorizeStage({
  lemmas,
  surahName,
  onStart,
  language,
}: {
  lemmas: LemmaMeta[];
  surahName: string;
  onStart: () => void;
  language: "en" | "ms";
}) {
  return (
    <div className="card-raised p-6 sm:p-8 space-y-4 animate-fade-up">
      <div className="text-center">
        <p className="eyebrow mb-2 text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]">
          {language === "ms" ? "Cuba ingat" : "Try to remember"}
        </p>
        <h2 className="display text-[length:var(--text-xl)]" style={{ fontWeight: 600 }}>
          {surahName}
        </h2>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
        {lemmas.map((l) => {
          const g = effectiveGloss(l, language);
          return (
            <li
              key={l.lemma}
              className="rounded-2xl border-2 border-[color:var(--accent)]/40 bg-[color:var(--accent-soft)]/20 p-4 flex items-center gap-4"
            >
              <button
                type="button"
                onClick={() => playWordAudio(l)}
                aria-label="Play"
                className="h-9 w-9 shrink-0 rounded-full bg-[color:var(--accent)] text-white grid place-items-center hover:bg-[color:var(--accent-strong)] transition-colors active:scale-95"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
                  <path d="M8 5l12 7-12 7z" />
                </svg>
              </button>
              <div className="flex-1 min-w-0">
                <p
                  className="arabic text-[length:var(--arabic-sm)] text-[color:var(--accent-strong)] leading-none"
                  lang="ar"
                  dir="rtl"
                >
                  {l.sampleText}
                </p>
                <p className="text-sm font-semibold text-[color:var(--foreground)] mt-1.5">
                  {g?.text ?? "—"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <button
        onClick={onStart}
        className="w-full mt-4 rounded-2xl py-4 text-base font-bold text-white transition-all active:scale-[0.98] hover:-translate-y-0.5"
        style={{
          background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
          boxShadow: "0 12px 32px -8px var(--accent-glow)",
        }}
      >
        {language === "ms" ? "MULA" : "START"} →
      </button>
    </div>
  );
}

/* ── Round 1: see the Arabic word, pick the meaning ── */
function MatchArabicToGlossStage({
  target,
  options,
  language,
  onAnswer,
}: {
  target: LemmaMeta;
  options: LemmaMeta[];
  language: "en" | "ms";
  onAnswer: (correct: boolean) => void;
}) {
  const t = UI_STRINGS[language];
  const [picked, setPicked] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = new Audio(lemmaAudioUrl(target.sampleSurah, target.sampleAyah, target.sampleWord));
    audioRef.current = a;
    a.play().catch(() => undefined);
    return () => { a.pause(); };
  }, [target.lemma, target.sampleSurah, target.sampleAyah, target.sampleWord]);

  const pick = (lemma: string) => {
    if (picked) return;
    setPicked(lemma);
    setTimeout(() => onAnswer(lemma === target.lemma), 350);
  };

  return (
    <div className="card-raised p-6 sm:p-10 animate-fade-up">
      <p className="eyebrow text-center mb-4">{t.flash_question}</p>
      <p
        className="arabic text-center leading-none text-[color:var(--foreground)] mb-3"
        lang="ar"
        dir="rtl"
        style={{ fontSize: "var(--arabic-xl)" }}
      >
        {target.sampleText}
      </p>
      {target.translit && (
        <p className="text-center display-italic text-[color:var(--muted-strong)] mb-6">
          {target.translit}
        </p>
      )}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => audioRef.current?.play().catch(() => undefined)}
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium hover:border-[color:var(--accent)] transition-all"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
            <path d="M8 5l12 7-12 7z" />
          </svg>
          {t.flash_replay}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((o) => {
          const g = effectiveGloss(o, language);
          const isPicked = picked === o.lemma;
          const isCorrect = o.lemma === target.lemma;
          return (
            <button
              key={o.lemma}
              onClick={() => pick(o.lemma)}
              disabled={picked !== null}
              className={classNames(
                "rounded-2xl border-2 px-4 py-4 text-left transition-all duration-300 active:scale-[0.98] min-h-[60px]",
                !picked && "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]/30",
                picked && isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent)] text-white",
                picked && isPicked && !isCorrect && "border-[color:var(--danger)] bg-[color:var(--danger)] text-white animate-shake",
                picked && !isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/60",
                picked && !isPicked && !isCorrect && "opacity-40"
              )}
            >
              <span className="text-[15px] font-semibold">{g?.text ?? "—"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Round 2: see the meaning, pick the Arabic word ── */
function MatchGlossToArabicStage({
  target,
  options,
  language,
  onAnswer,
}: {
  target: LemmaMeta;
  options: LemmaMeta[];
  language: "en" | "ms";
  onAnswer: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const g = effectiveGloss(target, language);

  const pick = (lemma: string) => {
    if (picked) return;
    setPicked(lemma);
    setTimeout(() => onAnswer(lemma === target.lemma), 350);
  };

  return (
    <div className="card-raised p-6 sm:p-10 animate-fade-up">
      <p className="eyebrow text-center mb-4">
        {language === "ms" ? "Pilih kata Arab yang sepadan" : "Pick the matching Arabic word"}
      </p>
      <p className="display text-center text-[length:var(--text-3xl)] mb-8" style={{ fontWeight: 600 }}>
        &ldquo;{g?.text ?? "—"}&rdquo;
      </p>
      <div className="grid grid-cols-2 gap-3">
        {options.map((o) => {
          const isPicked = picked === o.lemma;
          const isCorrect = o.lemma === target.lemma;
          return (
            <button
              key={o.lemma}
              onClick={() => pick(o.lemma)}
              disabled={picked !== null}
              className={classNames(
                "rounded-2xl border-2 px-3 py-6 text-center transition-all duration-300 active:scale-[0.98] min-h-[100px]",
                !picked && "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]/30",
                picked && isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/60",
                picked && isPicked && !isCorrect && "border-[color:var(--danger)] bg-[color:var(--danger)]/15 animate-shake",
                picked && !isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/60",
                picked && !isPicked && !isCorrect && "opacity-40"
              )}
            >
              <span
                className="arabic text-[length:var(--arabic-md)] text-[color:var(--accent-strong)] leading-none"
                lang="ar"
                dir="rtl"
              >
                {o.sampleText}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Round 3: see the Arabic in context, tap chips in order to build its meaning ── */
function BuildTranslationStage({
  target,
  verseWordList,
  allLemmas,
  language,
  onAnswer,
}: {
  target: LemmaMeta;
  verseWordList: string[];
  allLemmas: LemmaMeta[];
  language: "en" | "ms";
  onAnswer: (correct: boolean) => void;
}) {
  const g = effectiveGloss(target, language);
  const correctAnswer = useMemo(
    () => (g?.text ?? "").trim().split(/\s+/).filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [chips, setChips] = useState<string[]>(() => {
    const decoyPool: string[] = [];
    for (const l of allLemmas) {
      if (l.lemma === target.lemma) continue;
      const lg = effectiveGloss(l, language);
      if (lg?.text) {
        for (const w of lg.text.trim().split(/\s+/)) {
          if (w && !correctAnswer.includes(w) && !decoyPool.includes(w)) {
            decoyPool.push(w);
          }
        }
      }
    }
    // Pad with generic fillers so we always have enough decoys
    const fillers =
      language === "ms"
        ? ["adalah", "yang", "dengan", "atau", "ini", "bagi", "kepada", "oleh"]
        : ["is", "are", "and", "from", "this", "that", "upon", "among"];
    for (const f of fillers) {
      if (decoyPool.length >= 6) break;
      if (!correctAnswer.includes(f) && !decoyPool.includes(f)) decoyPool.push(f);
    }
    const targetDecoysCount = Math.max(3, 7 - correctAnswer.length);
    const all = [...correctAnswer, ...decoyPool.slice(0, targetDecoysCount)];
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all;
  });

  const [placed, setPlaced] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const targetIdx = target.sampleWord - 1; // sampleWord is 1-indexed

  function placeChip(chipIdx: number) {
    if (submitted) return;
    const word = chips[chipIdx];
    setPlaced((p) => [...p, word]);
    setChips((c) => c.filter((_, i) => i !== chipIdx));
  }

  function removeChip(placedIdx: number) {
    if (submitted) return;
    const word = placed[placedIdx];
    setPlaced((p) => p.filter((_, i) => i !== placedIdx));
    setChips((c) => [...c, word]);
  }

  function checkAnswer() {
    if (submitted || placed.length === 0) return;
    setSubmitted(true);
    const isCorrect =
      placed.length === correctAnswer.length &&
      placed.every((w, i) => w === correctAnswer[i]);
    setTimeout(() => onAnswer(isCorrect), 400);
  }

  return (
    <div className="card-raised p-6 sm:p-8 animate-fade-up space-y-5">
      <div className="text-center">
        <p className="eyebrow mb-1">
          {language === "ms" ? "Bina terjemahan" : "Build the translation"}
        </p>
        <p className="text-xs text-[color:var(--muted)]">
          {language === "ms"
            ? "Ketik perkataan mengikut urutan yang betul"
            : "Tap words in the correct order"}
        </p>
      </div>

      {/* Verse display — target word highlighted */}
      <div className="rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] p-4">
        <p className="arabic text-center leading-loose" lang="ar" dir="rtl" style={{ fontSize: "var(--arabic-md)" }}>
          {verseWordList.map((word, i) => (
            <span
              key={i}
              className={classNames(
                "inline-block mx-0.5",
                i === targetIdx
                  ? "text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] underline decoration-2 underline-offset-[6px] font-bold"
                  : "text-[color:var(--foreground)]"
              )}
            >
              {word}
            </span>
          ))}
        </p>
        {target.translit && (
          <p className="text-center text-xs display-italic text-[color:var(--muted)] mt-2">
            {target.translit}
          </p>
        )}
      </div>

      {/* Answer area — placed chips */}
      <div
        className={classNames(
          "min-h-14 rounded-2xl border-2 border-dashed p-3 flex flex-wrap items-center gap-2 transition-colors",
          placed.length > 0
            ? "border-[color:var(--accent)]/50 bg-[color:var(--accent-soft)]/10"
            : "border-[color:var(--border)]"
        )}
      >
        {placed.length === 0 ? (
          <span className="text-sm text-[color:var(--muted)] w-full text-center select-none">
            {language === "ms" ? "Jawapan anda akan muncul di sini…" : "Your answer will appear here…"}
          </span>
        ) : (
          placed.map((word, i) => (
            <button
              key={i}
              onClick={() => removeChip(i)}
              disabled={submitted}
              className="px-3 py-1.5 rounded-xl bg-[color:var(--accent)] text-white text-sm font-semibold transition-all hover:bg-[color:var(--accent-strong)] active:scale-95 disabled:cursor-default"
            >
              {word}
            </button>
          ))
        )}
      </div>

      {/* Available chips */}
      <div className="flex flex-wrap gap-2 justify-center min-h-10">
        {chips.map((word, i) => (
          <button
            key={`${word}-${i}`}
            onClick={() => placeChip(i)}
            disabled={submitted}
            className="px-3 py-2 rounded-xl border-2 border-[color:var(--border)] bg-[color:var(--surface)] text-sm font-semibold transition-all hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]/30 active:scale-95 disabled:opacity-40"
          >
            {word}
          </button>
        ))}
      </div>

      {/* Check button */}
      <button
        onClick={checkAnswer}
        disabled={placed.length === 0 || submitted}
        className={classNames(
          "w-full rounded-2xl py-4 text-base font-bold transition-all active:scale-[0.98]",
          placed.length > 0 && !submitted
            ? "text-white hover:-translate-y-0.5"
            : "bg-[color:var(--border)] text-[color:var(--muted)] cursor-not-allowed"
        )}
        style={
          placed.length > 0 && !submitted
            ? {
                background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
                boxShadow: "0 12px 32px -8px var(--accent-glow)",
              }
            : undefined
        }
      >
        {language === "ms" ? "SEMAK" : "CHECK"} →
      </button>
    </div>
  );
}

/* ── Round 4 (interleaved): does this Arabic = this meaning? ── */
function TrueFalseStage({
  target,
  pairedGloss,
  truthful,
  language,
  onAnswer,
}: {
  target: LemmaMeta;
  pairedGloss: LemmaMeta;
  truthful: boolean;
  language: "en" | "ms";
  onAnswer: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<boolean | null>(null);
  const g = effectiveGloss(pairedGloss, language);

  const pick = (claim: boolean) => {
    if (picked !== null) return;
    setPicked(claim);
    setTimeout(() => onAnswer(claim === truthful), 350);
  };

  return (
    <div className="card-raised p-6 sm:p-10 animate-fade-up">
      <p className="eyebrow text-center mb-6">
        {language === "ms" ? "Adakah ini sepadan?" : "Does this match?"}
      </p>
      <p
        className="arabic text-center text-[color:var(--accent-strong)] mb-4 leading-none"
        lang="ar"
        dir="rtl"
        style={{ fontSize: "var(--arabic-lg)" }}
      >
        {target.sampleText}
      </p>
      <div className="flex items-center justify-center my-4 text-[color:var(--gold)]" aria-hidden>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4" />
        </svg>
      </div>
      <p className="text-center display-italic text-[length:var(--text-xl)] text-[color:var(--foreground)] mb-8">
        &ldquo;{g?.text ?? "—"}&rdquo;
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => pick(false)}
          disabled={picked !== null}
          className={classNames(
            "rounded-2xl border-2 py-4 text-base font-bold transition-all active:scale-[0.98]",
            picked === null && "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--danger)] hover:bg-[color:var(--danger)]/10",
            picked === false && truthful === false && "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/60",
            picked === false && truthful === true && "border-[color:var(--danger)] bg-[color:var(--danger)]/15 animate-shake",
            picked !== null && picked !== false && "opacity-40"
          )}
        >
          {language === "ms" ? "SALAH" : "FALSE"}
        </button>
        <button
          onClick={() => pick(true)}
          disabled={picked !== null}
          className={classNames(
            "rounded-2xl border-2 py-4 text-base font-bold transition-all active:scale-[0.98]",
            picked === null && "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]/40",
            picked === true && truthful === true && "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/60",
            picked === true && truthful === false && "border-[color:var(--danger)] bg-[color:var(--danger)]/15 animate-shake",
            picked !== null && picked !== true && "opacity-40"
          )}
        >
          {language === "ms" ? "BETUL" : "TRUE"}
        </button>
      </div>
    </div>
  );
}

/* ── Round 5: tap matching Arabic ↔ meaning tile pairs ── */
function MatchPairsStage({
  lemmas,
  language,
  onAnswer,
}: {
  lemmas: LemmaMeta[];
  language: "en" | "ms";
  onAnswer: (correct: boolean) => void;
}) {
  type Tile = { id: string; kind: "ar" | "gloss"; lemmaKey: string; label: string };

  const [tiles] = useState<Tile[]>(() => {
    const list: Tile[] = [];
    for (const l of lemmas) {
      const g = effectiveGloss(l, language);
      list.push({ id: `ar-${l.lemma}`, kind: "ar", lemmaKey: l.lemma, label: l.sampleText });
      list.push({ id: `gl-${l.lemma}`, kind: "gloss", lemmaKey: l.lemma, label: g?.text ?? "—" });
    }
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  });

  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [shaking, setShaking] = useState<Set<string>>(new Set());
  const [mistakes, setMistakes] = useState(0);

  function tap(tile: Tile) {
    if (matched.has(tile.lemmaKey) || shaking.size > 0) return;

    if (!selected) {
      setSelected(tile.id);
      return;
    }
    if (selected === tile.id) {
      setSelected(null);
      return;
    }

    const selTile = tiles.find((t) => t.id === selected)!;

    if (selTile.lemmaKey === tile.lemmaKey && selTile.kind !== tile.kind) {
      const next = new Set([...matched, tile.lemmaKey]);
      setMatched(next);
      setSelected(null);
      if (next.size === lemmas.length) {
        setTimeout(() => onAnswer(mistakes === 0), 900);
      }
    } else {
      setMistakes((m) => m + 1);
      const badIds = new Set([selected, tile.id]);
      setShaking(badIds);
      setSelected(null);
      setTimeout(() => setShaking(new Set()), 650);
    }
  }

  const allMatched = matched.size === lemmas.length;

  return (
    <div className="card-raised p-6 sm:p-8 animate-fade-up space-y-5">
      <div className="text-center">
        <p className="eyebrow mb-1">
          {language === "ms" ? "Padankan pasangan" : "Match the pairs"}
        </p>
        <p className="text-xs text-[color:var(--muted)]">
          {language === "ms" ? "Ketik dua kad yang sepadan" : "Tap two matching cards"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => {
          const isMatched = matched.has(tile.lemmaKey);
          const isSelected = selected === tile.id;
          const isShaking = shaking.has(tile.id);

          return (
            <button
              key={tile.id}
              onClick={() => tap(tile)}
              disabled={isMatched || allMatched}
              className={classNames(
                "relative rounded-2xl border-2 px-3 py-5 min-h-[88px] flex items-center justify-center transition-all duration-200 active:scale-[0.97]",
                isMatched &&
                  "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/20 opacity-50 cursor-default",
                isSelected && !isShaking &&
                  "border-[color:var(--gold)] bg-[color:var(--gold)]/10 scale-[1.03] shadow-lg",
                isShaking &&
                  "border-[color:var(--danger)] bg-[color:var(--danger)]/10 animate-shake",
                !isMatched && !isSelected && !isShaking &&
                  "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]/10"
              )}
            >
              {tile.kind === "ar" ? (
                <span
                  className="arabic text-[length:var(--arabic-sm)] text-[color:var(--accent-strong)] leading-none"
                  lang="ar"
                  dir="rtl"
                >
                  {tile.label}
                </span>
              ) : (
                <span className="text-sm font-semibold text-[color:var(--foreground)] text-center leading-snug">
                  {tile.label}
                </span>
              )}
              {isMatched && (
                <span className="absolute inset-0 flex items-center justify-center text-[color:var(--accent)] text-xl pointer-events-none">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2">
        {lemmas.map((l) => (
          <div
            key={l.lemma}
            className={classNames(
              "h-2 rounded-full transition-all duration-300",
              matched.has(l.lemma)
                ? "w-6 bg-[color:var(--accent)]"
                : "w-2 bg-[color:var(--border)]"
            )}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Round 6: see the verse with a blank, pick the missing Arabic word ── */
function ClozeStage({
  target,
  options,
  verseWordList,
  language,
  onAnswer,
}: {
  target: LemmaMeta;
  options: LemmaMeta[];
  verseWordList: string[];
  language: "en" | "ms";
  onAnswer: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const targetIdx = target.sampleWord - 1;

  const pick = (lemma: string) => {
    if (picked) return;
    setPicked(lemma);
    setTimeout(() => onAnswer(lemma === target.lemma), 350);
  };

  return (
    <div className="card-raised p-6 sm:p-8 animate-fade-up space-y-5">
      <div className="text-center">
        <p className="eyebrow mb-1">
          {language === "ms" ? "Isi tempat kosong" : "Fill in the blank"}
        </p>
        <p className="text-xs text-[color:var(--muted)]">
          {language === "ms"
            ? "Pilih kata Arab yang hilang dalam ayat ini"
            : "Pick the missing Arabic word in this verse"}
        </p>
      </div>

      {/* Verse with blank */}
      <div className="rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] p-4">
        <p className="arabic text-center leading-loose" lang="ar" dir="rtl" style={{ fontSize: "var(--arabic-md)" }}>
          {verseWordList.map((word, i) => (
            <span key={i} className="inline-block mx-0.5">
              {i === targetIdx ? (
                <span
                  className={classNames(
                    "inline-block min-w-[3ch] border-b-2 border-dashed transition-all duration-300 text-center",
                    !picked && "border-[color:var(--gold)] text-transparent",
                    picked && picked === target.lemma && "border-[color:var(--accent)] text-[color:var(--accent-strong)]",
                    picked && picked !== target.lemma && "border-[color:var(--danger)] text-[color:var(--danger)]"
                  )}
                >
                  {picked ? target.sampleText : "______"}
                </span>
              ) : (
                <span className="text-[color:var(--foreground)]">{word}</span>
              )}
            </span>
          ))}
        </p>
      </div>

      {/* Options — Arabic words to choose from */}
      <div className="grid grid-cols-2 gap-3">
        {options.map((o) => {
          const isPicked = picked === o.lemma;
          const isCorrect = o.lemma === target.lemma;
          return (
            <button
              key={o.lemma}
              onClick={() => pick(o.lemma)}
              disabled={picked !== null}
              className={classNames(
                "rounded-2xl border-2 px-3 py-5 text-center transition-all duration-300 active:scale-[0.98] min-h-[80px]",
                !picked && "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]/30",
                picked && isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/60",
                picked && isPicked && !isCorrect && "border-[color:var(--danger)] bg-[color:var(--danger)]/15 animate-shake",
                picked && !isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/60",
                picked && !isPicked && !isCorrect && "opacity-40"
              )}
            >
              <span
                className="arabic text-[length:var(--arabic-sm)] text-[color:var(--accent-strong)] leading-none"
                lang="ar"
                dir="rtl"
              >
                {o.sampleText}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Round 7: hear audio, pick the meaning (no Arabic text shown) ── */
function ListeningStage({
  target,
  options,
  language,
  onAnswer,
}: {
  target: LemmaMeta;
  options: LemmaMeta[];
  language: "en" | "ms";
  onAnswer: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    const a = new Audio(lemmaAudioUrl(target.sampleSurah, target.sampleAyah, target.sampleWord));
    audioRef.current = a;
    a.play().catch(() => undefined);
    a.addEventListener("play", () => setPlayed(true), { once: true });
    return () => { a.pause(); };
  }, [target.lemma, target.sampleSurah, target.sampleAyah, target.sampleWord]);

  const replay = () => {
    audioRef.current?.play().catch(() => undefined);
    setPlayed(true);
  };

  const pick = (lemma: string) => {
    if (picked) return;
    setPicked(lemma);
    setTimeout(() => onAnswer(lemma === target.lemma), 350);
  };

  return (
    <div className="card-raised p-6 sm:p-10 animate-fade-up space-y-6">
      <div className="text-center">
        <p className="eyebrow mb-1">
          {language === "ms" ? "Ujian pendengaran" : "Listening challenge"}
        </p>
        <p className="text-xs text-[color:var(--muted)]">
          {language === "ms"
            ? "Dengar bacaan dan pilih maksudnya"
            : "Listen to the recitation and pick its meaning"}
        </p>
      </div>

      {/* Big play button — the only visual cue */}
      <div className="flex justify-center">
        <button
          onClick={replay}
          className={classNames(
            "h-24 w-24 rounded-full grid place-items-center transition-all active:scale-95 shadow-lg",
            played
              ? "bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent-strong)]"
              : "bg-[color:var(--gold)] text-black hover:bg-[color:var(--gold-strong)] animate-pulse"
          )}
          aria-label={language === "ms" ? "Main semula" : "Play again"}
        >
          <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor" aria-hidden>
            <path d="M8 5l12 7-12 7z" />
          </svg>
        </button>
      </div>

      {/* Gloss options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((o) => {
          const g = effectiveGloss(o, language);
          const isPicked = picked === o.lemma;
          const isCorrect = o.lemma === target.lemma;
          return (
            <button
              key={o.lemma}
              onClick={() => pick(o.lemma)}
              disabled={picked !== null}
              className={classNames(
                "rounded-2xl border-2 px-4 py-4 text-left transition-all duration-300 active:scale-[0.98] min-h-[60px]",
                !picked && "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]/30",
                picked && isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent)] text-white",
                picked && isPicked && !isCorrect && "border-[color:var(--danger)] bg-[color:var(--danger)] text-white animate-shake",
                picked && !isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/60",
                picked && !isPicked && !isCorrect && "opacity-40"
              )}
            >
              <span className="text-[15px] font-semibold">{g?.text ?? "—"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Completion ── */
function CompleteStage({
  surahName,
  surahNumber,
  correct,
  total,
  language,
}: {
  surahName: string;
  surahNumber: number;
  correct: number;
  total: number;
  language: "en" | "ms";
}) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const isPerfect = correct === total;
  return (
    <div className="card-raised relative overflow-hidden p-8 sm:p-12 text-center animate-fade-up">
      <div
        aria-hidden
        className="absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-[color:var(--gold)]/20 blur-3xl"
      />
      <div className="relative">
        <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-br from-[color:var(--gold)] to-[color:var(--accent)] text-white text-4xl mb-5 shadow-[var(--shadow-glow)] animate-pop">
          {isPerfect ? "✦" : "✓"}
        </div>
        <p className="eyebrow text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] mb-2">
          {language === "ms" ? "Cabaran selesai" : "Quest complete"}
        </p>
        <h1 className="display text-[length:var(--text-3xl)] mb-2" style={{ fontWeight: 600 }}>
          {surahName}
        </h1>
        <p className="stat-display text-[length:var(--text-4xl)] text-[color:var(--accent-strong)] mb-1">
          {correct} <span className="text-[color:var(--muted)]">/ {total}</span>
        </p>
        <p className="text-sm text-[color:var(--muted)] mb-3">
          {pct}% {language === "ms" ? "tepat" : "correct"}
        </p>
        {isPerfect && (
          <p className="text-sm font-bold text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] mb-6">
            {language === "ms" ? "🌟 Sempurna! Surah seterusnya dibuka." : "🌟 Perfect! Next surah unlocked."}
          </p>
        )}
        {!isPerfect && (
          <p className="text-sm text-[color:var(--muted)] mb-6">
            {language === "ms"
              ? "Cuba lagi untuk membuka surah seterusnya."
              : "Try again to unlock the next surah."}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/surah/${surahNumber}`}
            className="touch-target rounded-full bg-[color:var(--accent)] text-white px-6 py-3 text-sm font-semibold hover:bg-[color:var(--accent-strong)] hover:shadow-[var(--shadow-glow)] transition-all"
          >
            {language === "ms" ? "Baca surah" : "Read surah"}
          </Link>
          <Link
            href="/learn"
            className="touch-target rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-6 py-3 text-sm font-semibold hover:border-[color:var(--accent)] transition-all"
          >
            {language === "ms" ? "Papan pemuka" : "Dashboard"}
          </Link>
        </div>
      </div>
    </div>
  );
}
