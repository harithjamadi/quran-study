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

  // The preview-list-only comprehension calculation: matches the user's
  // mastered lemmas against the top N. This is an UNDERESTIMATE if they've
  // mastered something beyond the top N, but the dashboard is meant to nudge
  // toward the highest-impact words first, so this framing is intentional.
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

  return (
    <div className="space-y-6">
      <section className="card p-6 sm:p-8 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--accent-soft)_0%,transparent_60%)] pointer-events-none"
        />
        <div className="relative">
          <p className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
            {t.dash_comprehension}
          </p>
          <div className="flex items-baseline gap-3 mt-1">
            <p className="text-5xl font-semibold text-[color:var(--accent-strong)]">
              {pct.toFixed(1)}%
            </p>
            <p className="text-sm text-[color:var(--muted)]">
              {t.dash_of_quran.replace("{total}", coverage.totalTokens.toLocaleString())}
            </p>
          </div>
          <ProgressBar pct={pct} />
          {nextMilestone && (
            <p className="text-xs text-[color:var(--muted)] mt-2">
              {t.dash_milestone}: top {nextMilestone.topN} lemmas →{" "}
              <span className="text-[color:var(--accent-strong)]">
                {nextMilestone.pct}% {t.dash_comprehension.toLowerCase()}
              </span>
            </p>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label={t.dash_mastered} value={counts.good + counts.strong} tone="accent" />
        <Stat label={t.dash_learning} value={counts.weak + counts.new} />
        <Stat label={t.dash_due} value={dueCount} tone={dueCount > 0 ? "accent" : "muted"} />
        <Stat label={t.dash_streak} value={dayStreak} hint={`${reviewedToday} ${t.dash_reviewed_today}`} />
      </section>

      <section className="grid sm:grid-cols-2 gap-3">
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

      {nextNewSlice.length > 0 && (
        <section>
          <header className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold">{t.dash_next_words}</h2>
            <p className="text-xs text-[color:var(--muted)]">
              {t.dash_picked_by}
            </p>
          </header>
          <ul className="card divide-y divide-[color:var(--border)]">
            {nextNewSlice.map((l, idx) => (
              <li key={l.lemma} className="p-4 flex items-center gap-4">
                <span className="w-8 text-xs text-[color:var(--muted)] tabular-nums">
                  #{introducedRank + idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="arabic text-2xl text-[color:var(--accent-strong)]"
                    lang="ar"
                    dir="rtl"
                  >
                    {l.lemma}
                  </p>
                  {l.translit && (
                    <p className="text-xs text-[color:var(--muted)] italic">{l.translit}</p>
                  )}
                </div>
                <div className="text-right min-w-0">
                  <p className="text-sm flex items-baseline justify-end gap-1.5">
                    {(() => {
                      const g = effectiveGloss(l, language);
                      if (!g) return <span>—</span>;
                      return (
                        <>
                          <span>{g.text}</span>
                          {g.isFallback && (
                            <span className="text-[9px] font-semibold uppercase tracking-widest opacity-60">
                              {language === "ms" ? "EN" : "MS"}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </p>
                  <p className="text-xs text-[color:var(--muted)]">
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

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="mt-3 relative h-2 bg-[color:var(--border)] rounded-full overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 bg-[color:var(--accent)] transition-all duration-500"
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "muted",
  hint,
}: {
  label: string;
  value: number;
  tone?: "accent" | "muted";
  hint?: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs text-[color:var(--muted)] uppercase tracking-wider">{label}</p>
      <p
        className={`text-2xl font-semibold mt-1 ${
          tone === "accent" ? "text-[color:var(--accent-strong)]" : ""
        }`}
      >
        {value}
      </p>
      {hint && <p className="text-[10px] text-[color:var(--muted)] mt-1">{hint}</p>}
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
      className={`card p-5 transition-colors ${
        primary
          ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/30 hover:bg-[color:var(--accent-soft)]/50"
          : "hover:bg-[color:var(--border)]/30"
      }`}
    >
      <p
        className={`text-base font-semibold ${
          primary ? "text-[color:var(--accent-strong)]" : ""
        }`}
      >
        {title}
      </p>
      <p className="text-xs text-[color:var(--muted)] mt-1">{subtitle}</p>
    </Link>
  );
}
