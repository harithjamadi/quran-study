"use client";

import { useState, useCallback } from "react";
import { useLearning } from "@/store/learning";
import { MakhrajVisualizer } from "@/components/MakhrajVisualizer";
import Link from "next/link";

// ── Types matching public/data/foundations.json ──────────────────────────────

interface Letter {
  letter: string;
  isolated: string;
  name: { en: string; ms: string };
  translit: string;
  makhraj: string;
  example: { arabic: string; translit: string; meaning: { en: string; ms: string } };
  tip: { en: string; ms: string };
}

interface HarakatItem {
  id: string;
  name: { en: string; ms: string };
  mark: string;
  sound: string;
  description: { en: string; ms: string };
  example: { arabic: string; translit: string; word?: { arabic: string; translit: string; meaning: { en: string; ms: string } } };
  color: string;
}

interface TanweenItem extends HarakatItem {
  meaning?: { en: string; ms: string };
}

interface SukunItem {
  id: string;
  name: { en: string; ms: string };
  mark: string;
  sound: string;
  description: { en: string; ms: string };
  example: { arabic: string; translit: string; meaning: { en: string; ms: string } };
  tips?: { en: string; ms: string }[];
  color: string;
}

interface Lesson {
  id: string;
  title: { en: string; ms: string };
  subtitle: { en: string; ms: string };
  icon: string;
  letters?: Letter[];
  items?: (HarakatItem | TanweenItem | SukunItem)[];
}

interface Props {
  lessons: Lesson[];
}

// ── Alphabet lesson ────────────────────────────────────────────────────────────

function AlphabetLesson({ lesson, language }: { lesson: Lesson; language: "en" | "ms" }) {
  const [activeLetter, setActiveLetter] = useState<Letter | null>(null);

  const letters = lesson.letters ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[1fr_auto] gap-6 items-start">
        {/* Letter grid */}
        <div>
          <p className="text-xs text-[color:var(--muted)] mb-3">
            {language === "ms" ? "Ketik huruf untuk melihat titik sebutannya" : "Tap a letter to see its articulation point"}
          </p>
          <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5">
            {letters.map((letter) => {
              const isActive = activeLetter?.letter === letter.letter;
              return (
                <button
                  key={letter.letter}
                  onClick={() => setActiveLetter(isActive ? null : letter)}
                  className={[
                    "aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 border-2 transition-all duration-200 active:scale-95",
                    isActive
                      ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-white shadow-[var(--shadow-glow)]"
                      : "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)]/60 hover:bg-[color:var(--accent-soft)]/20",
                  ].join(" ")}
                  aria-pressed={isActive}
                  aria-label={letter.name[language]}
                >
                  <span className="text-xl leading-none" lang="ar">{letter.isolated}</span>
                  <span className="text-[8px] font-medium opacity-60 leading-none">{letter.translit}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Makhraj visualizer */}
        <div className="hidden sm:block shrink-0">
          <MakhrajVisualizer activeZone={activeLetter?.makhraj ?? null} size={200} />
        </div>
      </div>

      {/* Letter detail card */}
      {activeLetter && (
        <div className="rounded-2xl border border-[color:var(--accent)]/30 bg-gradient-to-br from-[color:var(--accent-soft)]/20 to-[color:var(--surface)] p-5 animate-fade-up space-y-3">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 shrink-0 rounded-2xl bg-[color:var(--accent)] text-white grid place-items-center shadow-[var(--shadow-glow)]">
              <span className="text-3xl" lang="ar">{activeLetter.isolated}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-lg">{activeLetter.name[language]}</p>
              <p className="text-sm text-[color:var(--muted)] italic">{activeLetter.translit}</p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-base font-bold text-[color:var(--accent-strong)]" lang="ar">{activeLetter.example.arabic}</span>
                <span className="text-xs text-[color:var(--muted)] italic">{activeLetter.example.translit}</span>
                <span className="text-xs text-[color:var(--foreground)]">— {activeLetter.example.meaning[language]}</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-[color:var(--surface)] border border-[color:var(--border)] p-3">
            <p className="text-xs font-semibold text-[color:var(--accent-strong)] mb-1">
              {language === "ms" ? "Cara Sebut" : "How to Produce"}
            </p>
            <p className="text-sm leading-relaxed">{activeLetter.tip[language]}</p>
          </div>
          {/* Mobile makhraj visualizer */}
          <div className="sm:hidden flex justify-center">
            <MakhrajVisualizer activeZone={activeLetter.makhraj} size={220} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Harakat lesson ─────────────────────────────────────────────────────────────

function HarakatLesson({ lesson, language }: { lesson: Lesson; language: "en" | "ms" }) {
  const [activeItem, setActiveItem] = useState<HarakatItem | null>(null);
  const items = (lesson.items ?? []) as HarakatItem[];

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        {items.map((item) => {
          const isActive = activeItem?.id === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveItem(isActive ? null : item)}
              className={[
                "rounded-2xl border-2 p-4 text-center transition-all duration-200 active:scale-[0.98]",
                isActive
                  ? "shadow-lg -translate-y-0.5"
                  : "border-[color:var(--border)] bg-[color:var(--surface)] hover:-translate-y-0.5",
              ].join(" ")}
              style={isActive ? { borderColor: item.color, background: item.color + "18" } : undefined}
              aria-pressed={isActive}
            >
              <div
                className="text-4xl mb-2"
                lang="ar"
                style={{ color: isActive ? item.color : undefined }}
              >
                {item.mark}
              </div>
              <p className="font-bold text-sm">{item.name[language]}</p>
              <p className="text-xs text-[color:var(--muted)] mt-0.5 font-mono">&ldquo;—{item.sound}&rdquo;</p>
            </button>
          );
        })}
      </div>

      {activeItem && (
        <div
          className="rounded-2xl border p-5 animate-fade-up space-y-3"
          style={{ borderColor: activeItem.color + "60", background: activeItem.color + "0C" }}
        >
          <p className="text-sm leading-relaxed">{activeItem.description[language]}</p>
          <div className="flex items-center gap-4 bg-[color:var(--surface)] rounded-xl p-4 border border-[color:var(--border)]">
            <span className="text-5xl font-bold" lang="ar" style={{ color: activeItem.color }}>
              {activeItem.example.arabic}
            </span>
            <div>
              <p className="text-sm italic text-[color:var(--muted)]">{activeItem.example.translit}</p>
              {activeItem.example.word && (
                <div className="mt-2">
                  <span className="text-lg" lang="ar">{activeItem.example.word.arabic}</span>
                  <span className="text-xs ml-2 italic text-[color:var(--muted)]">{activeItem.example.word.translit}</span>
                  <span className="text-xs ml-2 text-[color:var(--foreground)]">— {activeItem.example.word.meaning[language]}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sukun / Shadda lesson ─────────────────────────────────────────────────────

function GenericLesson({ lesson, language }: { lesson: Lesson; language: "en" | "ms" }) {
  const items = (lesson.items ?? []) as SukunItem[];

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border p-5 space-y-3"
          style={{ borderColor: item.color + "60", background: item.color + "0A" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-4xl" lang="ar" style={{ color: item.color }}>
              {item.mark}
            </span>
            <div>
              <p className="font-bold">{item.name[language]}</p>
              <p className="text-xs text-[color:var(--muted)]">Sound: {item.sound}</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed">{item.description[language]}</p>

          <div className="flex items-center gap-4 bg-[color:var(--surface)] rounded-xl p-4 border border-[color:var(--border)]">
            <span className="text-3xl font-bold" lang="ar" style={{ color: item.color }}>
              {item.example.arabic}
            </span>
            <div>
              <p className="text-sm italic text-[color:var(--muted)]">{item.example.translit}</p>
              {"meaning" in item.example && item.example.meaning && (
                <p className="text-xs mt-0.5">— {item.example.meaning[language]}</p>
              )}
            </div>
          </div>

          {item.tips && item.tips.length > 0 && (
            <ul className="space-y-1.5">
              {item.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span style={{ color: item.color }} className="shrink-0 mt-0.5">✦</span>
                  <span>{tip[language]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function FoundationsTrack({ lessons }: Props) {
  const language = useLearning((s) => s.language);
  const foundationsProgress = useLearning((s) => s.foundationsProgress ?? 0);
  const setFoundationsProgress = useLearning((s) => s.setFoundationsProgress);

  const [lessonIdx, setLessonIdx] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(() => {
    // Restore from progress: mark lessons as done if overall progress covers them
    const done = new Set<string>();
    const pct = foundationsProgress;
    const thresh = Math.floor(pct * lessons.length);
    lessons.slice(0, thresh).forEach((l) => done.add(l.id));
    return done;
  });

  const currentLesson = lessons[lessonIdx];

  const markComplete = useCallback(() => {
    const next = new Set(completedLessons).add(currentLesson.id);
    setCompletedLessons(next);
    const progress = next.size / lessons.length;
    setFoundationsProgress(progress);
    if (lessonIdx + 1 < lessons.length) {
      setLessonIdx(lessonIdx + 1);
    }
  }, [completedLessons, currentLesson.id, lessonIdx, lessons.length, setFoundationsProgress]);

  const overallPct = completedLessons.size / lessons.length;
  const isAllDone = completedLessons.size === lessons.length;

  return (
    <div className="space-y-6">
      {/* ── Progress header ── */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="eyebrow text-[color:var(--accent-strong)]">
              {language === "ms" ? "Landasan Noorani" : "Noorani Foundations"}
            </p>
            <p className="font-black text-lg mt-0.5">
              {isAllDone
                ? language === "ms" ? "Selesai! 🎓" : "Complete! 🎓"
                : language === "ms"
                  ? `Pelajaran ${completedLessons.size + 1} daripada ${lessons.length}`
                  : `Lesson ${completedLessons.size + 1} of ${lessons.length}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-[color:var(--accent-strong)]">
              {Math.round(overallPct * 100)}%
            </p>
          </div>
        </div>
        <div className="relative h-2.5 rounded-full bg-[color:var(--border)] overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${overallPct * 100}%`,
              background: "linear-gradient(90deg, var(--gold), var(--accent))",
            }}
          />
        </div>
      </div>

      {/* ── Lesson tabs ── */}
      <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-thin">
        {lessons.map((lesson, i) => {
          const done = completedLessons.has(lesson.id);
          const isActive = i === lessonIdx;
          return (
            <button
              key={lesson.id}
              onClick={() => setLessonIdx(i)}
              className={[
                "shrink-0 flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all",
                isActive
                  ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-white"
                  : done
                    ? "border-[color:var(--gold)]/40 bg-[color:var(--gold-soft)]/20 text-[color:var(--gold-strong)]"
                    : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] hover:border-[color:var(--accent)]/50",
              ].join(" ")}
            >
              <span>{lesson.icon}</span>
              <span className="hidden sm:inline">{lesson.title[language]}</span>
              {done && !isActive && <span className="text-[color:var(--gold)]">✓</span>}
            </button>
          );
        })}
      </div>

      {/* ── Lesson content ── */}
      <div
        key={currentLesson.id}
        className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 sm:p-7 animate-fade-up"
      >
        <div className="mb-5">
          <h2 className="display text-[length:var(--text-xl)] font-black">{currentLesson.title[language]}</h2>
          <p className="text-sm text-[color:var(--muted)] mt-1">{currentLesson.subtitle[language]}</p>
        </div>

        {currentLesson.id === "alphabet" ? (
          <AlphabetLesson lesson={currentLesson} language={language} />
        ) : currentLesson.id === "harakat" || currentLesson.id === "tanween" ? (
          <HarakatLesson lesson={currentLesson} language={language} />
        ) : (
          <GenericLesson lesson={currentLesson} language={language} />
        )}

        {/* ── Actions ── */}
        <div className="flex items-center gap-3 mt-6 pt-5 border-t border-[color:var(--border)]">
          {completedLessons.has(currentLesson.id) ? (
            <div className="flex items-center gap-2 text-sm text-[color:var(--gold-strong)]">
              <span className="text-lg">✓</span>
              <span className="font-semibold">{language === "ms" ? "Pelajaran selesai" : "Lesson complete"}</span>
            </div>
          ) : (
            <button
              onClick={markComplete}
              className="rounded-full bg-[color:var(--accent)] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[color:var(--accent-strong)] hover:shadow-[var(--shadow-glow)] transition-all active:scale-95"
            >
              {language === "ms" ? "Tandai selesai →" : "Mark as done →"}
            </button>
          )}
          {lessonIdx + 1 < lessons.length && (
            <button
              onClick={() => setLessonIdx(lessonIdx + 1)}
              className="rounded-full border border-[color:var(--border-strong)] px-5 py-2.5 text-sm font-semibold hover:border-[color:var(--accent)] transition-colors"
            >
              {language === "ms" ? "Seterusnya →" : "Next →"}
            </button>
          )}
        </div>
      </div>

      {/* ── All done ── */}
      {isAllDone && (
        <div className="rounded-2xl border border-[color:var(--gold)]/40 bg-gradient-to-br from-[color:var(--gold-soft)] to-[color:var(--surface)] p-6 text-center animate-fade-up">
          <p className="text-3xl mb-2">🎓</p>
          <p className="font-black text-lg">
            {language === "ms" ? "Tahniah, Graduan Asas!" : "Congratulations, Foundation Graduate!"}
          </p>
          <p className="text-sm text-[color:var(--muted-strong)] mt-1 mb-4">
            {language === "ms"
              ? "Anda telah menguasai asas bacaan Arab. Kini mulakan Cabaran Tajweed!"
              : "You have mastered the Arabic reading foundations. Now start the Tajweed Quests!"}
          </p>
          <Link
            href="/learn"
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--gold)] text-black px-6 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {language === "ms" ? "Kembali Belajar" : "Back to Learn"}
          </Link>
        </div>
      )}
    </div>
  );
}
