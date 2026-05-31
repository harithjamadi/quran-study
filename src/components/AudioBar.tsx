"use client";

import Link from "next/link";
import { useAudio } from "@/components/AudioProvider";
import { useSettings } from "@/store/settings";
import { useLearning } from "@/store/learning";
import { UI_STRINGS } from "@/lib/i18n";
import { getReciter } from "@/lib/editions";
import { classNames } from "@/lib/format";

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioBar() {
  const { current, playing, loading, duration, position, toggle, stop, seek, next, prev, error } = useAudio();
  const reciterId = useSettings((s) => s.reciterId);
  const reciter = getReciter(reciterId);
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];

  if (!current) return null;

  const pct = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] md:bottom-0 z-50">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 pb-3">
        <div className="card shadow-lg p-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              aria-label={t.audio_prev}
              title={t.audio_prev}
              className="h-9 w-9 rounded-full hover:bg-[color:var(--border)]/40 inline-flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
                <path d="M6 5h2v14H6zM20 5L9 12l11 7z" />
              </svg>
            </button>
            <button
              onClick={toggle}
              aria-label={playing ? t.audio_pause : t.audio_play}
              title={playing ? t.audio_pause : t.audio_play}
              className={classNames(
                "h-11 w-11 rounded-full inline-flex items-center justify-center text-white",
                "bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)]",
                loading && "animate-pulse-soft"
              )}
            >
              {playing ? (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
                  <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
                  <path d="M8 5l12 7-12 7z" />
                </svg>
              )}
            </button>
            <button
              onClick={next}
              aria-label={t.audio_next}
              title={t.audio_next}
              className="h-9 w-9 rounded-full hover:bg-[color:var(--border)]/40 inline-flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
                <path d="M16 5h2v14h-2zM4 5l11 7-11 7z" />
              </svg>
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <Link
              href={`/surah/${current.surahNumber}#v${current.ayahNumber}`}
              className="group/info block"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="truncate">
                  <span className="font-medium group-hover/info:text-[color:var(--accent)] transition-colors">
                    {current.surahName} · {current.ayahNumber}
                  </span>
                  <span className="text-[color:var(--muted)]"> · {reciter.name}</span>
                </div>
                <div className="tabular-nums text-[color:var(--muted)]">
                  {formatTime(position)} / {formatTime(duration)}
                </div>
              </div>
            </Link>
            <div className="mt-1.5 relative h-1.5 bg-[color:var(--border)] rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-[color:var(--accent)]"
                style={{ width: `${pct}%` }}
              />
              <input
                aria-label="Seek"
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={position}
                onChange={(e) => seek(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            {error && <p className="mt-1 text-xs text-[color:var(--danger)]">{error}</p>}
          </div>

          <button
            onClick={stop}
            aria-label={t.audio_stop}
            title={t.audio_stop}
            className="h-9 w-9 rounded-full hover:bg-[color:var(--border)]/40 inline-flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
