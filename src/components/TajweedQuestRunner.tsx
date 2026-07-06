"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLearning, BADGES } from "@/store/learning";
import { classNames } from "@/lib/format";
import {
  categoryLabel,
  getTajweedRule,
  type TajweedCategory,
  type TajweedRule,
} from "@/lib/tajweed";
import type { TajweedSegment } from "@/lib/tajweed-parser";
import {
  generateTajweedQuest,
  type TajweedStage,
  type RuleHit,
} from "@/lib/tajweed-learning";
import { ConfettiBurst } from "@/components/ConfettiBurst";
import {
  toggleVerseAudio,
  stopAllVerseAudio,
  useVerseAudioState,
} from "@/lib/verse-audio";

interface Props {
  surahNumber: number;
  surahName: string;
  tajweedSurah: Record<string, string>;
  difficulty: 1 | 2 | 3;
}

/* ── Per-mount counter for retry variety ────────────────────────────────── */
// Module-level counter increments once per mount of the runner. The first
// mount (SSR + first client paint) sees value 1 deterministically, so no
// hydration mismatch; subsequent retries get 2, 3, … and produce a fresh
// quest variant.
let mountCounter = 0;

/* ── Audio button ───────────────────────────────────────────────────────── */

/**
 * Pill button that plays the Mujawwad recording for a given verse.
 *
 * Subscribes to the singleton audio store so:
 *   - Tapping twice on the same verse plays then pauses (no duplicate playback)
 *   - Tapping a different verse stops the previous one and starts the new
 *   - A thin RTL progress bar appears while this verse is the active track
 *
 * Mujawwad's exaggerated tajweed makes it the right recitation style here —
 * the rules are audibly prolonged.
 */
function PlayVerseButton({
  surahNumber,
  ayah,
  language,
}: {
  surahNumber: number;
  ayah: number;
  language: "en" | "ms";
}) {
  const { playing, progress, isActive } = useVerseAudioState(surahNumber, ayah);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => toggleVerseAudio(surahNumber, ayah)}
        className={classNames(
          "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors",
          playing
            ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-white"
            : "border-[color:var(--border-strong)] bg-[color:var(--surface)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
        )}
        aria-pressed={playing}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden>
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden>
            <path d="M8 5l12 7-12 7z" />
          </svg>
        )}
        {playing
          ? language === "ms"
            ? `Henti ayat ${ayah}`
            : `Pause verse ${ayah}`
          : language === "ms"
          ? `Dengar ayat ${ayah}`
          : `Hear verse ${ayah}`}
      </button>
      {/* Progress only while this verse is the active track — fills R→L to match Arabic flow. */}
      {isActive && (
        <div
          className="relative h-1 w-40 rounded-full bg-[color:var(--border)] overflow-hidden"
          aria-hidden
        >
          <div
            className="absolute inset-y-0 right-0 rounded-full transition-[width] duration-150"
            style={{
              width: `${Math.round(progress * 100)}%`,
              background: "linear-gradient(270deg, var(--gold), var(--accent))",
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ── Main runner ────────────────────────────────────────────────────────── */

export function TajweedQuestRunner({
  surahNumber,
  surahName,
  tajweedSurah,
  difficulty,
}: Props) {
  const language = useLearning((s) => s.language);
  const recordTajweedStar = useLearning((s) => s.recordTajweedStar);
  const recordTajweedAnswer = useLearning((s) => s.recordTajweedAnswer);

  const [mountId] = useState(() => ++mountCounter);

  const quest = useMemo(
    () => generateTajweedQuest(surahNumber, tajweedSurah, difficulty, `m${mountId}`),
    [surahNumber, tajweedSurah, difficulty, mountId]
  );

  const [stageIdx, setStageIdx] = useState(0);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  // Holds the just-submitted result so we can show an inline feedback card +
  // NEXT button. The runner no longer auto-advances — the user controls pacing.
  const [pendingResult, setPendingResult] = useState<{
    correct: boolean;
    rule?: TajweedRule;
  } | null>(null);
  // Track whether the completed quest was perfect so badge logic can fire.
  const [completedPerfect, setCompletedPerfect] = useState(false);

  const stage = quest?.stages[stageIdx];
  const isComplete = stage?.kind === "complete";
  const totalQuestionsForEffect = quest
    ? quest.stages.filter((s) => s.kind !== "memorize" && s.kind !== "complete").length
    : 0;
  // Star is awarded only when the user demonstrated mastery (≥80% correct).
  // Without this gate, simply walking through every stage — even with all
  // answers wrong — would unlock the next difficulty.
  const passedThreshold =
    totalQuestionsForEffect > 0 && stats.correct / totalQuestionsForEffect >= 0.8;

  useEffect(() => {
    if (isComplete && passedThreshold) {
      recordTajweedStar(surahNumber, difficulty, completedPerfect);
    }
  }, [isComplete, passedThreshold, surahNumber, difficulty, recordTajweedStar, completedPerfect]);

  // Whenever the runner unmounts (user navigates away mid-quest), stop any
  // verse that's still playing so the audio doesn't bleed into another route.
  useEffect(() => {
    return () => stopAllVerseAudio();
  }, []);

  if (!quest || !stage) {
    return (
      <div className="card-raised p-8 text-center space-y-4">
        <p className="text-lg font-bold">
          {language === "ms"
            ? "Surah ini terlalu pendek untuk Cabaran Tajweed."
            : "This surah is too short for a Tajweed Quest."}
        </p>
        <Link
          href="/learn"
          className="inline-block rounded-full bg-[color:var(--accent)] text-white px-5 py-2 text-sm font-semibold"
        >
          {language === "ms" ? "Kembali" : "Back"}
        </Link>
      </div>
    );
  }

  const stages = quest.stages;
  const totalQuestions = stages.filter(
    (s) => s.kind !== "memorize" && s.kind !== "complete"
  ).length;

  const answered =
    stageIdx === 0
      ? 0
      : stages.slice(0, stageIdx).filter(
          (s) => s.kind !== "memorize" && s.kind !== "complete"
        ).length;
  const pct = stage.kind === "complete" ? 100 : (answered / Math.max(1, totalQuestions)) * 100;

  function answer(isCorrect: boolean, ruleForFeedback?: TajweedRule) {
    // Guard re-entry: a stage might call onAnswer twice if the user double-taps
    // during the brief between-answer-and-render window.
    if (pendingResult) return;
    if (isCorrect) setStats((s) => ({ ...s, correct: s.correct + 1 }));
    else setStats((s) => ({ ...s, wrong: s.wrong + 1 }));
    if (ruleForFeedback) recordTajweedAnswer(ruleForFeedback.code, isCorrect);
    setPendingResult({ correct: isCorrect, rule: ruleForFeedback });
  }

  function goNext() {
    // Silence the previous verse before moving on — the next stage usually
    // shows a different verse and the carry-over audio is disorienting.
    stopAllVerseAudio();
    setPendingResult(null);
    
    const nextIdx = Math.min(stageIdx + 1, stages.length - 1);
    setStageIdx(nextIdx);
    
    if (stages[nextIdx].kind === "complete" && stage?.kind !== "complete") {
      const isPass = totalQuestions > 0 && stats.correct / totalQuestions >= 0.8;
      const isPerfect = totalQuestions > 0 && stats.correct === totalQuestions;
      if (isPass) {
        setCompletedPerfect(isPerfect);
        recordTajweedStar(surahNumber, difficulty, isPerfect);
      }
    }
  }

  const isLastBeforeComplete = stageIdx + 1 < stages.length && stages[stageIdx + 1].kind === "complete";

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-4">
        <Link
          href="/learn"
          aria-label={language === "ms" ? "Keluar" : "Exit"}
          className="h-9 w-9 grid place-items-center rounded-full border border-[color:var(--border)] text-[color:var(--muted)] hover:text-[color:var(--foreground)] hover:border-[color:var(--accent)] transition-colors"
        >
          <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden>
            <path d="M5.3 4.3a1 1 0 011.4 0L10 7.6l3.3-3.3a1 1 0 111.4 1.4L11.4 9l3.3 3.3a1 1 0 11-1.4 1.4L10 10.4l-3.3 3.3a1 1 0 11-1.4-1.4L8.6 9 5.3 5.7a1 1 0 010-1.4z" />
          </svg>
        </Link>
        <div className="flex-1">
          <p className="eyebrow text-[10px] mb-1">
            {language === "ms" ? "Cabaran Tajweed" : "Tajweed Quest"} ·{" "}
            <span className="display-italic">{surahName}</span>
            {" · "}
            <span className="text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]">
              {"★".repeat(difficulty)}
            </span>
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

      <StageView
        key={stageIdx}
        stage={stage}
        language={language}
        surahName={surahName}
        surahNumber={surahNumber}
        difficulty={difficulty}
        correct={stats.correct}
        total={totalQuestions}
        starAwarded={passedThreshold}
        onStart={() => setStageIdx(1)}
        onAnswer={answer}
      />

      {pendingResult && (
        <FeedbackCard
          result={pendingResult}
          isLastBeforeComplete={isLastBeforeComplete}
          language={language}
          onNext={goNext}
        />
      )}
    </div>
  );
}

/* ── Inline feedback card with NEXT button ──────────────────────────────── */

function FeedbackCard({
  result,
  isLastBeforeComplete,
  language,
  onNext,
}: {
  result: { correct: boolean; rule?: TajweedRule };
  isLastBeforeComplete: boolean;
  language: "en" | "ms";
  onNext: () => void;
}) {
  const { correct, rule } = result;
  return (
    <div
      className={classNames(
        "sticky bottom-0 z-30 -mx-4 sm:mx-0 sm:rounded-2xl border px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3 shadow-[0_-10px_30px_-12px_rgba(0,0,0,0.25)] animate-fade-up",
        correct
          ? "bg-[color:var(--accent-soft)] border-[color:var(--accent)]/60"
          : "bg-[color:var(--danger)]/10 border-[color:var(--danger)]/40"
      )}
      role="status"
    >
      <span
        className={classNames(
          "h-9 w-9 shrink-0 rounded-full grid place-items-center text-white text-base font-black",
          correct ? "bg-[color:var(--accent)]" : "bg-[color:var(--danger)]"
        )}
        aria-hidden
      >
        {correct ? "✓" : "✕"}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className={classNames(
            "text-sm font-bold leading-tight",
            correct ? "text-[color:var(--accent-strong)]" : "text-[color:var(--danger)]"
          )}
        >
          {correct
            ? language === "ms"
              ? "Betul"
              : "Correct"
            : language === "ms"
            ? "Belum tepat"
            : "Not quite"}
        </p>
        {rule && (
          <p className="text-[11px] text-[color:var(--foreground)] leading-snug mt-0.5">
            <span className="font-bold">{rule.name[language]}</span>
            {" — "}
            {rule.howToRead[language]}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onNext}
        autoFocus
        className="rounded-full px-5 py-2.5 text-sm font-black text-white transition-all active:scale-95"
        style={{
          background: correct
            ? "linear-gradient(135deg, var(--accent), var(--accent-strong))"
            : "linear-gradient(135deg, var(--accent), var(--accent-strong))",
          boxShadow: "0 8px 24px -8px var(--accent-glow)",
        }}
      >
        {isLastBeforeComplete
          ? language === "ms"
            ? "TAMAT →"
            : "FINISH →"
          : language === "ms"
          ? "SETERUSNYA →"
          : "NEXT →"}
      </button>
    </div>
  );
}

/* ── Stage dispatcher ───────────────────────────────────────────────────── */

interface StageViewProps {
  stage: TajweedStage;
  language: "en" | "ms";
  surahName: string;
  surahNumber: number;
  difficulty: 1 | 2 | 3;
  correct: number;
  total: number;
  starAwarded: boolean;
  onStart: () => void;
  onAnswer: (correct: boolean, rule?: TajweedRule) => void;
}

function StageView(props: StageViewProps) {
  const { stage, language } = props;
  switch (stage.kind) {
    case "memorize":
      return (
        <MemorizeStage
          rules={stage.rules}
          surahName={props.surahName}
          difficulty={props.difficulty}
          onStart={props.onStart}
          language={language}
        />
      );
    case "rule-picker":
    case "rule-picker-monochrome":
      return (
        <RulePickerStage
          hit={stage.hit}
          options={stage.options}
          monochrome={stage.monochrome}
          surahNumber={props.surahNumber}
          language={language}
          onAnswer={props.onAnswer}
        />
      );
    case "color-match":
      return (
        <ColorMatchStage
          ayah={stage.ayah}
          segments={stage.segments}
          pairs={stage.pairs}
          surahNumber={props.surahNumber}
          language={language}
          onAnswer={props.onAnswer}
        />
      );
    case "letter-identify":
      return (
        <LetterIdentifyStage
          rule={stage.rule}
          correctLetter={stage.correctLetter}
          options={stage.options}
          language={language}
          onAnswer={props.onAnswer}
        />
      );
    case "condition-match":
      return (
        <ConditionMatchStage
          rule={stage.rule}
          options={stage.options}
          language={language}
          onAnswer={props.onAnswer}
        />
      );
    case "rule-sort":
      return (
        <RuleSortStage
          ayah={stage.ayah}
          segments={stage.segments}
          buckets={stage.buckets}
          items={stage.items}
          surahNumber={props.surahNumber}
          language={language}
          onAnswer={props.onAnswer}
        />
      );
    case "mistake-finder":
      return (
        <MistakeFinderStage
          ayah={stage.ayah}
          segments={stage.segments}
          wrongSegmentIdx={stage.wrongSegmentIdx}
          shownRuleCode={stage.shownRuleCode}
          actualRuleCode={stage.actualRuleCode}
          surahNumber={props.surahNumber}
          language={language}
          onAnswer={props.onAnswer}
        />
      );
    case "count-rules":
      return (
        <CountRulesStage
          ayah={stage.ayah}
          segments={stage.segments}
          targetRule={stage.targetRule}
          correctCount={stage.correctCount}
          options={stage.options}
          surahNumber={props.surahNumber}
          language={language}
          onAnswer={props.onAnswer}
        />
      );
    case "audio-tap":
      return (
        <AudioTapStage
          ayah={stage.ayah}
          surahNumber={stage.surahNumber}
          segments={stage.segments}
          targetRule={stage.targetRule}
          targetSegmentIdxs={stage.targetSegmentIdxs}
          language={language}
          onAnswer={props.onAnswer}
        />
      );
    case "sound-sorter":
      return (
        <SoundSorterStage
          surahNumber={stage.surahNumber}
          items={stage.items}
          buckets={stage.buckets}
          language={language}
          onAnswer={props.onAnswer}
        />
      );
    case "hear-the-rule":
      return (
        <HearTheRuleStage
          hit={stage.hit}
          surahNumber={stage.surahNumber}
          options={stage.options}
          language={language}
          onAnswer={props.onAnswer}
        />
      );
    case "confused-pairs":
      return (
        <ConfusedPairsStage
          pairA={stage.pairA}
          pairB={stage.pairB}
          distractors={stage.distractors}
          language={language}
          onAnswer={props.onAnswer}
        />
      );
    case "rule-whisperer":
      return (
        <RuleWhispererStage
          ayah={stage.ayah}
          surahNumber={stage.surahNumber}
          segments={stage.segments}
          ruleSegments={stage.ruleSegments}
          language={language}
          onAnswer={props.onAnswer}
        />
      );
    case "complete":
      return (
        <CompleteStage
          surahName={props.surahName}
          surahNumber={props.surahNumber}
          difficulty={props.difficulty}
          correct={props.correct}
          total={props.total}
          starAwarded={props.starAwarded}
          language={language}
        />
      );
  }
}

/* ── Verse renderer ─────────────────────────────────────────────────────── */

/**
 * Render an ayah's parsed segments with optional rule coloring.
 * `highlightIdx` paints one segment with a gold underline (used by rule-picker).
 * `monochrome` forces all colors off (used by 2★ monochrome challenge).
 * `tappable` enables click handlers per segment (used by mistake-finder, audio-tap).
 */
function RenderedAyah({
  segments,
  highlightIdx,
  monochrome,
  tappable,
  onSegmentTap,
  tappedIdxs,
  fontSize = "var(--arabic-md)",
}: {
  segments: TajweedSegment[];
  highlightIdx?: number;
  monochrome?: boolean;
  tappable?: boolean;
  onSegmentTap?: (segmentIdx: number) => void;
  tappedIdxs?: Set<number>;
  fontSize?: string;
}) {
  return (
    <p
      className="arabic text-center leading-loose"
      lang="ar"
      dir="rtl"
      style={{ fontSize }}
    >
      {segments.map((seg, idx) => {
        const rule = seg.code ? getTajweedRule(seg.code) : undefined;
        const isHighlight = idx === highlightIdx;
        const isTapped = tappedIdxs?.has(idx);
        const baseStyle: React.CSSProperties = {};
        if (rule && !monochrome) baseStyle.color = rule.color;
        if (isHighlight) {
          // Multi-layered emphasis: pill background + thick underline + bold.
          // Underline alone is often invisible under Arabic descenders; the gold
          // pill is what the user actually notices, especially in monochrome
          // mode where it's the only visual cue to the question's target.
          baseStyle.backgroundColor = "color-mix(in srgb, var(--gold) 28%, transparent)";
          baseStyle.boxShadow = "0 0 0 2px color-mix(in srgb, var(--gold) 50%, transparent)";
          baseStyle.borderRadius = "6px";
          baseStyle.padding = "2px 4px";
          baseStyle.textDecoration = "underline";
          baseStyle.textDecorationColor = "var(--gold)";
          baseStyle.textDecorationThickness = "3px";
          baseStyle.textUnderlineOffset = "8px";
        }
        // IMPORTANT: keep segments as inline <span> with no inline-block or
        // horizontal margins so Arabic letters across segment boundaries
        // continue to shape (join) correctly. Background + text-decoration
        // changes don't break shaping; padding/margin do.
        if (tappable && seg.code) {
          // In monochrome mode (AudioTap) there's no rule color to lean on,
          // and on dark backgrounds a muted underline disappears. Use gold —
          // it reads on both themes — plus a faint default tint so the
          // tappable target has visible area, not just a thin line.
          const tappableStyle: React.CSSProperties = { ...baseStyle };
          if (!isHighlight) {
            tappableStyle.textDecoration = "underline";
            tappableStyle.textDecorationStyle = "dashed";
            tappableStyle.textDecorationColor = "var(--gold)";
            tappableStyle.textUnderlineOffset = "6px";
            if (!isTapped) {
              tappableStyle.backgroundColor = "color-mix(in srgb, var(--gold) 14%, transparent)";
              tappableStyle.borderRadius = "4px";
            }
          }
          return (
            <span
              key={idx}
              role="button"
              tabIndex={0}
              onClick={() => onSegmentTap?.(idx)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSegmentTap?.(idx);
                }
              }}
              className={classNames(
                "cursor-pointer transition-colors",
                isTapped && "bg-[color:var(--gold)]/45 rounded"
              )}
              style={tappableStyle}
            >
              {seg.text}
            </span>
          );
        }
        return (
          <span
            key={idx}
            className={classNames(isHighlight && "font-bold")}
            style={baseStyle}
          >
            {seg.text}
          </span>
        );
      })}
    </p>
  );
}

/* ── Memorize ──────────────────────────────────────────────────────────── */

function MemorizeStage({
  rules,
  surahName,
  difficulty,
  onStart,
  language,
}: {
  rules: TajweedRule[];
  surahName: string;
  difficulty: 1 | 2 | 3;
  onStart: () => void;
  language: "en" | "ms";
}) {
  const eyebrow =
    language === "ms"
      ? difficulty === 1
        ? "Kenali peraturan tajweed ini"
        : difficulty === 2
        ? "Fahami sebab dan syarat"
        : "Kuasai dalam ayat dan bacaan"
      : difficulty === 1
      ? "Get to know these tajweed rules"
      : difficulty === 2
      ? "Understand the conditions"
      : "Master them in verses and recitation";

  return (
    <div className="card-raised p-6 sm:p-8 space-y-4 animate-fade-up">
      <div className="text-center">
        <p className="eyebrow mb-2 text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]">
          {eyebrow}
        </p>
        <h2 className="display text-[length:var(--text-xl)]" style={{ fontWeight: 600 }}>
          {surahName}
        </h2>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
        {rules.map((r) => (
          <li
            key={r.code}
            className="rounded-2xl border-2 p-4 flex items-start gap-3"
            style={{
              borderColor: `${r.color}66`,
              backgroundColor: `${r.color}10`,
            }}
          >
            <span
              className="inline-block w-3 h-3 rounded-full shrink-0 mt-1.5"
              style={{ backgroundColor: r.color }}
              aria-hidden
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[color:var(--foreground)]">
                {r.name[language]}
                <span className="ml-2 text-xs text-[color:var(--muted)] font-mono">
                  {r.name.ar}
                </span>
              </p>
              <p className="text-xs text-[color:var(--muted)] mt-1 leading-snug">
                {r.condition[language]}
              </p>
            </div>
          </li>
        ))}
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

/* ── Rule Picker (1★ + 2★ monochrome) ──────────────────────────────────── */

function RulePickerStage({
  hit,
  options,
  monochrome,
  surahNumber,
  language,
  onAnswer,
}: {
  hit: {
    ayah: number;
    segmentIdx: number;
    ayahSegments: TajweedSegment[];
    rule: TajweedRule;
  };
  options: TajweedRule[];
  monochrome: boolean;
  surahNumber: number;
  language: "en" | "ms";
  onAnswer: (correct: boolean, rule?: TajweedRule) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const target = hit.rule;

  const pick = (code: string) => {
    if (picked) return;
    setPicked(code);
    const isCorrect = code === target.code;
    setTimeout(() => onAnswer(isCorrect, isCorrect ? target : target), 350);
  };

  return (
    <div className="card-raised p-6 sm:p-8 animate-fade-up space-y-5">
      <div className="text-center">
        <p className="eyebrow mb-1">
          {monochrome
            ? language === "ms"
              ? "Tiada warna — kenali peraturan"
              : "No colors — name the rule"
            : language === "ms"
            ? "Apakah peraturan yang diserlahkan?"
            : "Which rule is highlighted?"}
        </p>
        <p className="text-xs text-[color:var(--muted)]">
          {monochrome
            ? language === "ms"
              ? "Kenali peraturan dari huruf dan tanda"
              : "Recognize the rule from letters and marks"
            : language === "ms"
            ? "Lihat segmen yang diserlahkan emas"
            : "Look at the gold-highlighted segment"}
        </p>
      </div>

      <div className="rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] p-4">
        <RenderedAyah
          segments={hit.ayahSegments}
          highlightIdx={hit.segmentIdx}
          monochrome={monochrome}
        />
      </div>

      <PlayVerseButton surahNumber={surahNumber} ayah={hit.ayah} language={language} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((o) => {
          const isPicked = picked === o.code;
          const isCorrect = o.code === target.code;
          return (
            <button
              key={o.code}
              onClick={() => pick(o.code)}
              disabled={picked !== null}
              className={classNames(
                "rounded-2xl border-2 px-4 py-3 text-left transition-all duration-300 active:scale-[0.98] min-h-[60px]",
                !picked && "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]/30",
                picked && isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent)] text-white",
                picked && isPicked && !isCorrect && "border-[color:var(--danger)] bg-[color:var(--danger)] text-white animate-shake",
                picked && !isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/60",
                picked && !isPicked && !isCorrect && "opacity-40"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: o.color }}
                  aria-hidden
                />
                <span className="font-bold text-sm">{o.name[language]}</span>
              </div>
              <span className="text-[11px] opacity-75 block mt-0.5 font-mono">
                {o.name.ar}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Color Match (1★) — tap-pair segments ↔ rule names ─────────────────── */

function ColorMatchStage({
  ayah,
  segments,
  pairs,
  surahNumber,
  language,
  onAnswer,
}: {
  ayah: number;
  segments: TajweedSegment[];
  pairs: { segmentIdx: number; rule: TajweedRule }[];
  surahNumber: number;
  language: "en" | "ms";
  onAnswer: (correct: boolean, rule?: TajweedRule) => void;
}) {
  type Side = "seg" | "rule";
  const [selected, setSelected] = useState<{ side: Side; id: string } | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [shake, setShake] = useState<Set<string>>(new Set());
  const [mistakes, setMistakes] = useState(0);

  // Pairs can contain the same rule multiple times (e.g. Al-Fatihah verse 1
  // has three Hamzat Wasl segments). Each rule should show as a SINGLE card —
  // it's an association the user learns once — and the card stays available
  // until every segment that uses it has been matched.
  const ruleOrder = useMemo(() => {
    const seen = new Set<string>();
    const out: TajweedRule[] = [];
    for (const p of [...pairs].reverse()) {
      if (seen.has(p.rule.code)) continue;
      seen.add(p.rule.code);
      out.push(p.rule);
    }
    return out;
  }, [pairs]);

  // How many segments for this rule still need to be matched.
  function remainingForRule(ruleCode: string): number {
    return pairs.filter((p) => p.rule.code === ruleCode && !matched.has(p.segmentIdx)).length;
  }

  function tapSeg(segmentIdx: number) {
    if (matched.has(segmentIdx) || shake.size > 0) return;
    if (selected?.side === "seg" && selected.id === String(segmentIdx)) {
      setSelected(null);
      return;
    }
    if (selected?.side === "rule") {
      const ruleCode = selected.id;
      const expected = pairs.find((p) => p.segmentIdx === segmentIdx);
      if (expected && expected.rule.code === ruleCode) {
        const next = new Set(matched);
        next.add(segmentIdx);
        setMatched(next);
        setSelected(null);
        if (next.size === pairs.length) {
          setTimeout(() => onAnswer(mistakes === 0), 700);
        }
      } else {
        setMistakes((m) => m + 1);
        const ids = new Set([`seg-${segmentIdx}`, `rule-${ruleCode}`]);
        setShake(ids);
        setSelected(null);
        setTimeout(() => setShake(new Set()), 600);
      }
      return;
    }
    setSelected({ side: "seg", id: String(segmentIdx) });
  }

  function tapRule(ruleCode: string) {
    if (shake.size > 0) return;
    // Disable only when every segment for this rule has been matched.
    if (remainingForRule(ruleCode) === 0) return;
    if (selected?.side === "rule" && selected.id === ruleCode) {
      setSelected(null);
      return;
    }
    if (selected?.side === "seg") {
      const segmentIdx = Number(selected.id);
      const expected = pairs.find((p) => p.segmentIdx === segmentIdx);
      if (expected && expected.rule.code === ruleCode) {
        const next = new Set(matched);
        next.add(segmentIdx);
        setMatched(next);
        setSelected(null);
        if (next.size === pairs.length) {
          setTimeout(() => onAnswer(mistakes === 0), 700);
        }
      } else {
        setMistakes((m) => m + 1);
        const ids = new Set([`seg-${segmentIdx}`, `rule-${ruleCode}`]);
        setShake(ids);
        setSelected(null);
        setTimeout(() => setShake(new Set()), 600);
      }
      return;
    }
    setSelected({ side: "rule", id: ruleCode });
  }

  return (
    <div className="card-raised p-6 sm:p-8 animate-fade-up space-y-5">
      <div className="text-center">
        <p className="eyebrow mb-1">
          {language === "ms" ? "Padankan warna dengan peraturan" : "Match colors to rules"}
        </p>
        <p className="text-xs text-[color:var(--muted)]">
          {language === "ms"
            ? "Ketik segmen, kemudian nama peraturannya"
            : "Tap a segment, then its rule name"}
        </p>
      </div>

      <div className="rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] p-4">
        <p
          className="arabic text-center leading-loose"
          lang="ar"
          dir="rtl"
          style={{ fontSize: "var(--arabic-md)" }}
        >
          {segments.map((seg, idx) => {
            const rule = seg.code ? getTajweedRule(seg.code) : undefined;
            const isPair = pairs.some((p) => p.segmentIdx === idx);
            const isMatched = matched.has(idx);
            const isSelected =
              selected?.side === "seg" && selected.id === String(idx);
            const isShake = shake.has(`seg-${idx}`);
            if (!isPair || !rule) {
              return (
                <span
                  key={idx}
                  style={rule ? { color: rule.color } : undefined}
                >
                  {seg.text}
                </span>
              );
            }
            // Some rules (Hamzat Wasl, Lam Shamsiyya) use a muted grey on
            // purpose — they're "silent" pronunciations. That makes them
            // invisible on a dark background. To advertise clickability we
            // ALWAYS apply a high-contrast gold underline + a subtle tint of
            // the rule's color as background, regardless of how muted the rule
            // itself is. The rule color still lives in the text so the user
            // gets the pedagogical association.
            const tintBg = `color-mix(in srgb, ${rule.color} 22%, transparent)`;
            return (
              <span
                key={idx}
                role="button"
                tabIndex={isMatched ? -1 : 0}
                onClick={() => !isMatched && tapSeg(idx)}
                onKeyDown={(e) => {
                  if (isMatched) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    tapSeg(idx);
                  }
                }}
                aria-disabled={isMatched}
                className={classNames(
                  "cursor-pointer transition-colors rounded-md underline decoration-dashed underline-offset-[6px] decoration-2",
                  isMatched && "opacity-40 cursor-default decoration-solid",
                  isShake && "animate-shake"
                )}
                style={{
                  color: rule.color,
                  backgroundColor: isSelected
                    ? "color-mix(in srgb, var(--gold) 45%, transparent)"
                    : isShake
                    ? "color-mix(in srgb, var(--danger) 35%, transparent)"
                    : tintBg,
                  textDecorationColor: isSelected ? "var(--gold)" : "var(--gold)",
                  boxShadow: isSelected
                    ? "0 0 0 2px color-mix(in srgb, var(--gold) 60%, transparent)"
                    : undefined,
                }}
              >
                {seg.text}
              </span>
            );
          })}
        </p>
      </div>

      <PlayVerseButton surahNumber={surahNumber} ayah={ayah} language={language} />

      <div className="grid grid-cols-2 gap-3">
        {ruleOrder.map((r) => {
          const remaining = remainingForRule(r.code);
          const totalForRule = pairs.filter((p) => p.rule.code === r.code).length;
          const exhausted = remaining === 0;
          const isSelected = selected?.side === "rule" && selected.id === r.code;
          const isShake = shake.has(`rule-${r.code}`);
          return (
            <button
              key={r.code}
              onClick={() => tapRule(r.code)}
              disabled={exhausted}
              className={classNames(
                "rounded-2xl border-2 px-3 py-3 text-left transition-all min-h-[60px]",
                exhausted &&
                  "opacity-40 border-[color:var(--accent)] bg-[color:var(--accent-soft)]/30",
                !exhausted && isSelected &&
                  "border-[color:var(--gold)] bg-[color:var(--gold)]/10 scale-[1.02]",
                !exhausted && !isSelected && !isShake &&
                  "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)]",
                isShake && "border-[color:var(--danger)] animate-shake"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: r.color }}
                  aria-hidden
                />
                <span className="text-sm font-bold flex-1">{r.name[language]}</span>
                {/* When a rule appears more than once in the verse, show how many
                    occurrences are left to pair so the user knows to keep tapping it. */}
                {totalForRule > 1 && (
                  <span
                    className={classNames(
                      "text-[10px] font-black tabular-nums rounded-full px-1.5 py-0.5",
                      exhausted
                        ? "bg-[color:var(--accent)]/20 text-[color:var(--muted)]"
                        : "bg-[color:var(--gold)]/20 text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]"
                    )}
                  >
                    {remaining}/{totalForRule}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Letter Identify (1★) ─────────────────────────────────────────────── */

function LetterIdentifyStage({
  rule,
  correctLetter,
  options,
  language,
  onAnswer,
}: {
  rule: TajweedRule;
  correctLetter: string;
  options: string[];
  language: "en" | "ms";
  onAnswer: (correct: boolean, rule?: TajweedRule) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const pick = (letter: string) => {
    if (picked) return;
    setPicked(letter);
    setTimeout(() => onAnswer(letter === correctLetter, rule), 350);
  };

  return (
    <div className="card-raised p-6 sm:p-8 animate-fade-up space-y-5">
      <div className="text-center">
        <p className="eyebrow mb-1">
          {language === "ms"
            ? "Huruf manakah keluarga peraturan ini?"
            : "Which letter belongs to this rule?"}
        </p>
      </div>

      <div
        className="rounded-2xl p-5 text-center"
        style={{ backgroundColor: `${rule.color}10`, border: `2px solid ${rule.color}66` }}
      >
        <p className="text-xs uppercase tracking-widest font-bold mb-1" style={{ color: rule.color }}>
          {rule.name[language]}
        </p>
        <p className="text-sm text-[color:var(--foreground)] mt-2 leading-snug">
          {rule.condition[language]}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {options.map((letter) => {
          const isPicked = picked === letter;
          const isCorrect = letter === correctLetter;
          return (
            <button
              key={letter}
              onClick={() => pick(letter)}
              disabled={picked !== null}
              className={classNames(
                "rounded-2xl border-2 px-3 py-6 text-center transition-all duration-300 active:scale-[0.98]",
                !picked && "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]/30",
                picked && isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/60",
                picked && isPicked && !isCorrect && "border-[color:var(--danger)] bg-[color:var(--danger)]/15 animate-shake",
                picked && !isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/60",
                picked && !isPicked && !isCorrect && "opacity-40"
              )}
            >
              <span
                className="arabic text-[length:var(--arabic-lg)] leading-none"
                style={{ color: rule.color }}
                lang="ar"
                dir="rtl"
              >
                {letter}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Condition Match (2★) ─────────────────────────────────────────────── */

function ConditionMatchStage({
  rule,
  options,
  language,
  onAnswer,
}: {
  rule: TajweedRule;
  options: TajweedRule[];
  language: "en" | "ms";
  onAnswer: (correct: boolean, rule?: TajweedRule) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);

  const pick = (code: string) => {
    if (picked) return;
    setPicked(code);
    setTimeout(() => onAnswer(code === rule.code, rule), 350);
  };

  return (
    <div className="card-raised p-6 sm:p-8 animate-fade-up space-y-5">
      <div className="text-center">
        <p className="eyebrow mb-1">
          {language === "ms"
            ? "Peraturan manakah ini menggambarkan?"
            : "Which rule does this describe?"}
        </p>
      </div>

      <div className="rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] p-5">
        <p className="text-sm text-[color:var(--foreground)] leading-relaxed">
          {rule.condition[language]}
        </p>
        {rule.letters && (
          <p
            className="arabic text-lg text-[color:var(--foreground)] leading-loose mt-3 text-center"
            lang="ar"
            dir="rtl"
          >
            {rule.letters}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((o) => {
          const isPicked = picked === o.code;
          const isCorrect = o.code === rule.code;
          return (
            <button
              key={o.code}
              onClick={() => pick(o.code)}
              disabled={picked !== null}
              className={classNames(
                "rounded-2xl border-2 px-4 py-3 text-left transition-all duration-300 active:scale-[0.98] min-h-[60px]",
                !picked && "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]/30",
                picked && isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent)] text-white",
                picked && isPicked && !isCorrect && "border-[color:var(--danger)] bg-[color:var(--danger)] text-white animate-shake",
                picked && !isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/60",
                picked && !isPicked && !isCorrect && "opacity-40"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: o.color }}
                  aria-hidden
                />
                <span className="font-bold text-sm">{o.name[language]}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Rule Sort (2★) — drop items into category buckets ────────────────── */

function RuleSortStage({
  ayah,
  segments,
  buckets,
  items,
  surahNumber,
  language,
  onAnswer,
}: {
  ayah: number;
  segments: TajweedSegment[];
  buckets: TajweedCategory[];
  items: { segmentIdx: number; category: TajweedCategory }[];
  surahNumber: number;
  language: "en" | "ms";
  onAnswer: (correct: boolean, rule?: TajweedRule) => void;
}) {
  const [assignments, setAssignments] = useState<Record<number, TajweedCategory | null>>(
    () => Object.fromEntries(items.map((i) => [i.segmentIdx, null]))
  );
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function tapSegment(segIdx: number) {
    if (submitted) return;
    setSelectedSegment((s) => (s === segIdx ? null : segIdx));
  }
  function tapBucket(cat: TajweedCategory) {
    if (submitted || selectedSegment === null) return;
    setAssignments((a) => ({ ...a, [selectedSegment]: cat }));
    setSelectedSegment(null);
  }

  const allAssigned = items.every((i) => assignments[i.segmentIdx] !== null);

  // Per-segment correctness, only meaningful after submit. Lets the UI mark
  // each placed item green/red individually instead of an all-or-nothing
  // banner — users see *which* category they got wrong.
  const itemCorrect: Record<number, boolean> = {};
  if (submitted) {
    for (const i of items) {
      itemCorrect[i.segmentIdx] = assignments[i.segmentIdx] === i.category;
    }
  }
  // Bucket-level tally: how many in this bucket were placed correctly vs not.
  const bucketResult: Record<string, { right: number; wrong: number }> = {};
  if (submitted) {
    for (const cat of buckets) bucketResult[cat] = { right: 0, wrong: 0 };
    for (const i of items) {
      const placed = assignments[i.segmentIdx];
      if (!placed) continue;
      if (placed === i.category) bucketResult[placed].right += 1;
      else bucketResult[placed].wrong += 1;
    }
  }

  function check() {
    if (!allAssigned || submitted) return;
    setSubmitted(true);
    const correct = items.every(
      (i) => assignments[i.segmentIdx] === i.category
    );
    // Pick a representative rule for feedback: the first wrong item, or null.
    let feedbackRule: TajweedRule | undefined;
    if (!correct) {
      const wrong = items.find((i) => assignments[i.segmentIdx] !== i.category);
      if (wrong) {
        const seg = segments[wrong.segmentIdx];
        feedbackRule = seg?.code ? getTajweedRule(seg.code) : undefined;
      }
    }
    // The runner shows a NEXT button so the user controls pacing — no need
    // for a long internal hold any more. The post-check coloring stays
    // visible until they advance.
    setTimeout(() => onAnswer(correct, feedbackRule), 500);
  }

  return (
    <div className="card-raised p-6 sm:p-8 animate-fade-up space-y-5">
      <div className="text-center">
        <p className="eyebrow mb-1">
          {language === "ms" ? "Susun ke dalam kategori" : "Sort into categories"}
        </p>
        <p className="text-xs text-[color:var(--muted)]">
          {language === "ms"
            ? `Ketik segmen, kemudian kategorinya. Ayat ${ayah}.`
            : `Tap a segment, then its category. Verse ${ayah}.`}
        </p>
      </div>

      {/* 2★ is the "understand" tier — colors are hidden so the user must read
          the Arabic and recall the rule, not pattern-match on color. Selected
          segments still get a gold ring, and once assigned a faint underline
          recalls which bucket they went to. */}
      <div className="rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] p-4">
        <p
          className="arabic text-center leading-loose text-[color:var(--foreground)]"
          lang="ar"
          dir="rtl"
          style={{ fontSize: "var(--arabic-md)" }}
        >
          {segments.map((seg, idx) => {
            const item = items.find((i) => i.segmentIdx === idx);
            if (!item) {
              return <span key={idx}>{seg.text}</span>;
            }
            const assigned = assignments[idx];
            const isSelected = selectedSegment === idx;
            const wasRight = submitted && itemCorrect[idx];
            const wasWrong = submitted && itemCorrect[idx] === false;
            // Inline <span> preserves Arabic shaping across segment boundaries.
            // Default state gets a faint gold tint so tappable segments are
            // actually visible — a thin dotted underline on dark mode is not.
            let bgColor: string | undefined = "color-mix(in srgb, var(--gold) 16%, transparent)";
            let textDecoColor = "var(--gold)";
            if (assigned && !submitted) {
              bgColor = "color-mix(in srgb, var(--accent) 18%, transparent)";
              textDecoColor = "var(--accent)";
            }
            if (isSelected && !submitted) {
              bgColor = "color-mix(in srgb, var(--gold) 38%, transparent)";
              textDecoColor = "var(--gold)";
            }
            if (wasRight) {
              bgColor = "color-mix(in srgb, var(--accent) 25%, transparent)";
              textDecoColor = "var(--accent)";
            }
            if (wasWrong) {
              bgColor = "color-mix(in srgb, var(--danger) 25%, transparent)";
              textDecoColor = "var(--danger)";
            }
            return (
              <span
                key={idx}
                role="button"
                tabIndex={submitted ? -1 : 0}
                onClick={() => !submitted && tapSegment(idx)}
                onKeyDown={(e) => {
                  if (submitted) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    tapSegment(idx);
                  }
                }}
                aria-disabled={submitted}
                className={classNames(
                  "cursor-pointer transition-colors rounded-md underline decoration-dashed underline-offset-[6px] decoration-2",
                  submitted && "cursor-default",
                  wasRight && "text-[color:var(--accent-strong)]",
                  wasWrong && "text-[color:var(--danger)]"
                )}
                style={{ backgroundColor: bgColor, textDecorationColor: textDecoColor }}
              >
                {seg.text}
              </span>
            );
          })}
        </p>
      </div>

      <PlayVerseButton surahNumber={surahNumber} ayah={ayah} language={language} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {buckets.map((cat) => {
          const count = items.filter(
            (i) => assignments[i.segmentIdx] === cat
          ).length;
          const result = submitted ? bucketResult[cat] : null;
          const bucketAllRight = result && result.wrong === 0 && result.right > 0;
          const bucketHasWrong = result && result.wrong > 0;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => tapBucket(cat)}
              disabled={submitted}
              className={classNames(
                "rounded-2xl border-2 px-4 py-4 text-left transition-all min-h-[60px] flex items-center gap-3",
                !submitted && "border-dashed",
                !submitted && selectedSegment !== null && "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/15",
                !submitted && selectedSegment === null && "border-[color:var(--border)] bg-[color:var(--surface)]",
                bucketAllRight && "border-[color:var(--accent)] bg-[color:var(--accent)]/10",
                bucketHasWrong && "border-[color:var(--danger)] bg-[color:var(--danger)]/10",
                submitted && !result?.right && !result?.wrong && "border-[color:var(--border)] opacity-60"
              )}
            >
              {submitted && bucketAllRight && (
                <span
                  className="h-7 w-7 shrink-0 rounded-full bg-[color:var(--accent)] text-white grid place-items-center text-sm font-black"
                  aria-hidden
                >
                  ✓
                </span>
              )}
              {submitted && bucketHasWrong && (
                <span
                  className="h-7 w-7 shrink-0 rounded-full bg-[color:var(--danger)] text-white grid place-items-center text-sm font-black"
                  aria-hidden
                >
                  ✕
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[color:var(--foreground)]">
                  {categoryLabel(cat, language)}
                </p>
                <p className="text-[11px] text-[color:var(--muted)] mt-0.5">
                  {submitted && result
                    ? `${result.right} ${language === "ms" ? "betul" : "right"} · ${result.wrong} ${language === "ms" ? "salah" : "wrong"}`
                    : `${count} ${language === "ms" ? "diletak" : "placed"}`}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={check}
        disabled={!allAssigned || submitted}
        className={classNames(
          "w-full rounded-2xl py-4 text-base font-bold transition-all active:scale-[0.98]",
          allAssigned && !submitted
            ? "text-white hover:-translate-y-0.5"
            : "bg-[color:var(--border)] text-[color:var(--muted)] cursor-not-allowed"
        )}
        style={
          allAssigned && !submitted
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

/* ── Sound Sorter (3★) ───────────────────────────────────────────────── */

function SoundSorterItem({
  index, item, surahNumber, isSelected, assignedRule, submitted, language, onSelect,
}: {
  index: number;
  item: { ayah: number; segmentIdx: number; segments: TajweedSegment[]; correctRule: TajweedRule };
  surahNumber: number;
  isSelected: boolean;
  assignedRule: TajweedRule | undefined;
  submitted: boolean;
  language: "en" | "ms";
  onSelect: (i: number) => void;
}) {
  const { playing, isActive } = useVerseAudioState(surahNumber, item.ayah);
  const isCorrect = submitted && assignedRule?.code === item.correctRule.code;
  const isWrong = submitted && assignedRule?.code !== item.correctRule.code;
  return (
    <div
      className={classNames(
        "rounded-2xl border-2 p-3 transition-all cursor-pointer",
        isSelected && !submitted ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/20"
          : submitted && isCorrect ? "border-[color:var(--accent)] bg-[color:var(--accent)]/8"
          : submitted && isWrong ? "border-[color:var(--danger)] bg-[color:var(--danger)]/8"
          : "border-[color:var(--border)] bg-[color:var(--surface)]"
      )}
      onClick={() => onSelect(index)}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleVerseAudio(surahNumber, item.ayah); }}
          className={classNames(
            "h-9 w-9 shrink-0 rounded-full grid place-items-center transition-colors",
            playing && isActive ? "bg-[color:var(--accent)] text-white" : "bg-[color:var(--border)]/60 hover:bg-[color:var(--accent)]/20"
          )}
          aria-label={playing && isActive ? "Pause" : `Play verse ${item.ayah}`}
        >
          {playing && isActive
            ? <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
            : <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden><path d="M8 5l12 7-12 7z"/></svg>}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[color:var(--muted)] mb-1">
            {language === "ms" ? `Ayat ${item.ayah}` : `Verse ${item.ayah}`}
            {submitted && isWrong && <span className="ml-2 text-[color:var(--accent)]">→ {item.correctRule.name[language]}</span>}
          </p>
          <p className="arabic text-right leading-loose text-[length:var(--arabic-sm)]" lang="ar" dir="rtl">
            {item.segments.map((seg, si) => (
              <span key={si} style={si === item.segmentIdx ? { color: item.correctRule.color, fontWeight: 700 } : undefined}>{seg.text}</span>
            ))}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {assignedRule
            ? <span className="inline-block rounded-full px-2 py-1 text-[10px] font-bold" style={{ background: assignedRule.color + "22", color: assignedRule.color }}>{assignedRule.name[language]}</span>
            : <span className="text-[10px] text-[color:var(--muted)]">{isSelected ? (language === "ms" ? "Pilih hukum ↓" : "Pick rule ↓") : (language === "ms" ? "Ketik pilih" : "Tap to select")}</span>}
        </div>
      </div>
    </div>
  );
}

function SoundSorterStage({
  surahNumber,
  items,
  buckets,
  language,
  onAnswer,
}: {
  surahNumber: number;
  items: { ayah: number; segmentIdx: number; segments: TajweedSegment[]; correctRule: TajweedRule }[];
  buckets: TajweedRule[];
  language: "en" | "ms";
  onAnswer: (correct: boolean, rule?: TajweedRule) => void;
}) {
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const allAssigned = items.every((_, i) => assignments[i] !== undefined);

  function selectItem(idx: number) {
    if (submitted) return;
    setSelected(selected === idx ? null : idx);
  }

  function assignBucket(ruleCode: string) {
    if (submitted || selected === null) return;
    setAssignments((prev) => ({ ...prev, [selected]: ruleCode }));
    setSelected(null);
  }

  function check() {
    if (!allAssigned || submitted) return;
    setSubmitted(true);
    const correct = items.filter((item, i) => assignments[i] === item.correctRule.code).length;
    const isCorrect = correct / items.length >= 0.75;
    // Report the most common correct rule as the feedback rule
    const correctItems = items.filter((item, i) => assignments[i] === item.correctRule.code);
    const feedbackRule = correctItems[0]?.correctRule ?? items[0]?.correctRule;
    setTimeout(() => onAnswer(isCorrect, feedbackRule), 700);
  }

  return (
    <div className="card-raised p-6 sm:p-8 animate-fade-up space-y-5">
      <div className="text-center">
        <p className="eyebrow mb-1 text-[color:var(--accent-strong)]">
          {language === "ms" ? "🎧 Pengisih Bunyi" : "🎧 Sound Sorter"}
        </p>
        <p className="text-xs text-[color:var(--muted)]">
          {language === "ms"
            ? "Dengar setiap ayat · pilih segmen · kemudian ketik hukum yang betul"
            : "Listen to each verse · select a segment · then tap the correct rule"}
        </p>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item, i) => (
          <SoundSorterItem
            key={i}
            index={i}
            item={item}
            surahNumber={surahNumber}
            isSelected={selected === i}
            assignedRule={buckets.find((b) => b.code === assignments[i])}
            submitted={submitted}
            language={language}
            onSelect={selectItem}
          />
        ))}
      </div>

      {/* Buckets */}
      <div className="grid grid-cols-2 gap-2">
        {buckets.map((rule) => (
          <button
            key={rule.code}
            onClick={() => assignBucket(rule.code)}
            disabled={submitted || selected === null}
            className={classNames(
              "rounded-2xl border-2 p-3 text-left transition-all",
              selected !== null && !submitted
                ? "border-dashed hover:scale-[1.02] active:scale-[0.98]"
                : "opacity-60 cursor-default",
              submitted ? "pointer-events-none" : ""
            )}
            style={selected !== null ? { borderColor: rule.color, background: rule.color + "10" } : undefined}
          >
            <p className="text-sm font-bold" style={{ color: rule.color }}>{rule.name[language]}</p>
            <p className="text-[10px] text-[color:var(--muted)] mt-0.5 leading-tight line-clamp-2">
              {rule.condition[language].slice(0, 60)}…
            </p>
          </button>
        ))}
      </div>

      <button
        onClick={check}
        disabled={!allAssigned || submitted}
        className={classNames(
          "w-full rounded-2xl py-4 text-base font-bold transition-all active:scale-[0.98]",
          allAssigned && !submitted
            ? "text-white hover:-translate-y-0.5"
            : "bg-[color:var(--border)] text-[color:var(--muted)] cursor-not-allowed"
        )}
        style={allAssigned && !submitted ? {
          background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
          boxShadow: "0 12px 32px -8px var(--accent-glow)",
        } : undefined}
      >
        {language === "ms" ? "SEMAK" : "CHECK"} →
      </button>
    </div>
  );
}

/* ── Mistake Finder (3★) ─────────────────────────────────────────────── */

function MistakeFinderStage({
  ayah,
  segments,
  wrongSegmentIdx,
  shownRuleCode,
  actualRuleCode,
  surahNumber,
  language,
  onAnswer,
}: {
  ayah: number;
  segments: TajweedSegment[];
  wrongSegmentIdx: number;
  shownRuleCode: string;
  actualRuleCode: string;
  surahNumber: number;
  language: "en" | "ms";
  onAnswer: (correct: boolean, rule?: TajweedRule) => void;
}) {
  const [tapped, setTapped] = useState<number | null>(null);

  // Render the verse but recolor the "wrong" segment with the fake rule's color.
  const shownRule = getTajweedRule(shownRuleCode);

  function tap(idx: number) {
    if (tapped !== null) return;
    setTapped(idx);
    const isCorrect = idx === wrongSegmentIdx;
    const actualRule = getTajweedRule(actualRuleCode);
    setTimeout(() => onAnswer(isCorrect, actualRule ?? undefined), 400);
  }

  return (
    <div className="card-raised p-6 sm:p-8 animate-fade-up space-y-5">
      <div className="text-center">
        <p className="eyebrow mb-1 text-[color:var(--accent-strong)]">
          🕵️ {language === "ms" ? "Mod Detektif" : "Detective Mode"}
        </p>
        <p className="font-semibold text-sm mb-0.5">
          {language === "ms" ? "Cari kesilapan Tajweed" : "Spot the Tajweed mistake"}
        </p>
        <p className="text-xs text-[color:var(--muted)]">
          {language === "ms"
            ? "Satu segmen diwarnakan dengan peraturan yang salah. Ketik segmen itu."
            : "One segment is colored with the wrong rule. Tap that segment."}
        </p>
      </div>

      <div className="rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] p-4">
        <p
          className="arabic text-center leading-loose"
          lang="ar"
          dir="rtl"
          style={{ fontSize: "var(--arabic-md)" }}
        >
          {segments.map((seg, idx) => {
            const trueRule = seg.code ? getTajweedRule(seg.code) : undefined;
            const isWrongOne = idx === wrongSegmentIdx;
            const effectiveColor =
              isWrongOne && shownRule
                ? shownRule.color
                : trueRule
                ? trueRule.color
                : undefined;
            if (!seg.code || !trueRule) {
              return <span key={idx}>{seg.text}</span>;
            }
            const isTapped = tapped === idx;
            const isLocked = tapped !== null;
            // Every annotated segment is a tap candidate (one of them is
            // mis-colored). Background tint in the shown rule color + a gold
            // dashed underline ensure the segment is visible even when the
            // rule's own color is a muted grey.
            const tintBg = effectiveColor
              ? `color-mix(in srgb, ${effectiveColor} 22%, transparent)`
              : undefined;
            return (
              <span
                key={idx}
                role="button"
                tabIndex={isLocked ? -1 : 0}
                onClick={() => !isLocked && tap(idx)}
                onKeyDown={(e) => {
                  if (isLocked) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    tap(idx);
                  }
                }}
                aria-disabled={isLocked}
                className={classNames(
                  "cursor-pointer transition-colors rounded-md underline decoration-dashed underline-offset-[6px] decoration-2",
                  isLocked && "cursor-default",
                  isTapped && !isWrongOne && "animate-shake"
                )}
                style={{
                  color: effectiveColor,
                  backgroundColor:
                    isTapped && isWrongOne
                      ? "color-mix(in srgb, var(--accent) 35%, transparent)"
                      : isTapped && !isWrongOne
                      ? "color-mix(in srgb, var(--danger) 35%, transparent)"
                      : tintBg,
                  textDecorationColor: "var(--gold)",
                }}
              >
                {seg.text}
              </span>
            );
          })}
        </p>
      </div>

      <PlayVerseButton surahNumber={surahNumber} ayah={ayah} language={language} />
    </div>
  );
}

/* ── Count Rules (3★) ────────────────────────────────────────────────── */

function CountRulesStage({
  ayah,
  segments,
  targetRule,
  correctCount,
  options,
  surahNumber,
  language,
  onAnswer,
}: {
  ayah: number;
  segments: TajweedSegment[];
  targetRule: TajweedRule;
  correctCount: number;
  options: number[];
  surahNumber: number;
  language: "en" | "ms";
  onAnswer: (correct: boolean, rule?: TajweedRule) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);

  function pick(n: number) {
    if (picked !== null) return;
    setPicked(n);
    setTimeout(() => onAnswer(n === correctCount, targetRule), 400);
  }

  return (
    <div className="card-raised p-6 sm:p-8 animate-fade-up space-y-5">
      <div className="text-center">
        <p className="eyebrow mb-1">
          {language === "ms"
            ? `Berapa kali "${targetRule.name[language]}" muncul?`
            : `How many times does "${targetRule.name[language]}" appear?`}
        </p>
        <p className="text-xs text-[color:var(--muted)]">
          {language === "ms" ? `Ayat ${ayah}` : `Verse ${ayah}`}
        </p>
      </div>

      <div className="rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] p-4">
        {/* Show verse without rule colors so user must identify from form. */}
        <RenderedAyah segments={segments} monochrome />
      </div>

      <PlayVerseButton surahNumber={surahNumber} ayah={ayah} language={language} />

      <div className="grid grid-cols-4 gap-3">
        {options.map((n) => {
          const isPicked = picked === n;
          const isCorrect = n === correctCount;
          const hasPick = picked !== null;
          return (
            <button
              key={n}
              onClick={() => pick(n)}
              disabled={hasPick}
              className={classNames(
                "rounded-2xl border-2 py-5 text-center transition-all duration-300 active:scale-[0.98]",
                !hasPick && "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]/30",
                hasPick && isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent)] text-white",
                hasPick && isPicked && !isCorrect && "border-[color:var(--danger)] bg-[color:var(--danger)] text-white animate-shake",
                hasPick && !isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/60",
                hasPick && !isPicked && !isCorrect && "opacity-40"
              )}
            >
              <span className="text-2xl font-black tabular-nums">{n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Audio Tap (3★) ──────────────────────────────────────────────────── */

function AudioTapStage({
  ayah,
  surahNumber,
  segments,
  targetRule,
  targetSegmentIdxs,
  language,
  onAnswer,
}: {
  ayah: number;
  surahNumber: number;
  segments: TajweedSegment[];
  targetRule: TajweedRule;
  targetSegmentIdxs: number[];
  language: "en" | "ms";
  onAnswer: (correct: boolean, rule?: TajweedRule) => void;
}) {
  const [tapped, setTapped] = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  // Reuse the singleton audio store so a Play button elsewhere can't run
  // alongside this stage's playback, and so this stage's big play/pause +
  // progress derive from the same source of truth.
  const { playing, progress } = useVerseAudioState(surahNumber, ayah);

  function toggle(idx: number) {
    if (submitted) return;
    setTapped((s) => {
      const next = new Set(s);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function play() {
    toggleVerseAudio(surahNumber, ayah);
  }

  function check() {
    if (submitted) return;
    setSubmitted(true);
    const correctSet = new Set(targetSegmentIdxs);
    // Lenient scoring: without word-level audio timing, exact matches on long
    // verses are unrealistic. Pass if the user found ≥2/3 of the target
    // occurrences AND made at most 1 false positive.
    const tappedArr = [...tapped];
    const truePositives = tappedArr.filter((i) => correctSet.has(i)).length;
    const falsePositives = tappedArr.length - truePositives;
    const needed = Math.max(1, Math.ceil(correctSet.size * (2 / 3)));
    const isCorrect = truePositives >= needed && falsePositives <= 1;
    setTimeout(() => onAnswer(isCorrect, targetRule), 700);
  }

  // For renderer: which segments are currently selected.
  const tappedIdxs = useMemo(() => tapped, [tapped]);

  return (
    <div className="card-raised p-6 sm:p-8 animate-fade-up space-y-5">
      <div className="text-center">
        <p className="eyebrow mb-1">
          {language === "ms"
            ? `Dengar dan tandakan setiap "${targetRule.name[language]}"`
            : `Listen and mark every "${targetRule.name[language]}"`}
        </p>
        <p className="text-xs text-[color:var(--muted)]">
          {language === "ms"
            ? "Cari sekurang-kurangnya dua pertiga — sedikit ralat dibenarkan"
            : "Find at least two-thirds — small slips are forgiven"}
        </p>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={play}
          className={classNames(
            "h-16 w-16 rounded-full text-black grid place-items-center shadow-lg active:scale-95 transition-all",
            playing ? "bg-[color:var(--accent)] text-white" : "bg-[color:var(--gold)]"
          )}
          aria-label={
            playing
              ? language === "ms"
                ? "Henti sebentar"
                : "Pause"
              : language === "ms"
              ? "Main ayat"
              : "Play verse"
          }
        >
          {playing ? (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden>
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden>
              <path d="M8 5l12 7-12 7z" />
            </svg>
          )}
        </button>
      </div>

      <div className="rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] p-4">
        <RenderedAyah
          segments={segments}
          monochrome
          tappable
          onSegmentTap={toggle}
          tappedIdxs={tappedIdxs}
        />
        {/* RTL playback progress — Arabic reads right→left, so the bar fills right→left
            as the audio plays. No word-level timing data; this is a coarse cue mapping
            elapsed audio to position along the verse so users can anchor what they hear. */}
        <div
          className="relative h-1 rounded-full bg-[color:var(--border)] mt-3 overflow-hidden"
          aria-hidden
        >
          <div
            className="absolute inset-y-0 right-0 rounded-full transition-[width] duration-150"
            style={{
              width: `${Math.round(progress * 100)}%`,
              background: "linear-gradient(270deg, var(--gold), var(--accent))",
            }}
          />
        </div>
        <p className="text-[10px] text-center text-[color:var(--muted)] mt-2">
          {language === "ms" ? `Ayat ${ayah}` : `Verse ${ayah}`}
        </p>
      </div>

      <button
        onClick={check}
        disabled={submitted}
        className={classNames(
          "w-full rounded-2xl py-4 text-base font-bold transition-all active:scale-[0.98]",
          !submitted
            ? "text-white hover:-translate-y-0.5"
            : "bg-[color:var(--border)] text-[color:var(--muted)] cursor-not-allowed"
        )}
        style={
          !submitted
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

/* ── Hear the Rule (1★ audio) ────────────────────────────────────────── */

function HearTheRuleStage({
  hit,
  surahNumber,
  options,
  language,
  onAnswer,
}: {
  hit: RuleHit;
  surahNumber: number;
  options: TajweedRule[];
  language: "en" | "ms";
  onAnswer: (correct: boolean, rule?: TajweedRule) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const { playing } = useVerseAudioState(surahNumber, hit.ayah);
  const target = hit.rule;

  const pick = (code: string) => {
    if (picked) return;
    setPicked(code);
    setTimeout(() => {
      setRevealed(true);
      onAnswer(code === target.code, target);
    }, 400);
  };

  return (
    <div className="card-raised p-6 sm:p-8 animate-fade-up space-y-5">
      <div className="text-center">
        <p className="eyebrow mb-1 text-[color:var(--accent-strong)]">
          🎧 {language === "ms" ? "Dengar & Kenal" : "Hear the Rule"}
        </p>
        <p className="font-semibold text-sm mb-0.5">
          {language === "ms"
            ? "Dengar ayat. Peraturan manakah yang digunakan?"
            : "Listen to the verse. Which rule is being applied?"}
        </p>
        <p className="text-xs text-[color:var(--muted)]">
          {language === "ms"
            ? "Kenal dari bunyi sahaja — tiada warna"
            : "Identify from sound alone — no colors"}
        </p>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => toggleVerseAudio(surahNumber, hit.ayah)}
          className={classNames(
            "h-16 w-16 rounded-full grid place-items-center shadow-lg active:scale-95 transition-all",
            playing ? "bg-[color:var(--accent)] text-white" : "bg-[color:var(--gold)] text-black"
          )}
          aria-label={playing ? (language === "ms" ? "Henti" : "Pause") : (language === "ms" ? "Main" : "Play")}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden>
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden>
              <path d="M8 5l12 7-12 7z" />
            </svg>
          )}
        </button>
      </div>

      {revealed && (
        <div className="rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] p-4 animate-fade-up">
          <p className="text-xs text-[color:var(--muted)] text-center mb-2">
            {language === "ms" ? "Ayat yang dimainkan:" : "The verse played:"}
          </p>
          <RenderedAyah
            segments={hit.ayahSegments}
            highlightIdx={hit.segmentIdx}
            monochrome={false}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((o) => {
          const isPicked = picked === o.code;
          const isCorrect = o.code === target.code;
          return (
            <button
              key={o.code}
              onClick={() => pick(o.code)}
              disabled={picked !== null}
              className={classNames(
                "rounded-2xl border-2 px-4 py-3 text-left transition-all duration-300 active:scale-[0.98] min-h-[60px]",
                !picked && "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]/30",
                picked && isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent)] text-white",
                picked && isPicked && !isCorrect && "border-[color:var(--danger)] bg-[color:var(--danger)] text-white animate-shake",
                picked && !isPicked && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/60",
                picked && !isPicked && !isCorrect && "opacity-40"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: o.color }}
                  aria-hidden
                />
                <span className="font-bold text-sm">{o.name[language]}</span>
              </div>
              <span className="text-[11px] opacity-75 block mt-0.5 font-mono">{o.name.ar}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Confused Pairs (2★) ─────────────────────────────────────────────── */

function ConfusedPairsStage({
  pairA,
  pairB,
  distractors,
  language,
  onAnswer,
}: {
  pairA: TajweedRule;
  pairB: TajweedRule;
  distractors: [TajweedRule, TajweedRule];
  language: "en" | "ms";
  onAnswer: (correct: boolean, rule?: TajweedRule) => void;
}) {
  // blanks[0] = slot for pairA, blanks[1] = slot for pairB
  const [blanks, setBlanks] = useState<[string | null, string | null]>([null, null]);
  const [activeSlot, setActiveSlot] = useState<0 | 1 | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const wordBank = useMemo(
    () => [pairA, pairB, distractors[0], distractors[1]].sort(
      (a, b) => a.name[language].localeCompare(b.name[language])
    ),
    [pairA, pairB, distractors, language]
  );

  const allFilled = blanks[0] !== null && blanks[1] !== null;

  function tapSlot(idx: 0 | 1) {
    if (submitted) return;
    setActiveSlot((s) => (s === idx ? null : idx));
  }

  function tapTile(code: string) {
    if (submitted || activeSlot === null) return;
    const next = [...blanks] as [string | null, string | null];
    next[activeSlot] = code;
    setBlanks(next);
    setActiveSlot(null);
  }

  function check() {
    if (!allFilled || submitted) return;
    setSubmitted(true);
    const correct = blanks[0] === pairA.code && blanks[1] === pairB.code;
    setTimeout(() => onAnswer(correct, correct ? pairA : pairA), 600);
  }

  const isCorrectA = submitted && blanks[0] === pairA.code;
  const isCorrectB = submitted && blanks[1] === pairB.code;

  const findRule = (code: string | null) =>
    code ? [pairA, pairB, ...distractors].find((r) => r.code === code) ?? null : null;

  return (
    <div className="card-raised p-6 sm:p-8 animate-fade-up space-y-5">
      <div className="text-center">
        <p className="eyebrow mb-1">
          {language === "ms" ? "Bezakan pasangan yang mengelirukan" : "Distinguish the confused pair"}
        </p>
        <p className="text-xs text-[color:var(--muted)]">
          {language === "ms"
            ? "Isi nama peraturan yang betul untuk setiap syarat"
            : "Fill in the correct rule name for each condition"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ConfusedBlankSlot
          idx={0}
          rule={pairA}
          isCorrect={isCorrectA}
          filledRule={findRule(blanks[0])}
          isActive={activeSlot === 0}
          submitted={submitted}
          language={language}
          onTap={() => tapSlot(0)}
        />
        <ConfusedBlankSlot
          idx={1}
          rule={pairB}
          isCorrect={isCorrectB}
          filledRule={findRule(blanks[1])}
          isActive={activeSlot === 1}
          submitted={submitted}
          language={language}
          onTap={() => tapSlot(1)}
        />
      </div>

      <div>
        <p className="text-xs text-[color:var(--muted)] mb-2 text-center">
          {language === "ms" ? "Bank kata — ketik untuk meletak" : "Word bank — tap to place"}
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {wordBank.map((r) => {
            const isPlaced = blanks.includes(r.code);
            return (
              <button
                key={r.code}
                onClick={() => tapTile(r.code)}
                disabled={submitted || isPlaced}
                className={classNames(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition-all active:scale-95 flex items-center gap-2",
                  isPlaced && "opacity-30 pointer-events-none",
                  !isPlaced && activeSlot !== null && "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/30 hover:bg-[color:var(--accent-soft)]/60",
                  !isPlaced && activeSlot === null && "border-[color:var(--border-strong)] bg-[color:var(--surface)] hover:border-[color:var(--accent)]"
                )}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} aria-hidden />
                {r.name[language]}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={check}
        disabled={!allFilled || submitted}
        className={classNames(
          "w-full rounded-2xl py-4 text-base font-bold transition-all active:scale-[0.98]",
          allFilled && !submitted
            ? "text-white hover:-translate-y-0.5"
            : "bg-[color:var(--border)] text-[color:var(--muted)] cursor-not-allowed"
        )}
        style={allFilled && !submitted ? {
          background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
          boxShadow: "0 12px 32px -8px var(--accent-glow)",
        } : undefined}
      >
        {language === "ms" ? "SEMAK" : "CHECK"} →
      </button>
    </div>
  );
}

/** One fill-in slot of the Confused Pairs stage. Top-level (not nested in the
 *  stage) so React doesn't remount it — and reset its DOM — on every render. */
function ConfusedBlankSlot({
  idx,
  rule,
  isCorrect,
  filledRule,
  isActive,
  submitted,
  language,
  onTap,
}: {
  idx: 0 | 1;
  rule: TajweedRule;
  isCorrect: boolean;
  filledRule: TajweedRule | null;
  isActive: boolean;
  submitted: boolean;
  language: "en" | "ms";
  onTap: () => void;
}) {
  return (
    <div
      className={classNames(
        "rounded-2xl border-2 p-4 flex flex-col gap-2 cursor-pointer transition-all",
        submitted && isCorrect && "border-[color:var(--accent)] bg-[color:var(--accent)]/8",
        submitted && !isCorrect && "border-[color:var(--danger)] bg-[color:var(--danger)]/8",
        !submitted && isActive && "border-[color:var(--gold)] bg-[color:var(--gold)]/10",
        !submitted && !isActive && "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)]/50"
      )}
      onClick={() => !submitted && onTap()}
      role="button"
      aria-label={`Slot ${idx + 1}`}
    >
      <p className="text-xs text-[color:var(--muted)] leading-snug line-clamp-3">
        {rule.condition[language]}
      </p>
      <div
        className={classNames(
          "rounded-xl px-3 py-2 text-sm font-bold text-center min-h-[36px] flex items-center justify-center gap-2 transition-all",
          filledRule
            ? "bg-[color:var(--surface-raised)] border border-[color:var(--border-strong)]"
            : "border-2 border-dashed border-[color:var(--border-strong)]"
        )}
      >
        {filledRule ? (
          <>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: filledRule.color }} aria-hidden />
            {filledRule.name[language]}
          </>
        ) : (
          <span className="text-[color:var(--muted)] text-xs">
            {isActive
              ? language === "ms" ? "↓ Pilih nama" : "↓ Pick a name"
              : language === "ms" ? "Ketik untuk isi" : "Tap to fill"}
          </span>
        )}
      </div>
      {submitted && !isCorrect && (
        <p className="text-xs text-[color:var(--accent-strong)] font-semibold">
          → {rule.name[language]}
        </p>
      )}
    </div>
  );
}

/* ── Rule Whisperer (3★) ─────────────────────────────────────────────── */

function RuleWhispererStage({
  ayah,
  surahNumber,
  segments,
  ruleSegments,
  language,
  onAnswer,
}: {
  ayah: number;
  surahNumber: number;
  segments: TajweedSegment[];
  ruleSegments: Array<{ segmentIdx: number; rule: TajweedRule; options: TajweedRule[] }>;
  language: "en" | "ms";
  onAnswer: (correct: boolean, rule?: TajweedRule) => void;
}) {
  // result for each segment: null = unresolved, true = correct 1st guess, false = wrong
  const [results, setResults] = useState<Record<number, boolean | null>>(() =>
    Object.fromEntries(ruleSegments.map((s) => [s.segmentIdx, null]))
  );
  const [active, setActive] = useState<number | null>(null);
  const [firstGuesses, setFirstGuesses] = useState<Record<number, boolean>>({});

  const resolved = ruleSegments.filter((s) => results[s.segmentIdx] !== null);
  const allDone = resolved.length === ruleSegments.length;

  useEffect(() => {
    if (allDone) {
      const correctFirstGuesses = Object.values(firstGuesses).filter(Boolean).length;
      const isCorrect = correctFirstGuesses / ruleSegments.length >= 0.6;
      setTimeout(() => onAnswer(isCorrect), 800);
    }
  }, [allDone, firstGuesses, ruleSegments.length, onAnswer]);

  function tapSegment(segIdx: number) {
    if (results[segIdx] !== null) return;
    setActive((a) => (a === segIdx ? null : segIdx));
  }

  function pickRule(segIdx: number, code: string) {
    const seg = ruleSegments.find((s) => s.segmentIdx === segIdx);
    if (!seg || results[segIdx] !== null) return;
    const isCorrect = code === seg.rule.code;
    if (!(segIdx in firstGuesses)) {
      setFirstGuesses((prev) => ({ ...prev, [segIdx]: isCorrect }));
    }
    setResults((prev) => ({ ...prev, [segIdx]: isCorrect }));
    setActive(null);
  }

  const activeSegData = active !== null ? ruleSegments.find((s) => s.segmentIdx === active) : null;

  return (
    <div className="card-raised p-6 sm:p-8 animate-fade-up space-y-5">
      <div className="text-center">
        <p className="eyebrow mb-1 text-[color:var(--accent-strong)]">
          ✦ {language === "ms" ? "Pembisik Hukum" : "Rule Whisperer"}
        </p>
        <p className="font-semibold text-sm mb-0.5">
          {language === "ms"
            ? "Ketik setiap segmen dan namakan hukumnya"
            : "Tap each segment and name its rule"}
        </p>
        <p className="text-xs text-[color:var(--muted)]">
          {resolved.length} / {ruleSegments.length}{" "}
          {language === "ms" ? "diselesaikan" : "resolved"}
        </p>
      </div>

      <PlayVerseButton surahNumber={surahNumber} ayah={ayah} language={language} />

      <div className="rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] p-4">
        <p
          className="arabic text-center leading-loose"
          lang="ar"
          dir="rtl"
          style={{ fontSize: "var(--arabic-md)" }}
        >
          {segments.map((seg, idx) => {
            const ruleEntry = ruleSegments.find((s) => s.segmentIdx === idx);
            const isRuleSeg = !!ruleEntry;
            const result = isRuleSeg ? results[idx] : null;
            const isActive = active === idx;
            const isResolved = result !== null;

            if (!isRuleSeg) {
              return <span key={idx}>{seg.text}</span>;
            }

            let bg = "color-mix(in srgb, var(--gold) 14%, transparent)";
            let textColor: string | undefined = undefined;
            if (isActive) bg = "color-mix(in srgb, var(--gold) 38%, transparent)";
            if (result === true) {
              bg = `color-mix(in srgb, ${ruleEntry.rule.color} 28%, transparent)`;
              textColor = ruleEntry.rule.color;
            }
            if (result === false) bg = "color-mix(in srgb, var(--danger) 20%, transparent)";

            return (
              <span
                key={idx}
                role="button"
                tabIndex={isResolved ? -1 : 0}
                onClick={() => !isResolved && tapSegment(idx)}
                onKeyDown={(e) => {
                  if (isResolved) return;
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tapSegment(idx); }
                }}
                className={classNames(
                  "rounded-md underline decoration-dashed underline-offset-[6px] decoration-2 transition-colors",
                  !isResolved && "cursor-pointer",
                  isResolved && "cursor-default"
                )}
                style={{
                  backgroundColor: bg,
                  color: textColor,
                  textDecorationColor: result === true ? ruleEntry.rule.color : "var(--gold)",
                }}
              >
                {seg.text}
              </span>
            );
          })}
        </p>
      </div>

      {activeSegData && (
        <div className="rounded-2xl border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/5 p-4 animate-fade-up space-y-3">
          <p className="text-xs text-[color:var(--muted)] text-center">
            {language === "ms" ? "Pilih hukum untuk segmen ini:" : "Pick the rule for this segment:"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {activeSegData.options.map((o) => (
              <button
                key={o.code}
                onClick={() => pickRule(activeSegData.segmentIdx, o.code)}
                className="rounded-xl border-2 border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-left hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]/20 transition-all active:scale-95"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: o.color }} aria-hidden />
                  <span className="text-sm font-bold">{o.name[language]}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!allDone && !active && (
        <p className="text-xs text-center text-[color:var(--muted)]">
          {language === "ms"
            ? "Ketik mana-mana segmen yang ditebalkan untuk menjawab"
            : "Tap any underlined segment to answer"}
        </p>
      )}
    </div>
  );
}

/* ── Completion ───────────────────────────────────────────────────────── */

function CompleteStage({
  surahName,
  surahNumber,
  difficulty,
  correct,
  total,
  starAwarded,
  language,
}: {
  surahName: string;
  surahNumber: number;
  difficulty: 1 | 2 | 3;
  correct: number;
  total: number;
  starAwarded: boolean;
  language: "en" | "ms";
}) {
  const badges = useLearning((s) => s.badges ?? {});
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const isPerfect = correct === total;

  // Show badges earned in the last 30 seconds (just unlocked this quest).
  // Captured once at mount so render stays pure (react-hooks/purity).
  const [cutoff] = useState(() => Date.now() - 30_000);
  const newBadges = BADGES.filter((b) => (badges[b.id] ?? 0) > cutoff);
  return (
    <div className="card-raised relative overflow-hidden p-8 sm:p-12 text-center animate-fade-up">
      <div
        aria-hidden
        className="absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-[color:var(--gold)]/20 blur-3xl"
      />
      {isPerfect && <ConfettiBurst />}
      <div className="relative">
        <div
          className={classNames(
            "inline-flex items-center justify-center h-24 w-24 rounded-full text-white text-4xl mb-5 shadow-[var(--shadow-glow)] animate-pop",
            starAwarded
              ? "bg-gradient-to-br from-[color:var(--gold)] to-[color:var(--accent)]"
              : "bg-gradient-to-br from-[color:var(--muted)] to-[color:var(--border-strong)]"
          )}
        >
          {isPerfect ? "✦" : starAwarded ? "✓" : "↻"}
        </div>
        <p className="eyebrow text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] mb-2">
          {language === "ms" ? "Cabaran Tajweed selesai" : "Tajweed Quest complete"}
        </p>
        <h1 className="display text-[length:var(--text-3xl)] mb-2" style={{ fontWeight: 600 }}>
          {surahName}
        </h1>
        <p className="text-xs uppercase tracking-widest text-[color:var(--muted)] mb-2">
          {"★".repeat(difficulty)}
          <span className="opacity-30">{"★".repeat(3 - difficulty)}</span>
        </p>
        <p className="stat-display text-[length:var(--text-4xl)] text-[color:var(--accent-strong)] mb-1">
          {correct} <span className="text-[color:var(--muted)]">/ {total}</span>
        </p>
        <p className="text-sm text-[color:var(--muted)] mb-3">
          {pct}% {language === "ms" ? "tepat" : "correct"}
        </p>
        {!starAwarded && (
          <div className="rounded-2xl border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/5 px-4 py-3 mb-5 text-xs text-[color:var(--foreground)] leading-relaxed">
            {language === "ms"
              ? "Bintang ini memerlukan 80% jawapan tepat. Cuba sekali lagi untuk membukanya."
              : "This star unlocks at 80% accuracy. Replay to earn it."}
          </div>
        )}
        {starAwarded && !isPerfect && <div className="mb-3" />}

        {/* Newly unlocked badges */}
        {newBadges.length > 0 && (
          <div className="mb-5 rounded-2xl border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/8 px-4 py-3 animate-pop">
            <p className="eyebrow text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] mb-2">
              {language === "ms" ? "Lencana baru!" : "Badge unlocked!"}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {newBadges.map((b) => (
                <span
                  key={b.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--gold)]/20 text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] px-3 py-1.5 text-sm font-bold"
                >
                  {b.icon} {b.name[language]}
                </span>
              ))}
            </div>
          </div>
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
            {language === "ms" ? "Kembali" : "Done"}
          </Link>
        </div>
      </div>
    </div>
  );
}
