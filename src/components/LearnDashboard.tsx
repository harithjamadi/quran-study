"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLearning } from "@/store/learning";
import { UI_STRINGS } from "@/lib/i18n";
import {
  comprehensionPct,
  effectiveGloss,
  isDue,
  statusOf,
  type CoverageData,
  type LemmaMeta,
  type WordStatus,
} from "@/lib/learning";
import { QuestMap } from "@/components/QuestMap";

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

      {/* ── Primary actions ── */}
      <section className="grid sm:grid-cols-2 gap-3 sm:gap-4">
        <ActionCard
          title={dueCount > 0 ? t.dash_continue_quest : t.dash_start_quest}
          subtitle={dueCount > 0 ? t.dash_quest_card_desc.replace("{due}", dueCount.toString()).replace("{new}", NEW_PER_SESSION.toString()) : t.dash_quest_session_desc}
          href="/learn/session"
          primary
        />
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {counts.weak > 0 && (
            <ActionCard
              title={t.dash_review_mistakes}
              subtitle={t.dash_drill_weak.replace("{count}", counts.weak.toString())}
              href="/learn/session?mode=weak"
              tone="gold"
            />
          )}
          <ActionCard
            title={t.dash_my_vocab}
            subtitle={`${introduced.toLocaleString()} ${t.vocab_tracked.split(" ").slice(1).join(" ")}`}
            href="/learn/vocabulary"
            badge={introduced}
          />
          <ActionCard
            title={language === "ms" ? "Analitik" : "Analytics"}
            subtitle={language === "ms" ? "Peta kelemahan & kemajuan" : "Weakness map & progress"}
            href="/analytics"
          />
        </div>
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

function ActionCard({ title, subtitle, href, primary = false, badge, tone = "neutral" }: { title: string; subtitle: string; href: string; primary?: boolean; badge?: number; tone?: "neutral" | "gold" }) {
  const bgColor = primary ? "bg-[color:var(--accent)]" : tone === "gold" ? "bg-[color:var(--gold-soft)]/20" : "bg-[color:var(--surface)]";
  const borderColor = primary ? "border-[color:var(--accent)]" : tone === "gold" ? "border-[color:var(--gold)]/30" : "border-[color:var(--border-strong)]";
  return (
    <Link href={href} className={`group relative overflow-hidden rounded-[var(--radius-lg)] p-5 sm:p-6 border-2 transition-all duration-300 ${primary ? "text-white shadow-[var(--shadow-glow)] hover:shadow-[0_12px_36px_-8px_var(--accent-glow)] hover:-translate-y-0.5" : "text-[color:var(--foreground)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]/30"} ${bgColor} ${borderColor}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="display text-[length:var(--text-lg)]" style={{ fontWeight: 600 }}>{title}</p>
            {badge !== undefined && <span className={`inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full text-[11px] font-semibold tabular-nums ${primary ? "bg-white/20 text-white" : "bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)] border border-[color:var(--accent)]/30"}`}>{badge}</span>}
          </div>
          <p className={`text-xs mt-1.5 ${primary ? "text-white/80" : "text-[color:var(--muted)]"}`}>{subtitle}</p>
        </div>
        <span aria-hidden className={`text-xl transition-transform duration-300 group-hover:translate-x-1 ${primary ? "text-white" : "text-[color:var(--muted)] group-hover:text-[color:var(--accent-strong)]"}`}>→</span>
      </div>
    </Link>
  );
}

function IconCheck() { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12 5 5L20 7" /></svg>; }
function IconZap() { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>; }
function IconRefresh() { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></svg>; }
function IconFlame() { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 2c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4-1 3 2 4 2 1 0-2-2-3 0-6Z" /><path d="M12 22a6 6 0 0 0 6-6c0-3-2-5-4-7 1 4-2 5-2 2 0-2-2-3-2-5-3 3-4 6-4 10a6 6 0 0 0 6 6Z" /></svg>; }
