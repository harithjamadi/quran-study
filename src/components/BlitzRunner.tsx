"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLearning } from "@/store/learning";
import { classNames } from "@/lib/format";
import { getTajweedRule, type TajweedRule } from "@/lib/tajweed";
import {
  collectRuleHits,
  buildRuleOptions,
  seededRng,
  shuffleSeeded,
  type RuleHit,
} from "@/lib/tajweed-learning";

interface Props {
  surahNumber: number;
  surahName: string;
  tajweedSurah: Record<string, string>;
}

const BLITZ_SECONDS = 60;
const BONUS_SECONDS = 3;

export function BlitzRunner({ surahNumber, surahName, tajweedSurah }: Props) {
  const language = useLearning((s) => s.language);
  const blitzBests = useLearning((s) => s.blitzBests ?? {});
  const setBlitzBest = useLearning((s) => s.setBlitzBest);
  const recordTajweedAnswer = useLearning((s) => s.recordTajweedAnswer);

  const personalBest = blitzBests[surahNumber] ?? 0;

  const [phase, setPhase] = useState<"ready" | "playing" | "done">("ready");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(BLITZ_SECONDS);
  const [seedCounter, setSeedCounter] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allHits = useMemo(() => collectRuleHits(tajweedSurah), [tajweedSurah]);

  const { hit, options } = useMemo(() => {
    if (allHits.length === 0) return { hit: null, options: [] };
    const rng = seededRng(`blitz-${surahNumber}-${seedCounter}`);
    const shuffled = shuffleSeeded(allHits, rng);
    const h = shuffled[0] as RuleHit;
    const surahRules = Array.from(
      new Map(allHits.map((x) => [x.code, x.rule])).values()
    );
    return { hit: h, options: buildRuleOptions(h.rule, 4, rng, surahRules) };
  }, [allHits, surahNumber, seedCounter]);

  useEffect(() => {
    if (phase !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase("done");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase]);

  useEffect(() => {
    if (phase === "done") {
      setBlitzBest(surahNumber, score);
    }
  }, [phase, score, surahNumber, setBlitzBest]);

  function start() {
    setPhase("playing");
    setScore(0);
    setTimeLeft(BLITZ_SECONDS);
    setSeedCounter(1);
    setPicked(null);
    setFlash(null);
  }

  function answer(code: string) {
    if (!hit || picked || phase !== "playing") return;
    const isCorrect = code === hit.rule.code;
    setPicked(code);
    setFlash(isCorrect ? "correct" : "wrong");
    recordTajweedAnswer(hit.rule.code, isCorrect);
    if (isCorrect) {
      setScore((s) => s + 1);
      setTimeLeft((t) => Math.min(t + BONUS_SECONDS, BLITZ_SECONDS));
    }
    setTimeout(() => {
      setPicked(null);
      setFlash(null);
      setSeedCounter((c) => c + 1);
    }, 280);
  }

  const timerPct = (timeLeft / BLITZ_SECONDS) * 100;
  const timerColor =
    timeLeft > 20 ? "var(--accent)" : timeLeft > 10 ? "var(--gold)" : "var(--danger)";

  if (phase === "ready") {
    return (
      <div className="card-raised p-8 text-center space-y-5 animate-fade-up">
        <div>
          <p className="eyebrow text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] mb-2">
            {language === "ms" ? "Cabaran 60 Saat" : "60-Second Blitz"}
          </p>
          <h2 className="display text-[length:var(--text-2xl)]" style={{ fontWeight: 600 }}>
            {surahName}
          </h2>
        </div>
        <div className="rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] p-5 space-y-2 text-sm">
          <p>
            {language === "ms"
              ? `Teka hukum tajwid — jawapan betul tambah ${BONUS_SECONDS}s`
              : `Name the tajweed rule — each correct adds +${BONUS_SECONDS}s`}
          </p>
          <p className="text-[color:var(--muted)]">
            {language === "ms" ? "Tiada penalti. Jawab sebanyak mungkin!" : "No penalty. Answer as many as you can!"}
          </p>
        </div>
        {personalBest > 0 && (
          <p className="text-sm font-semibold text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]">
            {language === "ms" ? `Rekod peribadi: ${personalBest}` : `Personal best: ${personalBest}`}
          </p>
        )}
        <button
          onClick={start}
          className="w-full rounded-2xl py-4 text-base font-bold text-white active:scale-[0.98] hover:-translate-y-0.5 transition-all"
          style={{
            background: "linear-gradient(135deg, var(--gold), var(--accent))",
            boxShadow: "0 12px 32px -8px var(--accent-glow)",
          }}
        >
          {language === "ms" ? "MULA ⚡" : "START ⚡"}
        </button>
        <Link href="/learn" className="block text-sm text-[color:var(--muted)] hover:text-[color:var(--accent)] transition-colors">
          {language === "ms" ? "← Kembali" : "← Back"}
        </Link>
      </div>
    );
  }

  if (phase === "done") {
    const isNewBest = score > personalBest;
    return (
      <div className="card-raised p-8 text-center space-y-5 animate-fade-up">
        <p className="eyebrow text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] mb-1">
          {language === "ms" ? "Masa habis!" : "Time's up!"}
        </p>
        <p className="stat-display text-[clamp(4rem,3rem+4vw,6rem)] text-[color:var(--accent-strong)] tabular-nums leading-none">
          {score}
        </p>
        <p className="text-sm text-[color:var(--muted)]">
          {language === "ms" ? "jawapan betul" : "correct answers"}
        </p>
        {isNewBest && (
          <div className="rounded-2xl border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/10 px-4 py-3 animate-pop">
            <p className="font-bold text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]">
              {language === "ms" ? "🏆 Rekod peribadi baru!" : "🏆 New personal best!"}
            </p>
          </div>
        )}
        {!isNewBest && personalBest > 0 && (
          <p className="text-sm text-[color:var(--muted)]">
            {language === "ms" ? `Rekod peribadi: ${personalBest}` : `Personal best: ${personalBest}`}
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={start}
            className="flex-1 rounded-2xl py-3 text-sm font-bold text-white active:scale-[0.98] transition-all"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-strong))", boxShadow: "0 8px 24px -8px var(--accent-glow)" }}
          >
            {language === "ms" ? "CUBA LAGI ⚡" : "PLAY AGAIN ⚡"}
          </button>
          <Link
            href="/learn"
            className="flex-1 rounded-2xl py-3 text-sm font-bold border border-[color:var(--border-strong)] bg-[color:var(--surface)] hover:border-[color:var(--accent)] transition-all text-center"
          >
            {language === "ms" ? "Selesai" : "Done"}
          </Link>
        </div>
      </div>
    );
  }

  // Playing phase
  return (
    <div className="space-y-4 animate-fade-up">
      {/* Timer bar + score */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative h-3 rounded-full bg-[color:var(--border)] overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 linear"
            style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
          />
        </div>
        <div className="text-right shrink-0">
          <p
            className={classNames(
              "stat-display text-[length:var(--text-2xl)] tabular-nums leading-none",
              timeLeft <= 10 ? "text-[color:var(--danger)]" : "text-[color:var(--foreground)]"
            )}
          >
            {timeLeft}s
          </p>
          <p className="text-[10px] text-[color:var(--muted)] tabular-nums">
            {score} {language === "ms" ? "betul" : "correct"}
          </p>
        </div>
      </div>

      {/* Flash overlay */}
      {flash && (
        <div
          className={classNames(
            "rounded-2xl px-4 py-2 text-center text-sm font-bold animate-fade-up",
            flash === "correct"
              ? "bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]"
              : "bg-[color:var(--danger)]/10 text-[color:var(--danger)]"
          )}
        >
          {flash === "correct"
            ? language === "ms" ? `✓ +${BONUS_SECONDS}s` : `✓ +${BONUS_SECONDS}s`
            : language === "ms" ? "✕" : "✕"}
        </div>
      )}

      {hit && (
        <div className="card-raised p-6 space-y-4">
          <p className="eyebrow text-center mb-1">
            {language === "ms" ? "Apakah hukum yang diserlahkan?" : "Which rule is highlighted?"}
          </p>
          <div className="rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] p-4">
            <p
              className="arabic text-center leading-loose"
              lang="ar"
              dir="rtl"
              style={{ fontSize: "var(--arabic-md)" }}
            >
              {hit.ayahSegments.map((seg, idx) => {
                const rule = seg.code ? getTajweedRule(seg.code) : undefined;
                const isTarget = idx === hit.segmentIdx;
                const style: React.CSSProperties = {};
                if (rule) style.color = rule.color;
                if (isTarget) {
                  style.backgroundColor = "color-mix(in srgb, var(--gold) 28%, transparent)";
                  style.borderRadius = "6px";
                  style.padding = "2px 4px";
                  style.textDecoration = "underline";
                  style.textDecorationColor = "var(--gold)";
                  style.textDecorationThickness = "3px";
                  style.textUnderlineOffset = "8px";
                }
                return <span key={idx} style={style}>{seg.text}</span>;
              })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {options.map((o: TajweedRule) => {
              const isPicked = picked === o.code;
              const isCorrect = o.code === hit.rule.code;
              return (
                <button
                  key={o.code}
                  onClick={() => answer(o.code)}
                  disabled={picked !== null}
                  className={classNames(
                    "rounded-2xl border-2 px-3 py-3 text-left transition-all duration-200 active:scale-[0.97]",
                    !picked && "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]/20",
                    picked && isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent)] text-white",
                    picked && isPicked && !isCorrect && "border-[color:var(--danger)] bg-[color:var(--danger)] text-white",
                    picked && !isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/40",
                    picked && !isPicked && !isCorrect && "opacity-40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: o.color }} aria-hidden />
                    <span className="font-bold text-sm">{o.name[language]}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
