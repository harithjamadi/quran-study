"use client";

import { useEffect } from "react";
import { RELEASES, APP_VERSION, type ChangeType } from "@/lib/changelog";
import { UI_STRINGS } from "@/lib/i18n";
import { useLearning } from "@/store/learning";
import { useVersion } from "@/store/version";
import { useHydrated } from "@/lib/use-hydrated";

// Theme-robust via the app's CSS variables (which flip under `.dark`) rather
// than Tailwind `dark:` utilities, which this app does not wire to its toggle.
const TYPE_STYLES: Record<ChangeType, string> = {
  added: "bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]",
  improved: "bg-[color:var(--gold-soft)] text-[color:var(--gold-strong)]",
  fixed: "bg-[color:var(--border)] text-[color:var(--muted-strong)]",
};

function formatDate(iso: string, lang: "en" | "ms"): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(lang === "ms" ? "ms-MY" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return iso;
  }
}

export default function ChangelogPage() {
  const language = useLearning((s) => s.language);
  const markSeen = useVersion((s) => s.markSeen);
  const hydrated = useHydrated();
  const t = UI_STRINGS[language];

  // Viewing the changelog clears the "What's New" dot.
  useEffect(() => {
    markSeen();
  }, [markSeen]);

  if (!hydrated) return null;

  const typeLabel: Record<ChangeType, string> = {
    added: t.cl_type_added,
    improved: t.cl_type_improved,
    fixed: t.cl_type_fixed,
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t.cl_title}</h1>
        <p className="text-sm text-[color:var(--muted)] mt-1">{t.cl_desc}</p>
      </header>

      <ol className="relative space-y-8 border-l border-[color:var(--border)] pl-6 ml-1">
        {RELEASES.map((release) => {
          const isCurrent = release.version === APP_VERSION;
          return (
            <li key={release.version} className="relative">
              {/* Timeline node */}
              <span
                aria-hidden
                className={[
                  "absolute -left-[1.65rem] top-1.5 grid h-3.5 w-3.5 place-items-center rounded-full ring-4 ring-[color:var(--background)]",
                  isCurrent ? "bg-[color:var(--accent)]" : "bg-[color:var(--border-strong)]",
                ].join(" ")}
              />

              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="font-mono text-sm font-semibold tabular-nums">
                  v{release.version}
                </span>
                {isCurrent && (
                  <span className="rounded-full bg-[color:var(--accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {t.cl_current}
                  </span>
                )}
                <span className="text-xs text-[color:var(--muted)]">
                  {formatDate(release.date, language)}
                </span>
              </div>

              <h2 className="mt-0.5 text-lg font-semibold tracking-tight">
                {release.title[language]}
              </h2>

              <ul className="mt-3 space-y-2.5">
                {release.entries.map((entry, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span
                      className={[
                        "mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        TYPE_STYLES[entry.type],
                      ].join(" ")}
                    >
                      {typeLabel[entry.type]}
                    </span>
                    <span className="text-sm leading-relaxed text-[color:var(--foreground)]">
                      {entry[language]}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
