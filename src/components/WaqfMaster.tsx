"use client";

import { useState } from "react";
import { useLearning } from "@/store/learning";
import { WAQF_SIGNS, type WaqfSign } from "@/lib/tajweed";
import { classNames } from "@/lib/format";

/* ── Question types ─────────────────────────────────────────────────────── */

type Question =
  | { kind: "sign-to-name"; sign: WaqfSign; options: WaqfSign[] }
  | { kind: "instruction-to-sign"; sign: WaqfSign; options: WaqfSign[] }
  | { kind: "action"; sign: WaqfSign; options: string[]; correct: string };

function buildQuestions(language: "en" | "ms"): Question[] {
  const signs = WAQF_SIGNS.slice(0, 8); // focus on the 8 most common
  const qs: Question[] = [];
  const rng = () => Math.random();

  for (const sign of signs) {
    const others = signs.filter((s) => s.char !== sign.char);
    const distractors = others.sort(rng).slice(0, 3);
    const opts = [sign, ...distractors].sort(rng);

    // Q1: show symbol → pick correct name
    qs.push({ kind: "sign-to-name", sign, options: opts });

    // Q2: show instruction → pick correct sign
    qs.push({ kind: "instruction-to-sign", sign, options: opts });
  }

  // Q3: action questions — "what do you do at ۘ ?"
  const actionMap: Record<string, { en: string; ms: string }[]> = {
    "م": [
      { en: "Must stop — continuing changes the meaning", ms: "Wajib berhenti — jika disambung, maknanya berubah" },
      { en: "Continue without stopping", ms: "Terus sambung, jangan berhenti" },
      { en: "Stopping is preferred", ms: "Lebih baik berhenti" },
      { en: "Brief silent pause, then continue", ms: "Berhenti seketika tanpa nafas, kemudian sambung" },
    ],
    "لا": [
      { en: "Do not stop — stopping distorts the meaning", ms: "Jangan berhenti — maknanya akan lari" },
      { en: "Must stop here", ms: "Wajib berhenti" },
      { en: "Stopping is fine", ms: "Boleh berhenti" },
      { en: "Brief pause without breath", ms: "Jeda sekejap tanpa nafas" },
    ],
    "ج": [
      { en: "May stop or continue — both are acceptable", ms: "Boleh berhenti atau sambung — kedua-duanya betul" },
      { en: "Must stop here", ms: "Wajib berhenti" },
      { en: "Must never stop", ms: "Tidak boleh berhenti langsung" },
      { en: "Stop only at the end of the verse", ms: "Berhenti di hujung ayat sahaja" },
    ],
    "س": [
      { en: "Brief silent pause — stop sound, keep breath, then continue", ms: "Henti bunyi seketika, tahan nafas, kemudian sambung" },
      { en: "Take a full breath, then continue", ms: "Tarik nafas penuh, kemudian sambung" },
      { en: "Must stop completely here", ms: "Wajib berhenti sepenuhnya" },
      { en: "Continue without any pause", ms: "Terus sambung tanpa jeda" },
    ],
  };

  for (const sign of signs) {
    const answers = actionMap[sign.char];
    if (!answers) continue;
    const correct = answers[0][language];
    const opts = answers.map((a) => a[language]).sort(rng);
    qs.push({ kind: "action", sign, options: opts, correct });
  }

  return qs.sort(rng).slice(0, 10);
}

/* ── Single question card ────────────────────────────────────────────────── */

function QuestionCard({
  q,
  language,
  onAnswer,
}: {
  q: Question;
  language: "en" | "ms";
  onAnswer: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);

  function choose(key: string, correct: boolean) {
    if (picked) return;
    setPicked(key);
    setTimeout(() => onAnswer(correct), 700);
  }

  if (q.kind === "sign-to-name") {
    return (
      <div className="space-y-5">
        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] py-8 text-center">
          <span className="text-7xl leading-none block mb-3" lang="ar">{q.sign.char}</span>
          <p className="eyebrow">{language === "ms" ? "Nama tanda ni apa?" : "What is this stop sign called?"}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {q.options.map((opt) => {
            const isCorrect = opt.char === q.sign.char;
            const isPicked = picked === opt.char;
            return (
              <button key={opt.char} onClick={() => choose(opt.char, isCorrect)} disabled={!!picked}
                className={classNames(
                  "rounded-2xl border-2 p-3 text-sm font-semibold text-center transition-all active:scale-95",
                  !picked && "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)]",
                  isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent)] text-white",
                  isPicked && !isCorrect && "border-[color:var(--danger)] bg-[color:var(--danger)] text-white animate-shake",
                  picked && !isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/40",
                  picked && !isPicked && !isCorrect && "opacity-40"
                )}>
                {opt.name[language]}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (q.kind === "instruction-to-sign") {
    return (
      <div className="space-y-5">
        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 text-center">
          <p className="eyebrow mb-2">{language === "ms" ? "Pilih tanda yang bermaksud:" : "Which sign means:"}</p>
          <p className="text-base font-semibold leading-relaxed">{q.sign.instruction[language]}</p>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {q.options.map((opt) => {
            const isCorrect = opt.char === q.sign.char;
            const isPicked = picked === opt.char;
            return (
              <button key={opt.char} onClick={() => choose(opt.char, isCorrect)} disabled={!!picked}
                className={classNames(
                  "aspect-square rounded-2xl border-2 text-3xl grid place-items-center transition-all active:scale-95",
                  !picked && "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)]",
                  isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent)] text-white",
                  isPicked && !isCorrect && "border-[color:var(--danger)] bg-[color:var(--danger)] text-white animate-shake",
                  picked && !isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/40",
                  picked && !isPicked && !isCorrect && "opacity-40"
                )} lang="ar">
                {opt.char}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // action
  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] py-6 text-center">
        <span className="text-6xl leading-none block mb-2" lang="ar">{q.sign.char}</span>
        <p className="font-bold">{q.sign.name[language]}</p>
        <p className="eyebrow mt-2">{language === "ms" ? "Kat sini, kita buat apa?" : "What do you do here?"}</p>
      </div>
      <div className="space-y-2">
        {q.options.map((opt) => {
          const isCorrect = opt === q.correct;
          const isPicked = picked === opt;
          return (
            <button key={opt} onClick={() => choose(opt, isCorrect)} disabled={!!picked}
              className={classNames(
                "w-full rounded-2xl border-2 px-4 py-3 text-sm font-medium text-left transition-all active:scale-[0.99]",
                !picked && "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)]",
                isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent)] text-white",
                isPicked && !isCorrect && "border-[color:var(--danger)] bg-[color:var(--danger)] text-white animate-shake",
                picked && !isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/40",
                picked && !isPicked && !isCorrect && "opacity-40"
              )}>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */

export function WaqfMaster() {
  const language = useLearning((s) => s.language);
  const [round, setRound] = useState(0);
  const [questions] = useState(() => buildQuestions(language));
  const [shuffled, setShuffled] = useState(questions);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  function handleAnswer(isCorrect: boolean) {
    if (isCorrect) setCorrect((c) => c + 1);
    if (idx + 1 >= shuffled.length) {
      setDone(true);
    } else {
      setIdx((i) => i + 1);
    }
  }

  function retry() {
    setShuffled(buildQuestions(language));
    setIdx(0);
    setCorrect(0);
    setDone(false);
    setRound((r) => r + 1);
  }

  const pct = Math.round(((idx + 1) / shuffled.length) * 100);
  const score = done ? Math.round((correct / shuffled.length) * 100) : 0;

  if (done) {
    return (
      <div className="card-raised p-8 text-center space-y-4 animate-fade-up">
        <div className={classNames(
          "mx-auto h-20 w-20 rounded-full grid place-items-center text-3xl shadow-[var(--shadow-glow)]",
          score >= 80 ? "bg-gradient-to-br from-[color:var(--gold)] to-[color:var(--accent)]" : "bg-[color:var(--border)]"
        )}>
          {score >= 80 ? "✦" : "↻"}
        </div>
        <p className="eyebrow text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]">
          {language === "ms" ? "Kuiz Waqaf selesai" : "Waqf Quiz complete"}
        </p>
        <p className="stat-display text-[length:var(--text-4xl)] text-[color:var(--accent-strong)]">
          {correct} <span className="text-[color:var(--muted)]">/ {shuffled.length}</span>
        </p>
        <p className="text-sm text-[color:var(--muted)]">{score}% {language === "ms" ? "tepat" : "correct"}</p>
        {score < 80 && (
          <p className="text-sm text-[color:var(--foreground)]">
            {language === "ms" ? "Bintang memerlukan 80%. Cuba lagi!" : "Star unlocks at 80%. Try again!"}
          </p>
        )}
        <button
          onClick={retry}
          className="rounded-full border border-[color:var(--border-strong)] px-6 py-2.5 text-sm font-semibold hover:border-[color:var(--accent)] transition-colors"
        >
          {language === "ms" ? "Cuba lagi" : "Try again"}
        </button>
      </div>
    );
  }

  const q = shuffled[idx];

  return (
    <div className="space-y-4">
      {/* Page header */}
      <header className="space-y-1 mb-2">
        <p className="eyebrow text-[color:var(--accent-strong)]">
          {language === "ms" ? "Tajweed · Tanda Berhenti" : "Tajweed · Stop Signs"}
        </p>
        <h1 className="display text-[length:var(--text-2xl)]" style={{ fontWeight: 700 }}>
          {language === "ms" ? "Pakar Waqaf" : "Waqf Master"}
        </h1>
        <p className="text-sm text-[color:var(--muted)]">
          {language === "ms" ? "Kuiz interaktif — 11 tanda waqaf dalam Al-Quran" : "Interactive quiz — 11 Quran stop signs"}
        </p>
      </header>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-[color:var(--muted)] tabular-nums">{idx + 1}/{shuffled.length}</span>
        <div className="flex-1 relative h-2 rounded-full bg-[color:var(--border)] overflow-hidden">
          <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--gold), var(--accent))" }} />
        </div>
        <span className="text-xs font-semibold text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] tabular-nums">
          {correct} ✓
        </span>
      </div>
      <QuestionCard key={`${round}-${idx}`} q={q} language={language} onAnswer={handleAnswer} />
    </div>
  );
}
