"use client";

import { useMemo, useState } from "react";
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

interface SurahData {
  surahNumber: number;
  surahName: string;
  tajweedSurah: Record<string, string>;
}

interface Props {
  surahs: SurahData[];
}

export function StreakRunner({ surahs }: Props) {
  const language = useLearning((s) => s.language);
  const streakBest = useLearning((s) => s.streakBest ?? 0);
  const setStreakBest = useLearning((s) => s.setStreakBest);
  const recordTajweedAnswer = useLearning((s) => s.recordTajweedAnswer);

  const [phase, setPhase] = useState<"ready" | "playing" | "done">("ready");
  const [chain, setChain] = useState(0);
  const [longest, setLongest] = useState(0);
  const [total, setTotal] = useState(0);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [lastWrong, setLastWrong] = useState(false);

  // Flatten all hits from all surahs
  const allHitsWithSurah = useMemo(() => {
    const out: Array<{ hit: RuleHit; surahNumber: number; surahName: string }> = [];
    for (const s of surahs) {
      for (const hit of collectRuleHits(s.tajweedSurah)) {
        out.push({ hit, surahNumber: s.surahNumber, surahName: s.surahName });
      }
    }
    return out;
  }, [surahs]);

  const { entry, options } = useMemo(() => {
    if (!allHitsWithSurah.length) return { entry: null, options: [] };
    const rng = seededRng(`streak-q${questionIdx}`);
    const shuffled = shuffleSeeded(allHitsWithSurah, rng);
    const e = shuffled[0];
    const surahData = surahs.find((s) => s.surahNumber === e.surahNumber);
    const surahRules = surahData
      ? Array.from(new Map(collectRuleHits(surahData.tajweedSurah).map((h) => [h.code, h.rule])).values())
      : [];
    return { entry: e, options: buildRuleOptions(e.hit.rule, 4, rng, surahRules) };
  }, [allHitsWithSurah, surahs, questionIdx]);

  function start() {
    setPhase("playing");
    setChain(0);
    setLongest(0);
    setTotal(0);
    setQuestionIdx(0);
    setPicked(null);
    setLastWrong(false);
  }

  function answer(code: string) {
    if (!entry || picked) return;
    const isCorrect = code === entry.hit.rule.code;
    setPicked(code);
    recordTajweedAnswer(entry.hit.rule.code, isCorrect);
    setTotal((t) => t + 1);

    if (isCorrect) {
      const newChain = chain + 1;
      setChain(newChain);
      setLongest((l) => Math.max(l, newChain));
      setLastWrong(false);
    } else {
      setLastWrong(true);
      setChain(0);
    }

    setTimeout(() => {
      setPicked(null);
      setQuestionIdx((i) => i + 1);
    }, 500);
  }

  function finish() {
    setStreakBest(longest);
    setPhase("done");
  }

  if (phase === "ready") {
    return (
      <div className="card-raised p-8 text-center space-y-5 animate-fade-up">
        <div>
          <p className="eyebrow text-[color:var(--accent-strong)] mb-2">
            {language === "ms" ? "Rantaian Hukum" : "Rule Streak"}
          </p>
          <h2 className="display text-[length:var(--text-2xl)]" style={{ fontWeight: 600 }}>
            {language === "ms" ? "Jangan Putuskan Rantaian" : "Don't Break the Chain"}
          </h2>
        </div>
        <div className="rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] p-5 space-y-2 text-sm text-left">
          <p>
            {language === "ms"
              ? "Jawab soalan dari semua surah. Setiap jawapan betul tambah ke rantai."
              : "Answer questions drawn from all surahs. Each correct answer extends your chain."}
          </p>
          <p className="text-[color:var(--muted)]">
            {language === "ms"
              ? "Jawapan salah menetapkan semula rantai — sesi terus. Skor = rantai terpanjang."
              : "A wrong answer resets the chain — the session continues. Score = longest chain."}
          </p>
        </div>
        {streakBest > 0 && (
          <p className="text-sm font-semibold text-[color:var(--accent-strong)]">
            {language === "ms" ? `Rekod terbaik: ${streakBest}` : `Personal best: ${streakBest}`}
          </p>
        )}
        <button
          onClick={start}
          className="w-full rounded-2xl py-4 text-base font-bold text-white active:scale-[0.98] hover:-translate-y-0.5 transition-all"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
            boxShadow: "0 12px 32px -8px var(--accent-glow)",
          }}
        >
          {language === "ms" ? "MULA" : "START"} →
        </button>
        <Link href="/learn" className="block text-sm text-[color:var(--muted)] hover:text-[color:var(--accent)] transition-colors">
          {language === "ms" ? "← Kembali" : "← Back"}
        </Link>
      </div>
    );
  }

  if (phase === "done") {
    const isNewBest = longest > streakBest;
    return (
      <div className="card-raised p-8 text-center space-y-5 animate-fade-up">
        <p className="eyebrow text-[color:var(--accent-strong)] mb-1">
          {language === "ms" ? "Sesi selesai" : "Session ended"}
        </p>
        <div>
          <p className="text-sm text-[color:var(--muted)] mb-1">
            {language === "ms" ? "Rantai terpanjang" : "Longest chain"}
          </p>
          <p className="stat-display text-[clamp(4rem,3rem+4vw,6rem)] text-[color:var(--accent-strong)] tabular-nums leading-none">
            {longest}
          </p>
        </div>
        <p className="text-xs text-[color:var(--muted)]">
          {total} {language === "ms" ? "soalan dijawab" : "questions answered"}
        </p>
        {isNewBest && (
          <div className="rounded-2xl border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/10 px-4 py-3 animate-pop">
            <p className="font-bold text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]">
              {language === "ms" ? "🏆 Rekod baru!" : "🏆 New record!"}
            </p>
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={start}
            className="flex-1 rounded-2xl py-3 text-sm font-bold text-white active:scale-[0.98] transition-all"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-strong))", boxShadow: "0 8px 24px -8px var(--accent-glow)" }}
          >
            {language === "ms" ? "CUBA LAGI" : "PLAY AGAIN"}
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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--muted)]">
            {language === "ms" ? "Rantai sekarang" : "Current chain"}
          </p>
          <p className={classNames(
            "stat-display text-[length:var(--text-3xl)] tabular-nums leading-none transition-colors",
            chain > 0 ? "text-[color:var(--accent-strong)]" : "text-[color:var(--foreground)]"
          )}>
            {chain}
            {chain > 0 && <span className="text-base ml-1">🔗</span>}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--muted)]">
            {language === "ms" ? "Terpanjang" : "Longest"}
          </p>
          <p className="stat-display text-[length:var(--text-xl)] tabular-nums text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]">
            {longest}
          </p>
        </div>
        <button
          onClick={finish}
          className="rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-4 py-2 text-xs font-semibold hover:border-[color:var(--accent)] transition-colors"
        >
          {language === "ms" ? "Berhenti" : "Stop"}
        </button>
      </div>

      {lastWrong && (
        <div className="rounded-xl bg-[color:var(--danger)]/8 border border-[color:var(--danger)]/25 px-4 py-2 text-center text-sm text-[color:var(--danger)] font-semibold animate-fade-up">
          {language === "ms" ? "Rantai terputus — teruskan!" : "Chain broken — keep going!"}
        </div>
      )}

      {entry && (
        <div className="card-raised p-6 space-y-4">
          <p className="eyebrow text-center mb-1">
            {language === "ms" ? "Apakah hukum yang diserlahkan?" : "Which rule is highlighted?"}
          </p>
          <p className="text-[10px] text-center text-[color:var(--muted)]">
            {entry.surahName} · {language === "ms" ? `Ayat ${entry.hit.ayah}` : `Verse ${entry.hit.ayah}`}
          </p>
          <div className="rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] p-4">
            <p
              className="arabic text-center leading-loose"
              lang="ar"
              dir="rtl"
              style={{ fontSize: "var(--arabic-md)" }}
            >
              {entry.hit.ayahSegments.map((seg, idx) => {
                const rule = seg.code ? getTajweedRule(seg.code) : undefined;
                const isTarget = idx === entry.hit.segmentIdx;
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
              const isCorrect = o.code === entry.hit.rule.code;
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
