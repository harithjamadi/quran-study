"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Flashcard } from "@/components/Flashcard";
import { useLearning } from "@/store/learning";
import { UI_STRINGS } from "@/lib/i18n";
import { isDue, statusOf, type Grade, type LemmaMeta } from "@/lib/learning";

interface Props {
  /** The full frequency list to draw new words from. */
  freq: LemmaMeta[];
}

const SESSION_SIZE = 10;
const MAX_NEW_PER_SESSION = 5;

export function SessionRunner({ freq }: Props) {
  const grade = useLearning((s) => s.grade);
  const introduceMany = useLearning((s) => s.introduceMany);
  const advanceIntroducedTo = useLearning((s) => s.advanceIntroducedTo);
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];

  const [queue, setQueue] = useState<LemmaMeta[] | null>(null);
  const [position, setPosition] = useState(0);
  const [stats, setStats] = useState({ correct: 0, lapse: 0 });
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  // Distractor pool is the top 300 words to keep options plausible.
  const distractorPool = useMemo(() => freq.slice(0, 300), [freq]);

  useEffect(() => {
    const snap = useLearning.getState();
    const lemmas = snap.lemmas;
    
    // 1. Identify "Due" cards (already introduced and SRS says it's time)
    const due: LemmaMeta[] = [];
    for (const item of freq) {
      const state = lemmas[item.lemma];
      if (state && isDue(state)) {
        due.push(item);
      }
      if (due.length >= SESSION_SIZE) break;
    }

    // 2. Identify "New" cards if we have room
    const newCount = Math.min(
      MAX_NEW_PER_SESSION,
      SESSION_SIZE - due.length
    );
    
    const newCards: LemmaMeta[] = [];
    if (newCount > 0) {
      // Find the first N items we haven't introduced yet, starting from the last rank
      const candidates = freq.slice(snap.introducedThroughRank);
      for (const item of candidates) {
        if (!lemmas[item.lemma]) {
          newCards.push(item);
        }
        if (newCards.length >= newCount) break;
      }
    }

    // 3. Combine and Shuffle
    const finalQueue = [...due, ...newCards];
    
    // Final check: if we're STILL short (maybe user caught up on all due and introduced),
    // just pull more new ones until we hit SESSION_SIZE.
    if (finalQueue.length < SESSION_SIZE) {
      const needed = SESSION_SIZE - finalQueue.length;
      const extraNew: LemmaMeta[] = [];
      const currentRank = snap.introducedThroughRank + newCards.length;
      const candidates = freq.slice(currentRank);
      for (const item of candidates) {
        if (!lemmas[item.lemma]) {
          extraNew.push(item);
        }
        if (extraNew.length >= needed) break;
      }
      finalQueue.push(...extraNew);
    }

    // Shuffle the final session so it's not always in frequency order
    for (let i = finalQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [finalQueue[i], finalQueue[j]] = [finalQueue[j], finalQueue[i]];
    }

    // Mark the new cards as introduced in the store
    const introducedLemmas = finalQueue.filter(m => !lemmas[m.lemma]).map(m => m.lemma);
    if (introducedLemmas.length > 0) {
      introduceMany(introducedLemmas);
      // Advance the global introduced rank to the highest index we just touched
      const maxIdx = Math.max(...finalQueue.map(m => freq.indexOf(m)));
      if (maxIdx + 1 > snap.introducedThroughRank) {
        advanceIntroducedTo(maxIdx + 1);
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQueue(finalQueue);
  }, [freq, introduceMany, advanceIntroducedTo]);

  if (!queue) {
    return (
      <SessionFrame>
        <div className="card p-12 text-center text-[color:var(--muted)] animate-pulse">
          {t.dash_start_quest}...
        </div>
      </SessionFrame>
    );
  }

  if (queue.length === 0) {
    return (
      <SessionFrame>
        <EmptyState />
      </SessionFrame>
    );
  }

  if (position >= queue.length) {
    return (
      <SessionFrame>
        <Summary
          correct={stats.correct}
          lapse={stats.lapse}
          total={queue.length}
          maxCombo={maxCombo}
        />
      </SessionFrame>
    );
  }

  const card = queue[position];

  const onResult = (g: Grade) => {
    grade(card.lemma, g);
    if (g === "again") {
      setStats((s) => ({ ...s, lapse: s.lapse + 1 }));
      setCombo(0);
    } else {
      setStats((s) => ({ ...s, correct: s.correct + 1 }));
      setCombo((c) => {
        const next = c + 1;
        if (next > maxCombo) setMaxCombo(next);
        return next;
      });
    }
  };

  const onNext = () => {
    setPosition((p) => p + 1);
  };

  return (
    <SessionFrame>
      <SessionHeader
        position={position}
        total={queue.length}
        card={card}
        combo={combo}
      />
      <Flashcard
        key={card.lemma + position}
        card={card}
        distractorPool={distractorPool}
        onResult={onResult}
        onNext={onNext}
      />
    </SessionFrame>
  );
}

function SessionFrame({ children }: { children: React.ReactNode }) {
  const language = useLearning((s) => s.language);
  const setLanguage = useLearning((s) => s.setLanguage);
  const t = UI_STRINGS[language];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href="/learn"
          className="text-sm font-medium text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-colors"
        >
          ← {t.sess_exit}
        </Link>
        <div className="flex rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] p-0.5 shadow-sm">
          {(["en", "ms"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLanguage(l)}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all ${
                language === l
                  ? "bg-[color:var(--accent)] text-white shadow-sm scale-105"
                  : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}

function SessionHeader({
  position,
  total,
  card,
  combo,
}: {
  position: number;
  total: number;
  card: LemmaMeta;
  combo: number;
}) {
  const state = useLearning((s) => s.lemmas[card.lemma]);
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];
  const pct = ((position + 1) / total) * 100;
  const status = statusOf(state);
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-[color:var(--muted)] mb-1.5 h-6">
        <div className="flex items-center gap-3">
          <span>
            {t.sess_card_of.replace("{pos}", (position + 1).toString()).replace("{total}", total.toString())}
          </span>
          {combo >= 3 && (
            <span className="flex items-center gap-1 text-orange-500 font-bold animate-bounce italic">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              {combo} COMBO
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="uppercase tracking-wider font-semibold">
            {status}
          </span>
          <div className={`w-2 h-2 rounded-full shadow-sm ${
            status === "strong" ? "bg-green-500 ring-2 ring-green-500/20" :
            status === "good" ? "bg-blue-500 ring-2 ring-blue-500/20" :
            status === "weak" ? "bg-orange-500 ring-2 ring-orange-500/20" :
            "bg-gray-300 dark:bg-gray-700 ring-2 ring-gray-500/10"
          }`} />
        </div>
      </div>
      <div className="relative h-1.5 bg-[color:var(--border)] rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-[color:var(--accent)] transition-all duration-300 shadow-[0_0_8px_var(--accent)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Summary({
  correct,
  lapse,
  total,
  maxCombo,
}: {
  correct: number;
  lapse: number;
  total: number;
  maxCombo: number;
}) {
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];
  return (
    <div className="card p-8 text-center space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
          {t.sess_complete}
        </p>
        <p className="text-6xl font-bold mt-3 text-[color:var(--accent-strong)]">
          {correct} / {total}
        </p>
      </div>

      <div className="flex justify-center gap-8 py-4 border-y border-[color:var(--border)]/50">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-[color:var(--muted)] mb-1">Max Combo</p>
          <p className="text-2xl font-bold text-orange-500 italic">{maxCombo}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-[color:var(--muted)] mb-1">Accuracy</p>
          <p className="text-2xl font-bold text-[color:var(--accent-strong)]">{Math.round((correct / total) * 100)}%</p>
        </div>
      </div>

      <p className="text-sm text-[color:var(--muted)]">
        {lapse > 0
          ? `${lapse} ${lapse === 1 ? "card" : "cards"} will return soon for review.`
          : "Perfect session! Vocabulary mastery increased."}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/learn"
          className="rounded-full bg-[color:var(--accent)] text-white px-6 py-2.5 text-sm font-bold hover:bg-[color:var(--accent-strong)] shadow-lg shadow-[color:var(--accent)]/20 transition-all active:scale-95"
        >
          {t.sess_back_dash}
        </Link>
        <Link
          href="/learn/session"
          className="rounded-full border border-[color:var(--border)] px-6 py-2.5 text-sm font-semibold hover:bg-[color:var(--accent-soft)]/20 transition-all active:scale-95"
        >
          {t.sess_one_more} →
        </Link>
      </div>
    </div>
  );
}

function EmptyState() {
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];
  return (
    <div className="card p-10 text-center">
      <p className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
        {t.sess_empty_title}
      </p>
      <h1 className="text-xl font-semibold mt-2">{t.sess_complete}</h1>
      <p className="text-sm text-[color:var(--muted)] mt-2">
        {t.sess_empty_desc}
      </p>
      <Link
        href="/learn"
        className="inline-block mt-5 rounded-full bg-[color:var(--accent)] text-white px-5 py-2 text-sm hover:bg-[color:var(--accent-strong)]"
      >
        {t.sess_back_dash}
      </Link>
    </div>
  );
}
