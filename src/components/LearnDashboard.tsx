"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLearning } from "@/store/learning";
import { UI_STRINGS } from "@/lib/i18n";
import {
  comprehensionPct,
  effectiveGloss,
  isDue,
  localDateKey,
  statusOf,
  type CoverageData,
  type LemmaMeta,
  type WordStatus,
} from "@/lib/learning";
import { seededRng } from "@/lib/tajweed-learning";
import { SURAHS } from "@/data/surahs";
import { QuestMap } from "@/components/QuestMap";
import { TrophyRoom } from "@/components/TrophyRoom";

const NEW_PER_SESSION = 5;

interface Props {
  previewLemmas: LemmaMeta[];
  coverage: CoverageData;
}

function useAnimatedNumber(target: number, durationMs = 900) {
  const [ratio, setRatio] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    if (reduced) {
      raf = requestAnimationFrame(() => setRatio(1));
      return () => cancelAnimationFrame(raf);
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setRatio(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return target * ratio;
}

export function LearnDashboard({ previewLemmas, coverage }: Props) {
  const lemmasState = useLearning((s) => s.lemmas);
  const introducedRank = useLearning((s) => s.introducedThroughRank);
  const dayStreak = useLearning((s) => s.dayStreak);
  const reviewedToday = useLearning((s) => s.reviewedToday);
  const xp = useLearning((s) => s.xp);
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];

  const [view, setView] = useState<"list" | "quest">("quest");

  const counts: Record<WordStatus, number> = { new: 0, weak: 0, good: 0, strong: 0 };
  for (const lemma of Object.keys(lemmasState)) {
    counts[statusOf(lemmasState[lemma])]++;
  }

  const pct = comprehensionPct(previewLemmas, lemmasState, coverage.totalTokens);
  const dueCount = Object.entries(lemmasState).filter(([, s]) => isDue(s)).length;
  const introduced = Object.keys(lemmasState).length;
  const nextNewSlice = previewLemmas.slice(
    Math.min(introducedRank, previewLemmas.length),
    Math.min(introducedRank + NEW_PER_SESSION, previewLemmas.length)
  );
  const nextMilestone =
    coverage.milestones.find((m) => m.topN > Math.max(introduced, introducedRank)) ??
    coverage.milestones[coverage.milestones.length - 1];

  const mastered = counts.good + counts.strong;

  return (
    <div className="space-y-8 sm:space-y-10 stagger-children">
      {/* ── HERO ── */}
      <section className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-gradient-to-br from-[color:var(--surface)] via-[color:var(--accent-soft)]/30 to-[color:var(--surface)] p-7 sm:p-10">
        <div aria-hidden className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[color:var(--accent)]/8 blur-3xl" />
        <div className="relative grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-6 sm:gap-8 items-center">
          <ProgressRing pct={pct} />
          <div className="min-w-0">
            <p className="eyebrow text-[color:var(--accent-strong)] mb-2 sm:mb-3">{t.dash_comprehension}</p>
            {pct === 0 && introduced === 0 ? (
              <>
                <p className="display text-[length:var(--text-2xl)] sm:text-[length:var(--text-3xl)] text-[color:var(--foreground)] leading-tight" style={{ fontWeight: 600 }}>
                  {language === "ms" ? "Perjalanan anda bermula di sini" : "Your journey starts here"}
                </p>
                <p className="mt-2 text-sm text-[color:var(--muted-strong)] leading-relaxed max-w-md">
                  {language === "ms" ? "Mula sesi pertama anda untuk membuka peratusan kefahaman." : "Start your first session to unlock your comprehension percentage."}
                </p>
              </>
            ) : (
              <>
                <p className="flex items-baseline gap-1">
                  <span className="stat-display text-[clamp(3rem,2.4rem+3vw,5rem)] text-[color:var(--accent-strong)]">{pct.toFixed(1)}</span>
                  <span className="stat-display text-[clamp(1.5rem,1.2rem+1.5vw,2.5rem)] text-[color:var(--accent)]">%</span>
                </p>
                <p className="text-sm text-[color:var(--muted-strong)] leading-relaxed mt-1">
                  {t.dash_of_quran.replace("{total}", coverage.totalTokens.toLocaleString())}
                </p>
              </>
            )}
          </div>
          {nextMilestone && (
            <div className="md:text-right md:max-w-[16rem] md:border-l md:border-[color:var(--border)] md:pl-6">
              <p className="eyebrow mb-2">{t.dash_milestone}</p>
              <p className="display text-[length:var(--text-2xl)] text-[color:var(--foreground)]" style={{ fontWeight: 600 }}>{nextMilestone.pct}%</p>
              <p className="text-xs text-[color:var(--muted)] mt-1 tabular-nums">
                {language === "ms" ? "Top" : "Top"} {nextMilestone.topN.toLocaleString()} {language === "ms" ? "lema" : "lemmas"}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Stat strip ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Stat label={t.dash_mastered} value={mastered} tone="accent" icon={<IconCheck />} />
        <Stat label={language === "ms" ? "XP Terkumpul" : "Total XP"} value={xp} tone="gold" icon={<IconZap />} />
        <Stat label={t.dash_due} value={dueCount} tone={dueCount > 0 ? "gold" : "muted"} pulse={dueCount > 0} icon={<IconRefresh />} />
        <Stat label={t.dash_streak} value={dayStreak} tone={dayStreak > 0 ? "gold" : "muted"} hint={`${reviewedToday} ${t.dash_reviewed_today}`} icon={<IconFlame />} />
      </section>

      {/* ── Daily quest ── */}
      <DailyQuest />

      {/* ── Primary actions ── */}
      <section className="space-y-3 sm:space-y-4">
        {/* Main CTA + vocab achievement */}
        <div className="grid sm:grid-cols-[3fr_2fr] gap-3 sm:gap-4">
          <PrimarySessionCard dueCount={dueCount} newCount={NEW_PER_SESSION} language={language} t={t} />
          <VocabAchievementCard count={introduced} language={language} t={t} />
        </div>

        {/* Daily Ayah Challenge */}
        <DailyAyahCard language={language} />

        {/* Feature cards — each with a distinct visual personality */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <TajweedGuideCard language={language} />
          <FoundationsCard language={language} />
          <WaqafCard language={language} />
        </div>

        {/* Game modes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <BlitzCard language={language} />
          <StreakCard language={language} />
          <QariCard language={language} />
        </div>

        {/* Utility row */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <AudioShadowCard language={language} />
          <AnalyticsCard language={language} />
        </div>

        {/* Weak review — surfaces urgently only when needed */}
        {counts.weak > 0 && (
          <WeakReviewCard count={counts.weak} t={t} />
        )}
      </section>

      {/* ── Trophy Room ── */}
      <section className="card p-6 sm:p-7">
        <TrophyRoom />
      </section>

      {/* ── Content View ── */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="display text-[length:var(--text-xl)]" style={{ fontWeight: 600 }}>
            {view === "quest" ? t.dash_quest_mubarak : t.dash_next_words}
          </h2>
          <div className="flex rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-1">
            <button
              onClick={() => setView("quest")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${view === "quest" ? "bg-[color:var(--accent)] text-white shadow-sm" : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"}`}
            >
              {t.dash_view_quest}
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${view === "list" ? "bg-[color:var(--accent)] text-white shadow-sm" : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"}`}
            >
              {t.dash_view_list}
            </button>
          </div>
        </div>

        {view === "quest" ? (
          <div className="card bg-gradient-to-b from-[color:var(--surface)] to-[color:var(--background)]">
            <QuestMap />
          </div>
        ) : (
          nextNewSlice.length > 0 && (
            <ul className="card divide-y divide-[color:var(--border)] overflow-hidden">
              {nextNewSlice.map((l, idx) => (
                <li key={l.lemma} className="group p-4 sm:p-5 flex items-center gap-4 transition-colors hover:bg-[color:var(--accent-soft)]/30">
                  <span className="w-10 shrink-0 stat-display text-base text-[color:var(--muted)] tabular-nums">{String(introducedRank + idx + 1).padStart(2, "0")}</span>
                  <div className="flex-1 min-w-0">
                    <p className="arabic text-[length:var(--arabic-sm)] text-[color:var(--accent-strong)] leading-none" lang="ar" dir="rtl">{l.lemma}</p>
                    {l.translit && <p className="text-xs text-[color:var(--muted)] italic mt-1.5">{l.translit}</p>}
                  </div>
                  <div className="text-right min-w-0 shrink-0">
                    <p className="text-sm flex items-baseline justify-end gap-1.5">
                      {(() => {
                        const g = effectiveGloss(l, language);
                        if (!g) return <span>—</span>;
                        return (
                          <>
                            <span className="font-medium">{g.text}</span>
                            {g.isFallback && <span className="text-[9px] font-semibold uppercase tracking-widest opacity-50">{language === "ms" ? "EN" : "MS"}</span>}
                          </>
                        );
                      })()}
                    </p>
                    <p className="text-[11px] text-[color:var(--muted)] tabular-nums mt-0.5">{l.count.toLocaleString()}× {t.dash_in_quran_short}</p>
                  </div>
                </li>
              ))}
            </ul>
          )
        )}
      </section>
    </div>
  );
}

function DailyQuest() {
  const language = useLearning((s) => s.language);
  const reviewedToday = useLearning((s) => s.reviewedToday);
  const lastSessionDate = useLearning((s) => s.lastSessionDate);
  const dayStreak = useLearning((s) => s.dayStreak);
  const dailyGoal = useLearning((s) => s.dailyGoal);
  const setDailyGoal = useLearning((s) => s.setDailyGoal);

  // `reviewedToday` only refreshes on the first review of a new day, so guard it:
  // if the last session wasn't today, today's progress is 0.
  const todayCount = lastSessionDate === localDateKey() ? reviewedToday : 0;
  const goal = dailyGoal || 10;
  const done = Math.min(todayCount, goal);
  const pct = Math.min(100, (done / goal) * 100);
  const complete = todayCount >= goal;

  return (
    <section
      className={`relative overflow-hidden rounded-[var(--radius-lg)] border p-5 sm:p-6 ${
        complete
          ? "border-[color:var(--gold)]/40 bg-gradient-to-br from-[color:var(--gold-soft)] to-[color:var(--surface)]"
          : "border-[color:var(--border)] bg-[color:var(--surface)]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] mb-1">
            {language === "ms" ? "Misi Harian" : "Daily Quest"}
          </p>
          <p className="display text-[length:var(--text-xl)]" style={{ fontWeight: 600 }}>
            {complete
              ? language === "ms"
                ? "Misi selesai! 🎉"
                : "Quest complete! 🎉"
              : language === "ms"
                ? `Ulang kaji ${goal} perkataan hari ini`
                : `Review ${goal} words today`}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--gold)]/15 text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] px-3 py-1 text-sm font-bold shrink-0">
          <IconFlame />
          {dayStreak}
          <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
            {language === "ms" ? "hari" : dayStreak === 1 ? "day" : "days"}
          </span>
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-[color:var(--muted)] mb-1.5 tabular-nums font-semibold">
          <span>
            {done} / {goal}
          </span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="relative h-2.5 rounded-full bg-[color:var(--border)] overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--gold) 0%, var(--accent) 100%)" }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {complete ? (
          <p className="text-sm text-[color:var(--muted-strong)]">
            {language === "ms"
              ? `Streak anda kini ${dayStreak} hari. Kembali esok untuk menyambungnya!`
              : `Your streak is ${dayStreak} ${dayStreak === 1 ? "day" : "days"}. Come back tomorrow to keep it going!`}
          </p>
        ) : (
          <Link
            href="/learn/session"
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] text-white px-5 py-2 text-sm font-semibold hover:bg-[color:var(--accent-strong)] transition-colors"
          >
            {language === "ms" ? "Teruskan misi" : "Continue quest"}
            <span aria-hidden>→</span>
          </Link>
        )}

        <label className="inline-flex items-center gap-2 text-xs text-[color:var(--muted)]">
          <span>{language === "ms" ? "Matlamat" : "Goal"}</span>
          <select
            value={goal}
            onChange={(e) => setDailyGoal(Number(e.target.value))}
            className="rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-2.5 py-1 text-xs focus:outline-none focus:border-[color:var(--accent)]"
            aria-label={language === "ms" ? "Tetapkan matlamat harian" : "Set daily goal"}
          >
            {[5, 10, 15, 20, 30].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function ProgressRing({ pct, size = 120, stroke = 8 }: { pct: number; size?: number; stroke?: number }) {
  const animated = useAnimatedNumber(pct, 900);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, animated)) / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--gold)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="url(#ringGradient)" strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 80ms linear" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--gold)]">✦</span>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "muted", hint, pulse = false, icon }: { label: string; value: number; tone?: "accent" | "muted" | "gold"; hint?: string; pulse?: boolean; icon?: React.ReactNode }) {
  const color = tone === "accent" ? "text-[color:var(--accent-strong)]" : tone === "gold" ? "text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]" : "text-[color:var(--foreground)]";
  const iconBg = tone === "accent" ? "bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]" : tone === "gold" ? "bg-[color:var(--gold-soft)] text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]" : "bg-[color:var(--border)]/60 text-[color:var(--muted-strong)]";
  return (
    <div className="relative rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--surface)] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="eyebrow text-[10px]">{label}</p>
        {icon && <span className={`h-8 w-8 rounded-lg grid place-items-center ${iconBg}`}>{icon}</span>}
      </div>
      <p className={`stat-display text-[length:var(--text-3xl)] ${color} ${pulse ? "animate-pulse-soft" : ""}`}>{value.toLocaleString()}</p>
      {hint && <p className="text-[11px] text-[color:var(--muted)] mt-1 leading-tight">{hint}</p>}
    </div>
  );
}

/* ── Specialized action card components ─────────────────────────────────── */

function PrimarySessionCard({ dueCount, newCount, language, t }: { dueCount: number; newCount: number; language: "en" | "ms"; t: typeof UI_STRINGS["en"] }) {
  return (
    <Link
      href="/learn/session"
      className="group relative overflow-hidden rounded-[var(--radius-lg)] bg-[color:var(--accent)] p-6 sm:p-7 flex flex-col min-h-44 shadow-[var(--shadow-glow)] hover:shadow-[0_16px_40px_-8px_var(--accent-glow)] hover:-translate-y-0.5 transition-all duration-200"
    >
      <span aria-hidden className="absolute -bottom-6 -right-4 arabic text-[7rem] leading-none text-white/[0.06] select-none pointer-events-none">
        تعلّم
      </span>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-2">
        {language === "ms" ? "Langkah seterusnya" : "Next step"}
      </p>
      <p className="display text-[length:var(--text-xl)] text-white leading-tight" style={{ fontWeight: 600 }}>
        {dueCount > 0 ? t.dash_continue_quest : t.dash_start_quest}
      </p>
      <div className="flex flex-wrap items-center gap-2 mt-4">
        {dueCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 text-white text-xs font-semibold px-3 py-1">
            <span className="text-sm font-bold tabular-nums">{dueCount}</span>
            {language === "ms" ? "ulang kaji" : "to review"}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 text-white text-xs font-semibold px-3 py-1">
          <span className="text-sm font-bold tabular-nums">+{newCount}</span>
          {language === "ms" ? "baru" : "new"}
        </span>
      </div>
      <div className="mt-auto pt-5 flex items-center gap-2 text-white/90 text-sm font-semibold group-hover:gap-3 transition-[gap] duration-200">
        <IconPlay />
        {language === "ms" ? "Mulakan sesi" : "Start session"}
        <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">→</span>
      </div>
    </Link>
  );
}

function VocabAchievementCard({ count, language, t }: { count: number; language: "en" | "ms"; t: typeof UI_STRINGS["en"] }) {
  return (
    <Link
      href="/learn/vocabulary"
      className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--gold)]/30 bg-gradient-to-b from-[color:var(--gold-soft)] to-[color:var(--surface)] p-5 sm:p-6 flex flex-col items-center justify-center text-center min-h-44 hover:border-[color:var(--gold)] hover:-translate-y-0.5 hover:shadow-[var(--shadow)] transition-all duration-200"
    >
      <span className="h-10 w-10 rounded-xl bg-[color:var(--gold-soft)] border border-[color:var(--gold)]/30 grid place-items-center mb-3 text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]">
        <IconBook />
      </span>
      <p className="stat-display text-[length:var(--text-3xl)] text-[color:var(--accent-strong)] dark:text-[color:var(--accent-strong)] tabular-nums">{count.toLocaleString()}</p>
      <p className="text-[11px] text-[color:var(--muted)] mt-0.5">
        {language === "ms" ? "perkataan dijejak" : "words tracked"}
      </p>
      <p className="text-sm font-semibold text-[color:var(--foreground)] mt-3">{t.dash_my_vocab}</p>
    </Link>
  );
}

const TAJWEED_SWATCHES = ["#60A5FA", "#22C55E", "#EF4444", "#A855F7", "#F59E0B", "#14B8A6"];

function TajweedGuideCard({ language }: { language: "en" | "ms" }) {
  return (
    <Link
      href="/learn/tajweed"
      className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] p-5 flex flex-col hover:border-[color:var(--accent)] hover:-translate-y-0.5 hover:shadow-[var(--shadow)] transition-all duration-200"
    >
      <div className="flex items-center gap-1.5 mb-4" aria-hidden>
        {TAJWEED_SWATCHES.map((c) => (
          <span key={c} className="h-5 w-5 rounded-[4px] shrink-0" style={{ background: c }} />
        ))}
      </div>
      <p className="display text-[length:var(--text-lg)] text-[color:var(--foreground)] leading-tight" style={{ fontWeight: 600 }}>
        {language === "ms" ? "Panduan Tajwid" : "Tajweed Guide"}
      </p>
      <p className="text-xs text-[color:var(--muted)] mt-1.5 leading-relaxed">
        {language === "ms" ? "Kod warna tajwid, tanda waqaf & cara bacaan" : "Color-coded rules, stop signs, how to recite"}
      </p>
      <span aria-hidden className="mt-auto pt-3 text-xs font-semibold text-[color:var(--muted)] group-hover:text-[color:var(--accent-strong)] transition-colors flex items-center gap-1">
        {language === "ms" ? "Buka panduan" : "Open guide"} →
      </span>
    </Link>
  );
}

function FoundationsCard({ language }: { language: "en" | "ms" }) {
  return (
    <Link
      href="/learn/foundations"
      className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--accent)]/20 bg-[color:var(--accent-soft)]/20 p-5 flex flex-col hover:border-[color:var(--accent)]/50 hover:-translate-y-0.5 hover:shadow-[var(--shadow)] transition-all duration-200"
    >
      <div className="flex items-baseline gap-3 mb-4 leading-none" lang="ar" dir="rtl" aria-hidden>
        <span className="arabic text-[length:var(--arabic-sm)] text-[color:var(--accent-strong)] dark:text-[color:var(--accent-strong)] leading-none">أَ</span>
        <span className="arabic text-[length:var(--arabic-sm)] text-[color:var(--accent-strong)] dark:text-[color:var(--accent-strong)] leading-none opacity-70">بِ</span>
        <span className="arabic text-[length:var(--arabic-sm)] text-[color:var(--accent-strong)] dark:text-[color:var(--accent-strong)] leading-none opacity-45">جُ</span>
      </div>
      <p className="display text-[length:var(--text-lg)] text-[color:var(--foreground)] leading-tight" style={{ fontWeight: 600 }}>
        {language === "ms" ? "Asas Bacaan" : "Foundations"}
      </p>
      <p className="text-xs text-[color:var(--muted)] mt-1.5 leading-relaxed">
        {language === "ms" ? "Huruf, baris, tanwin, sukun" : "Alphabet, vowels, tanween, sukun"}
      </p>
      <span aria-hidden className="mt-auto pt-3 text-xs font-semibold text-[color:var(--muted)] group-hover:text-[color:var(--accent-strong)] transition-colors flex items-center gap-1">
        {language === "ms" ? "Mula belajar" : "Start learning"} →
      </span>
    </Link>
  );
}

function WaqafCard({ language }: { language: "en" | "ms" }) {
  return (
    <Link
      href="/learn/waqf"
      className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--gold)]/25 bg-[color:var(--gold-soft)]/25 p-5 flex flex-col hover:border-[color:var(--gold)]/60 hover:-translate-y-0.5 hover:shadow-[var(--shadow)] transition-all duration-200"
    >
      <div className="flex items-baseline gap-4 mb-4 leading-none" lang="ar" dir="rtl" aria-hidden>
        <span className="arabic text-[length:var(--arabic-sm)] text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] leading-none">م</span>
        <span className="arabic text-[length:var(--arabic-sm)] text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] leading-none opacity-75">ج</span>
        <span className="arabic text-[length:var(--arabic-sm)] text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] leading-none opacity-50">لا</span>
      </div>
      <p className="display text-[length:var(--text-lg)] text-[color:var(--foreground)] leading-tight" style={{ fontWeight: 600 }}>
        {language === "ms" ? "Pakar Waqaf" : "Waqf Master"}
      </p>
      <p className="text-xs text-[color:var(--muted)] mt-1.5 leading-relaxed">
        {language === "ms" ? "Kuiz 11 tanda waqaf dalam Al-Quran" : "Quiz on 11 Quran stop signs"}
      </p>
      <span aria-hidden className="mt-auto pt-3 text-xs font-semibold text-[color:var(--muted)] group-hover:text-[color:var(--gold-strong)] dark:group-hover:text-[color:var(--gold)] transition-colors flex items-center gap-1">
        {language === "ms" ? "Mula kuiz" : "Start quiz"} →
      </span>
    </Link>
  );
}

function AudioShadowCard({ language }: { language: "en" | "ms" }) {
  return (
    <Link
      href="/learn/audio-shadow"
      className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-5 flex flex-col hover:border-[color:var(--accent)] hover:-translate-y-0.5 hover:shadow-[var(--shadow)] transition-all duration-200"
    >
      <span className="h-9 w-9 rounded-lg bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)] grid place-items-center mb-3">
        <IconWaveform />
      </span>
      <p className="display text-[length:var(--text-lg)] text-[color:var(--foreground)] leading-tight" style={{ fontWeight: 600 }}>
        {language === "ms" ? "Ikut Bacaan" : "Audio Shadowing"}
      </p>
      <p className="text-xs text-[color:var(--muted)] mt-1.5">
        {language === "ms" ? "Dengar, rakam & bandingkan" : "Listen, record, compare"}
      </p>
    </Link>
  );
}

function AnalyticsCard({ language }: { language: "en" | "ms" }) {
  return (
    <Link
      href="/analytics"
      className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-5 flex flex-col hover:border-[color:var(--accent)] hover:-translate-y-0.5 hover:shadow-[var(--shadow)] transition-all duration-200"
    >
      <span className="h-9 w-9 rounded-lg bg-[color:var(--border)]/60 text-[color:var(--muted-strong)] grid place-items-center mb-3">
        <IconBarChart />
      </span>
      <p className="display text-[length:var(--text-lg)] text-[color:var(--foreground)] leading-tight" style={{ fontWeight: 600 }}>
        {language === "ms" ? "Analitik" : "Analytics"}
      </p>
      <p className="text-xs text-[color:var(--muted)] mt-1.5">
        {language === "ms" ? "Pantau kemajuan & kenal pasti kelemahan" : "Weakness map & progress"}
      </p>
    </Link>
  );
}

function WeakReviewCard({ count, t }: { count: number; t: typeof UI_STRINGS["en"] }) {
  return (
    <Link
      href="/learn/session?mode=weak"
      className="group relative overflow-hidden rounded-[var(--radius-lg)] border-2 border-[color:var(--gold)]/40 bg-[color:var(--gold-soft)]/30 p-5 flex items-center gap-4 hover:border-[color:var(--gold)] hover:-translate-y-0.5 hover:shadow-[var(--shadow)] transition-all duration-200"
    >
      <span className="h-10 w-10 shrink-0 rounded-xl bg-[color:var(--gold-soft)] border border-[color:var(--gold)]/30 grid place-items-center text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]">
        <IconRefresh />
      </span>
      <div className="flex-1 min-w-0">
        <p className="display text-[length:var(--text-lg)] text-[color:var(--foreground)] leading-tight" style={{ fontWeight: 600 }}>
          {t.dash_review_mistakes}
        </p>
        <p className="text-xs text-[color:var(--muted)] mt-0.5">
          {t.dash_drill_weak.replace("{count}", count.toString())}
        </p>
      </div>
      <span aria-hidden className="text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] transition-transform duration-200 group-hover:translate-x-1">→</span>
    </Link>
  );
}

/* ── Daily Ayah Challenge ────────────────────────────────────────────────── */

// Curated surahs with good tajweed density for the daily pick
const DAILY_SURAH_POOL = [2, 3, 18, 19, 36, 55, 67, 78, 79, 87, 89, 112, 113, 114];

const DAILY_INSIGHTS: Record<number, { en: string; ms: string }> = {
  2: { en: "Al-Baqarah has the highest density of Madd Muttasil in the Quran.", ms: "Al-Baqarah mempunyai ketumpatan Madd Muttasil tertinggi dalam Al-Quran." },
  18: { en: "Al-Kahf opens with three consecutive Madd Lazim letters — rare in the Quran.", ms: "Al-Kahf dibuka dengan tiga huruf Madd Lazim berturut-turut — jarang dalam Al-Quran." },
  36: { en: "Ya-Sin contains one of the most studied Ghunna sequences in tajweed education.", ms: "Ya-Sin mengandungi salah satu urutan Ghunnah yang paling banyak dikaji dalam pendidikan tajwid." },
  55: { en: "Ar-Rahman's repeated refrain is a masterclass in Madd 'Aridh timing.", ms: "Refrain berulang dalam Ar-Rahman adalah contoh terbaik untuk masa Mad Aridh." },
  67: { en: "Al-Mulk begins with back-to-back Qalqalah letters — ق and ب together.", ms: "Al-Mulk bermula dengan huruf Qalqalah berturut-turut — ق dan ب bersama-sama." },
  112: { en: "Al-Ikhlas packs every category of noon-saakin rule into four verses.", ms: "Al-Ikhlas memuatkan setiap kategori hukum nun sakin dalam empat ayat." },
  114: { en: "An-Nas contains Idgham, Ikhfa, and Lam Shamsiyya within its six verses.", ms: "An-Nas mengandungi Idgham, Ikhfa, dan Lam Syamsiyyah dalam enam ayatnya." },
};

function DailyAyahCard({ language }: { language: "en" | "ms" }) {
  const dailyAyahDone = useLearning((s) => s.dailyAyahDone ?? {});
  const markDailyAyahDone = useLearning((s) => s.markDailyAyahDone);
  const today = localDateKey();
  const done = !!dailyAyahDone[today];

  // Seeded daily pick: same for all users on the same calendar day
  const rng = seededRng(today);
  const surahNumber = DAILY_SURAH_POOL[Math.floor(rng() * DAILY_SURAH_POOL.length)];
  const surahName = SURAHS.find(s => s.number === surahNumber)?.englishName ?? `Surah ${surahNumber}`;
  const insight = DAILY_INSIGHTS[surahNumber];

  const handleComplete = () => markDailyAyahDone(today);

  return (
    <div
      className={`relative overflow-hidden rounded-[var(--radius-lg)] border p-5 sm:p-6 flex flex-col gap-3 ${
        done
          ? "border-[color:var(--gold)]/40 bg-gradient-to-br from-[color:var(--gold-soft)] to-[color:var(--surface)]"
          : "border-[color:var(--border-strong)] bg-[color:var(--surface-raised)]"
      }`}
    >
      <div aria-hidden className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-[color:var(--gold)]/10 blur-2xl pointer-events-none" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] mb-1">
            {language === "ms" ? "Cabaran Ayat Harian" : "Daily Ayah Challenge"}
          </p>
          <p className="display text-[length:var(--text-lg)] text-[color:var(--foreground)]" style={{ fontWeight: 600 }}>
            {done
              ? language === "ms" ? "Selesai untuk hari ini ✓" : "Done for today ✓"
              : language === "ms" ? `${surahName} — capai 3 bintang` : `${surahName} — earn 3 stars`}
          </p>
        </div>
        <span className={`shrink-0 h-10 w-10 rounded-xl grid place-items-center text-lg ${done ? "bg-[color:var(--gold)]/20" : "bg-[color:var(--border)]/60"}`}>
          {done ? "✦" : "🌙"}
        </span>
      </div>

      {done && insight ? (
        <p className="text-xs text-[color:var(--muted-strong)] leading-relaxed italic">
          ✦ {insight[language]}
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <Link
            href={`/learn/tajweed-quest/${surahNumber}?d=3`}
            onClick={handleComplete}
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--gold)] text-black px-5 py-2 text-sm font-semibold hover:bg-[color:var(--gold-strong)] transition-colors"
          >
            {language === "ms" ? "Mula cabaran" : "Start challenge"} →
          </Link>
          <p className="text-xs text-[color:var(--muted)]">
            {language === "ms" ? "Tiada tekanan — tiada streak" : "No pressure — no streak"}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Game mode cards ─────────────────────────────────────────────────────── */

function BlitzCard({ language }: { language: "en" | "ms" }) {
  const blitzBests = useLearning((s) => s.blitzBests ?? {});
  const best = Math.max(0, ...Object.values(blitzBests));
  return (
    <Link
      href="/learn/blitz"
      className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--gold)]/30 bg-gradient-to-b from-[color:var(--gold-soft)]/40 to-[color:var(--surface)] p-5 flex flex-col hover:border-[color:var(--gold)] hover:-translate-y-0.5 hover:shadow-[var(--shadow)] transition-all duration-200"
    >
      <span className="text-2xl mb-3">⚡</span>
      <p className="display text-[length:var(--text-lg)] text-[color:var(--foreground)] leading-tight" style={{ fontWeight: 600 }}>
        {language === "ms" ? "Cabaran 60 Saat" : "60-Second Blitz"}
      </p>
      <p className="text-xs text-[color:var(--muted)] mt-1.5 leading-relaxed">
        {language === "ms" ? "Jawab sebanyak mungkin dalam 60 saat" : "Answer as many rules as you can in 60 seconds"}
      </p>
      {best > 0 && (
        <p className="text-xs font-semibold text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] mt-2">
          {language === "ms" ? `Rekod: ${best}` : `Best: ${best}`}
        </p>
      )}
      <span aria-hidden className="mt-auto pt-3 text-xs font-semibold text-[color:var(--muted)] group-hover:text-[color:var(--gold-strong)] dark:group-hover:text-[color:var(--gold)] transition-colors flex items-center gap-1">
        {language === "ms" ? "Main sekarang" : "Play now"} →
      </span>
    </Link>
  );
}

function StreakCard({ language }: { language: "en" | "ms" }) {
  const streakBest = useLearning((s) => s.streakBest ?? 0);
  return (
    <Link
      href="/learn/streak"
      className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--accent)]/25 bg-[color:var(--accent-soft)]/15 p-5 flex flex-col hover:border-[color:var(--accent)]/50 hover:-translate-y-0.5 hover:shadow-[var(--shadow)] transition-all duration-200"
    >
      <span className="text-2xl mb-3">🔗</span>
      <p className="display text-[length:var(--text-lg)] text-[color:var(--foreground)] leading-tight" style={{ fontWeight: 600 }}>
        {language === "ms" ? "Streak Hukum" : "Rule Streak"}
      </p>
      <p className="text-xs text-[color:var(--muted)] mt-1.5 leading-relaxed">
        {language === "ms" ? "Kekalkan streak anda — merentas ke semua surah" : "Don't break the chain — across all surahs"}
      </p>
      {streakBest > 0 && (
        <p className="text-xs font-semibold text-[color:var(--accent-strong)] mt-2">
          {language === "ms" ? `Rekod: ${streakBest}` : `Best: ${streakBest}`}
        </p>
      )}
      <span aria-hidden className="mt-auto pt-3 text-xs font-semibold text-[color:var(--muted)] group-hover:text-[color:var(--accent-strong)] transition-colors flex items-center gap-1">
        {language === "ms" ? "Mulakan" : "Start"} →
      </span>
    </Link>
  );
}

function QariCard({ language }: { language: "en" | "ms" }) {
  return (
    <Link
      href="/learn/qari-compare"
      className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] p-5 flex flex-col hover:border-[color:var(--accent)] hover:-translate-y-0.5 hover:shadow-[var(--shadow)] transition-all duration-200"
    >
      <span className="text-2xl mb-3">🎙</span>
      <p className="display text-[length:var(--text-lg)] text-[color:var(--foreground)] leading-tight" style={{ fontWeight: 600 }}>
        {language === "ms" ? "Perbandingan Qari" : "Qari Comparison"}
      </p>
      <p className="text-xs text-[color:var(--muted)] mt-1.5 leading-relaxed">
        {language === "ms" ? "Bandingkan bacaan Abdul Baset & Alafasy" : "Compare Abdul Baset & Alafasy"}
      </p>
      <span aria-hidden className="mt-auto pt-3 text-xs font-semibold text-[color:var(--muted)] group-hover:text-[color:var(--accent-strong)] transition-colors flex items-center gap-1">
        {language === "ms" ? "Latih pendengaran" : "Train ear"} →
      </span>
    </Link>
  );
}

function IconCheck() { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12 5 5L20 7" /></svg>; }
function IconZap() { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>; }
function IconRefresh() { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></svg>; }
function IconFlame() { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 2c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4-1 3 2 4 2 1 0-2-2-3 0-6Z" /><path d="M12 22a6 6 0 0 0 6-6c0-3-2-5-4-7 1 4-2 5-2 2 0-2-2-3-2-5-3 3-4 6-4 10a6 6 0 0 0 6 6Z" /></svg>; }
function IconPlay() { return <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden><path d="M5 3l14 9-14 9V3z" /></svg>; }
function IconBook() { return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>; }
function IconWaveform() { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 12h2" /><path d="M6 8v8" /><path d="M10 5v14" /><path d="M14 9v6" /><path d="M18 7v10" /><path d="M22 12h-2" /></svg>; }
function IconBarChart() { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 3v18h18" /><path d="M7 16V10" /><path d="M11 16V6" /><path d="M15 16v-4" /><path d="M19 16V8" /></svg>; }
