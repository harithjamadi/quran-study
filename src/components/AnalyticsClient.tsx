"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLearning } from "@/store/learning";
import { statusOf, isDue, type LemmaMeta, type WordStatus } from "@/lib/learning";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  freq: LemmaMeta[];
}

const STATUS_COLORS: Record<WordStatus, string> = {
  new: "#94a3b8",
  weak: "#f97316",
  good: "#3b82f6",
  strong: "#22c55e",
};

export function AnalyticsClient({ freq }: Props) {
  const lemmasState = useLearning((s) => s.lemmas);
  const language = useLearning((s) => s.language);
  const xp = useLearning((s) => s.xp);
  const dayStreak = useLearning((s) => s.dayStreak);

  const stats = useMemo(() => {
    const counts: Record<WordStatus, number> = { new: 0, weak: 0, good: 0, strong: 0 };
    let dueNow = 0;
    const weakWords: { lemma: LemmaMeta; lapses: number; reps: number }[] = [];

    for (const item of freq) {
      const s = lemmasState[item.lemma];
      const status = statusOf(s);
      counts[status]++;
      if (s && isDue(s)) dueNow++;
      if (s && s.lapses > 0 && s.reps > 0) {
        weakWords.push({ lemma: item, lapses: s.lapses, reps: s.reps });
      }
    }

    weakWords.sort((a, b) => (b.lapses / b.reps) - (a.lapses / a.reps));

    const introduced = counts.weak + counts.good + counts.strong;
    const totalTokens = freq.reduce((s, l) => s + l.count, 0);
    let covered = 0;
    for (const item of freq) {
      const st = statusOf(lemmasState[item.lemma]);
      if (st === "good" || st === "strong") covered += item.count;
    }
    const comprehension = totalTokens > 0 ? (covered / totalTokens) * 100 : 0;

    // Learning velocity: words that reached Review state
    const reviewWords = Object.values(lemmasState).filter(s => s.state === 2).length;

    return { counts, dueNow, introduced, comprehension, weakWords: weakWords.slice(0, 10), reviewWords };
  }, [lemmasState, freq]);

  const pieData = (["strong", "good", "weak", "new"] as WordStatus[])
    .map(s => ({ name: s, value: stats.counts[s] }))
    .filter(d => d.value > 0);

  const barData = [
    { name: language === "ms" ? "Baru" : "New", value: stats.counts.new, fill: STATUS_COLORS.new },
    { name: language === "ms" ? "Lemah" : "Weak", value: stats.counts.weak, fill: STATUS_COLORS.weak },
    { name: language === "ms" ? "Bagus" : "Good", value: stats.counts.good, fill: STATUS_COLORS.good },
    { name: language === "ms" ? "Kukuh" : "Strong", value: stats.counts.strong, fill: STATUS_COLORS.strong },
  ];

  const ms = language === "ms";

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {ms ? "Analitik Pembelajaran" : "Learning Analytics"}
          </h1>
          <p className="text-sm text-[color:var(--muted)] mt-1">
            {ms ? "Gambaran keseluruhan kemajuan anda" : "Overview of your learning progress"}
          </p>
        </div>
        <Link
          href="/learn"
          className="text-sm font-medium text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-colors"
        >
          ← {ms ? "Kembali" : "Back"}
        </Link>
      </header>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: ms ? "Diperkenalkan" : "Introduced", value: stats.introduced, sub: `/ ${freq.length}` },
          { label: ms ? "Kefahaman" : "Comprehension", value: `${stats.comprehension.toFixed(1)}%`, sub: ms ? "kosa kata Al-Quran" : "Quran vocab" },
          { label: ms ? "Perlu Ulang" : "Due Now", value: stats.dueNow, sub: ms ? "kad" : "cards" },
          { label: ms ? "Streak" : "Streak", value: dayStreak, sub: ms ? "hari" : "days" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="card p-4 text-center space-y-1">
            <p className="text-2xl font-black text-[color:var(--accent-strong)]">{value}</p>
            <p className="text-xs font-bold text-[color:var(--foreground)]">{label}</p>
            <p className="text-[10px] text-[color:var(--muted)]">{sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Donut — word status distribution */}
        <div className="card p-5 space-y-3">
          <p className="text-sm font-bold">{ms ? "Taburan Status Kata" : "Word Status Distribution"}</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name as WordStatus]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center text-xs">
            {(["strong", "good", "weak", "new"] as WordStatus[]).map(s => (
              <span key={s} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[s] }} />
                <span className="capitalize">{s} ({stats.counts[s]})</span>
              </span>
            ))}
          </div>
        </div>

        {/* Bar — absolute counts */}
        <div className="card p-5 space-y-3">
          <p className="text-sm font-bold">{ms ? "Bilangan Kata Setiap Status" : "Words by Status"}</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} barSize={32}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weakest words */}
      {stats.weakWords.length > 0 && (
        <div className="card p-5 space-y-4">
          <p className="text-sm font-bold">
            {ms ? "Kata Paling Lemah (Perlu Perhatian)" : "Weakest Words (Need Attention)"}
          </p>
          <div className="space-y-2">
            {stats.weakWords.map(({ lemma, lapses, reps }) => {
              const errorRate = Math.round((lapses / reps) * 100);
              return (
                <div key={lemma.lemma} className="flex items-center gap-3">
                  <span
                    className="arabic text-lg text-[color:var(--accent-strong)] w-20 shrink-0 text-right"
                    lang="ar" dir="rtl"
                  >
                    {lemma.sampleText}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[color:var(--foreground)] font-medium truncate">
                        {lemma.en ?? lemma.ms ?? "—"}
                      </span>
                      <span className="text-[color:var(--danger)] font-bold shrink-0 ml-2">
                        {errorRate}% {ms ? "silap" : "errors"}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[color:var(--border)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[color:var(--danger)]"
                        style={{ width: `${Math.min(100, errorRate)}%` }}
                      />
                    </div>
                  </div>
                  <Link
                    href="/learn/session?mode=weak"
                    className="text-xs text-[color:var(--accent)] font-bold shrink-0 hover:underline"
                  >
                    {ms ? "Latih" : "Drill"}
                  </Link>
                </div>
              );
            })}
          </div>
          <Link
            href="/learn/session?mode=weak"
            className="inline-flex items-center gap-2 mt-2 rounded-full bg-[color:var(--accent)] text-white px-4 py-2 text-sm font-bold hover:bg-[color:var(--accent-strong)] transition-all"
          >
            {ms ? "Mulakan Sesi Pemulihan" : "Start Remediation Session"} →
          </Link>
        </div>
      )}

      {/* XP */}
      <div className="card p-5 text-center">
        <p className="text-3xl font-black text-[color:var(--gold)]">{xp.toLocaleString()} XP</p>
        <p className="text-xs text-[color:var(--muted)] mt-1">{ms ? "jumlah XP dikumpul" : "total XP earned"}</p>
      </div>
    </div>
  );
}
