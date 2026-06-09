"use client";

import { useMemo } from "react";
import { useLearning, BADGES, type BadgeInfo } from "@/store/learning";

function badgeDate(ts: number, language: "en" | "ms"): string {
  try {
    return new Date(ts).toLocaleDateString(language === "ms" ? "ms-MY" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function BadgeCard({ badge, earnedAt, language }: {
  badge: BadgeInfo;
  earnedAt: number | undefined;
  language: "en" | "ms";
}) {
  const earned = !!earnedAt;

  return (
    <div
      className={[
        "relative rounded-2xl border p-4 text-center transition-all duration-200",
        earned
          ? "border-[color:var(--gold)]/40 bg-gradient-to-b from-[color:var(--gold-soft)]/30 to-[color:var(--surface)]"
          : "border-[color:var(--border)] bg-[color:var(--surface)] opacity-60",
      ].join(" ")}
    >
      {/* Icon */}
      <div
        className={[
          "mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl",
          earned
            ? "bg-gradient-to-br from-[color:var(--gold)] to-[color:var(--accent)] shadow-[var(--shadow-glow)]"
            : "bg-[color:var(--border)]/60",
        ].join(" ")}
      >
        {earned ? badge.icon : "🔒"}
      </div>

      {/* Name */}
      <p className={`text-sm font-black leading-tight ${earned ? "text-[color:var(--foreground)]" : "text-[color:var(--muted)]"}`}>
        {badge.name[language]}
      </p>

      {/* Description / hint */}
      <p className="text-[11px] text-[color:var(--muted)] mt-1 leading-snug">
        {earned ? badge.description[language] : badge.hint[language]}
      </p>

      {/* Earned date */}
      {earned && earnedAt && (
        <p className="text-[10px] font-semibold text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] mt-2 uppercase tracking-wide">
          {badgeDate(earnedAt, language)}
        </p>
      )}

      {/* New badge indicator */}
      {earned && Date.now() - (earnedAt ?? 0) < 48 * 60 * 60 * 1000 && (
        <span className="absolute -top-1.5 -right-1.5 rounded-full bg-[color:var(--accent)] text-white text-[9px] font-black px-1.5 py-0.5 uppercase tracking-wide shadow">
          New
        </span>
      )}
    </div>
  );
}

export function TrophyRoom() {
  const badges = useLearning((s) => s.badges ?? {});
  const language = useLearning((s) => s.language);

  const { earned, locked } = useMemo(() => {
    const e: BadgeInfo[] = [];
    const l: BadgeInfo[] = [];
    for (const b of BADGES) {
      if (badges[b.id]) e.push(b);
      else l.push(b);
    }
    // Sort earned: newest first
    e.sort((a, b) => (badges[b.id] ?? 0) - (badges[a.id] ?? 0));
    return { earned: e, locked: l };
  }, [badges]);

  const earnedCount = earned.length;
  const totalCount = BADGES.length;

  return (
    <div className="space-y-5">
      {/* Header strip */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-lg">
            {language === "ms" ? "Pencapaian" : "Achievements"}
          </h2>
          <p className="text-xs text-[color:var(--muted)] mt-0.5">
            {earnedCount === 0
              ? language === "ms"
                ? "Tiada lencana lagi — mulakan cabaran Tajweed!"
                : "No badges yet — start a Tajweed quest!"
              : language === "ms"
                ? `${earnedCount} daripada ${totalCount} lencana diperoleh`
                : `${earnedCount} of ${totalCount} badges earned`}
          </p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-black text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] tabular-nums">
            {earnedCount}
          </span>
          <span className="text-sm text-[color:var(--muted)]">/{totalCount}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 rounded-full bg-[color:var(--border)] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
          style={{
            width: `${(earnedCount / totalCount) * 100}%`,
            background: "linear-gradient(90deg, var(--gold), var(--accent))",
          }}
        />
      </div>

      {/* Earned badges */}
      {earned.length > 0 && (
        <div>
          <p className="eyebrow mb-3 text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]">
            {language === "ms" ? "Diperoleh" : "Earned"}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {earned.map((b) => (
              <BadgeCard
                key={b.id}
                badge={b}
                earnedAt={badges[b.id]}
                language={language}
              />
            ))}
          </div>
        </div>
      )}

      {/* Locked badges */}
      {locked.length > 0 && (
        <div>
          <p className="eyebrow mb-3">{language === "ms" ? "Belum Dikunci" : "Locked"}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {locked.map((b) => (
              <BadgeCard
                key={b.id}
                badge={b}
                earnedAt={undefined}
                language={language}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
