"use client";

import { useEffect, useState } from "react";
import { MATHURAT, type WiridTime } from "@/data/wirid";
import type { WiridPassages } from "@/lib/wirid-fetch";
import { WiridRunner } from "@/components/WiridRunner";
import { useLearning } from "@/store/learning";
import { classNames } from "@/lib/format";

const T = {
  eyebrow: { en: "Wirid · Al-Ma'thurat", ms: "Wirid · Al-Ma'thurat" },
  title: { en: "Al-Ma'thurat", ms: "Al-Ma'thurat" },
  hint: {
    en: "The sughra compilation of morning and evening remembrance — Quranic passages and authentic supplications. Tap the counter as you recite.",
    ms: "Himpunan zikir pagi dan petang (sughra) — petikan Al-Quran dan doa-doa yang sahih. Ketik pembilang sambil membaca.",
  },
  morning: { en: "Morning", ms: "Pagi" },
  evening: { en: "Evening", ms: "Petang" },
} as const;

/** Evenings begin with ʿAsr time; before that the morning set is shown. */
function timeOfDay(): WiridTime {
  return new Date().getHours() >= 14 ? "evening" : "morning";
}

export function MathuratClient({ passages }: { passages: WiridPassages }) {
  const language = useLearning((s) => s.language);
  // Render "morning" on the server, then snap to the local clock after mount
  // so SSR markup never depends on server time (hydration-safe). setState runs
  // inside a rAF callback to satisfy react-hooks/set-state-in-effect.
  const [time, setTime] = useState<WiridTime>("morning");
  const [userPicked, setUserPicked] = useState(false);
  useEffect(() => {
    if (userPicked) return;
    const raf = requestAnimationFrame(() => setTime(timeOfDay()));
    return () => cancelAnimationFrame(raf);
  }, [userPicked]);

  return (
    <div className="space-y-6 animate-fade-up">
      <header className="mx-auto max-w-2xl space-y-3">
        <p className="eyebrow text-[color:var(--accent-strong)]">{T.eyebrow[language]}</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="display text-[length:var(--text-2xl)]" style={{ fontWeight: 700 }}>
            {T.title[language]}
          </h1>
          <div
            role="tablist"
            aria-label="Morning or evening"
            className="inline-flex rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-1"
          >
            {(["morning", "evening"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={time === t}
                onClick={() => {
                  setUserPicked(true);
                  setTime(t);
                }}
                className={classNames(
                  "touch-target rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                  time === t
                    ? "bg-[color:var(--accent)] text-white"
                    : "text-[color:var(--muted-strong)] hover:text-[color:var(--foreground)]"
                )}
              >
                {t === "morning" ? T.morning[language] : T.evening[language]}
              </button>
            ))}
          </div>
        </div>
        <p className="max-w-[60ch] text-sm text-[color:var(--muted)] leading-relaxed">
          {T.hint[language]}
        </p>
      </header>

      <WiridRunner
        routineId={`mathurat-${time}`}
        items={MATHURAT}
        passages={passages}
        time={time}
      />
    </div>
  );
}
