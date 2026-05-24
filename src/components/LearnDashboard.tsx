"use client";

import Link from "next/link";
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

const NEW_PER_SESSION = 5;

interface Props {
  /** Top N lemmas by frequency, used for the "next words" preview. */
  previewLemmas: LemmaMeta[];
  /** Coverage milestones + totals from the static dataset. */
  coverage: CoverageData;
}

export function LearnDashboard({ previewLemmas, coverage }: Props) {
  const lemmasState = useLearning((s) => s.lemmas);
  const introducedRank = useLearning((s) => s.introducedThroughRank);
  const dayStreak = useLearning((s) => s.dayStreak);
  const reviewedToday = useLearning((s) => s.reviewedToday);
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];

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
  const learning = counts.weak + counts.new;

  return (
    <div className="space-y-8 sm:space-y-10 stagger-children">
      {/* ── HERO: comprehension as the headline number ──
          A single editorial display number. The progress bar is a hairline
          gold rule under it. Milestone callout sits as a marginal note. */}
      <section className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-gradient-to-br from-[color:var(--surface)] via-[color:var(--accent-soft)]/30 to-[color:var(--surface)] p-7 sm:p-10">
        <div
          aria-hidden
          className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[color:var(--accent)]/8 blur-3xl"
        />
        <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-end">
          <div>
            <p className="eyebrow text-[color:var(--accent-strong)] mb-4">
              {t.dash_comprehension}
            </p>
            <div className="flex items-baseline gap-3">
              <span
                className="stat-display text-[clamp(4rem,3rem+5vw,7rem)] text-[color:var(--accent-strong)]"
              >
                {pct.toFixed(1)}
                <span className="text-[0.45em] align-baseline ml-1 text-[color:var(--accent)]">%</span>
              </span>
            </div>
            <div className="mt-4 max-w-md">
              <div className="relative h-[3px] bg-[color:var(--border)] rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-[color:var(--gold)] to-[color:var(--accent)] rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${Math.min(100, Math.max(1, pct))}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-[color:var(--muted-strong)] leading-relaxed">
                {t.dash_of_quran.replace("{total}", coverage.totalTokens.toLocaleString())}
              </p>
            </div>
          </div>

          {nextMilestone && (
            <div className="md:text-right md:max-w-[16rem]">
              <p className="eyebrow mb-2">{t.dash_milestone}</p>
              <p className="display text-[length:var(--text-2xl)] text-[color:var(--foreground)]" style={{ fontWeight: 600 }}>
                {nextMilestone.pct}%
              </p>
              <p className="text-xs text-[color:var(--muted)] mt-1">
                top {nextMilestone.topN.toLocaleString()} lemmas
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Stat strip ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Stat label={t.dash_mastered} value={mastered} tone="accent" />
        <Stat label={t.dash_learning} value={learning} />
        <Stat label={t.dash_due} value={dueCount} tone={dueCount > 0 ? "gold" : "muted"} pulse={dueCount > 0} />
        <Stat label={t.dash_streak} value={dayStreak} hint={`${reviewedToday} ${t.dash_reviewed_today}`} />
      </section>

      {/* ── Primary actions ── */}
      <section className="grid sm:grid-cols-2 gap-3 sm:gap-4">
        <ActionCard
          title={dueCount > 0 ? t.dash_continue_quest : t.dash_start_quest}
          subtitle={
            dueCount > 0
              ? t.dash_quest_card_desc
                  .replace("{due}", dueCount.toString())
                  .replace("{new}", NEW_PER_SESSION.toString())
              : t.dash_quest_session_desc
          }
          href="/learn/session"
          primary
        />
        <ActionCard
          title={t.dash_my_vocab}
          subtitle={`${introduced.toLocaleString()} ${t.vocab_tracked.split(" ").slice(1).join(" ")}`}
          href="/learn/vocabulary"
        />
      </section>

      {/* ── Next words preview ── */}
      {nextNewSlice.length > 0 && (
        <section>
          <header className="flex items-end justify-between mb-5 sm:mb-6">
            <div>
              <p className="eyebrow mb-1">القادم</p>
              <h2 className="display text-[length:var(--text-xl)]" style={{ fontWeight: 600 }}>
                {t.dash_next_words}
              </h2>
            </div>
            <p className="text-xs text-[color:var(--muted)] hidden sm:block">
              {t.dash_picked_by}
            </p>
          </header>
          <ul className="card divide-y divide-[color:var(--border)] overflow-hidden">
            {nextNewSlice.map((l, idx) => (
              <li
                key={l.lemma}
                className="group p-4 sm:p-5 flex items-center gap-4 transition-colors hover:bg-[color:var(--accent-soft)]/30"
              >
                <span className="w-10 shrink-0 stat-display text-base text-[color:var(--muted)] tabular-nums">
                  {String(introducedRank + idx + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="arabic text-[length:var(--arabic-sm)] text-[color:var(--accent-strong)] leading-none"
                    lang="ar"
                    dir="rtl"
                  >
                    {l.lemma}
                  </p>
                  {l.translit && (
                    <p className="text-xs text-[color:var(--muted)] italic mt-1.5">{l.translit}</p>
                  )}
                </div>
                <div className="text-right min-w-0 shrink-0">
                  <p className="text-sm flex items-baseline justify-end gap-1.5">
                    {(() => {
                      const g = effectiveGloss(l, language);
                      if (!g) return <span>—</span>;
                      return (
                        <>
                          <span className="font-medium">{g.text}</span>
                          {g.isFallback && (
                            <span className="text-[9px] font-semibold uppercase tracking-widest opacity-50">
                              {language === "ms" ? "EN" : "MS"}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </p>
                  <p className="text-[11px] text-[color:var(--muted)] tabular-nums mt-0.5">
                    {l.count.toLocaleString()}× {t.dash_in_quran_short}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "muted",
  hint,
  pulse = false,
}: {
  label: string;
  value: number;
  tone?: "accent" | "muted" | "gold";
  hint?: string;
  pulse?: boolean;
}) {
  const color =
    tone === "accent"
      ? "text-[color:var(--accent-strong)]"
      : tone === "gold"
      ? "text-[color:var(--gold-strong)]"
      : "text-[color:var(--foreground)]";
  return (
    <div className="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--surface)] p-4 sm:p-5">
      <p className="eyebrow text-[10px]">{label}</p>
      <p
        className={`stat-display text-[length:var(--text-3xl)] mt-2 ${color} ${pulse ? "animate-pulse-soft" : ""}`}
      >
        {value.toLocaleString()}
      </p>
      {hint && (
        <p className="text-[11px] text-[color:var(--muted)] mt-1 leading-tight">{hint}</p>
      )}
    </div>
  );
}

function ActionCard({
  title,
  subtitle,
  href,
  primary = false,
}: {
  title: string;
  subtitle: string;
  href: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-[var(--radius-lg)] p-5 sm:p-6 transition-all duration-300 ${
        primary
          ? "border-2 border-[color:var(--accent)] bg-[color:var(--accent)] text-white shadow-[var(--shadow-glow)] hover:shadow-[0_12px_36px_-8px_var(--accent-glow)] hover:-translate-y-0.5"
          : "border border-[color:var(--border-strong)] bg-[color:var(--surface)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={`display text-[length:var(--text-lg)] ${primary ? "text-white" : "text-[color:var(--foreground)]"}`}
            style={{ fontWeight: 600 }}
          >
            {title}
          </p>
          <p className={`text-xs mt-1.5 ${primary ? "text-white/80" : "text-[color:var(--muted)]"}`}>
            {subtitle}
          </p>
        </div>
        <span
          aria-hidden
          className={`text-xl transition-transform duration-300 group-hover:translate-x-1 ${primary ? "text-white" : "text-[color:var(--muted)] group-hover:text-[color:var(--accent-strong)]"}`}
        >
          →
        </span>
      </div>
    </Link>
  );
}
