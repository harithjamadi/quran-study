"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useLearning } from "@/store/learning";
import { UI_STRINGS } from "@/lib/i18n";
import { getAyahWbw } from "@/lib/api";
import type { WordEntry } from "@/lib/words";
import { loadRootIndex } from "@/lib/words";
import { getSurah } from "@/data/surahs";
import { posLabel, posBadgeClass, type PosTag } from "@/lib/pos-colors";
import { getTadabbur } from "@/data/tadabbur";

interface Props {
  word: WordEntry;
  surahNumber: number;
  ayahNumber: number;
  anchorRect: DOMRect;
  onClose: () => void;
}

type Tab = "translation" | "grammar" | "reflection";

const POP_WIDTH = 340;
const POP_H_EST = 300;
const EDGE_PAD = 12;

export function WordPopover({
  word,
  surahNumber,
  ayahNumber,
  anchorRect,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [rootCount, setRootCount] = useState<number | null>(null);
  const [liveGloss, setLiveGloss] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("translation");

  const language = useLearning((s) => s.language);
  const introduce = useLearning((s) => s.introduce);
  const isIntroduced = useLearning((s) => !!s.lemmas[word.lemma || ""]);
  const t = UI_STRINGS[language];

  const layout = useMemo(() => {
    if (typeof window === "undefined") {
      return { top: 0, left: 0, popWidth: POP_WIDTH };
    }
    const popWidth = Math.min(POP_WIDTH, window.innerWidth - EDGE_PAD * 2);
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const placeBelow = spaceBelow >= POP_H_EST + EDGE_PAD;
    const top = placeBelow
      ? anchorRect.bottom + 8 + window.scrollY
      : anchorRect.top - 8 + window.scrollY - POP_H_EST;
    const desiredLeft =
      anchorRect.left + anchorRect.width / 2 - popWidth / 2 + window.scrollX;
    const left = Math.max(
      window.scrollX + EDGE_PAD,
      Math.min(desiredLeft, window.scrollX + window.innerWidth - popWidth - EDGE_PAD)
    );
    return { top, left, popWidth };
  }, [anchorRect]);

  useEffect(() => {
    let active = true;
    const verseKey = `${surahNumber}:${ayahNumber}`;
    getAyahWbw(verseKey, language).then(data => {
      if (!active) return;
      const liveWord = data.verse.words.find(w => w.position === word.i);
      if (liveWord?.translation?.text) setLiveGloss(liveWord.translation.text);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [surahNumber, ayahNumber, word.i, language]);

  useEffect(() => {
    if (!word.root) return;
    let active = true;
    loadRootIndex().then((idx) => {
      if (!active) return;
      if (idx && word.root && idx[word.root]) setRootCount(idx[word.root].count);
    });
    return () => { active = false; };
  }, [word.root]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onScroll() { onClose(); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const surah = getSurah(surahNumber);
  const surahName = surah ? surah.englishName : `Surah ${surahNumber}`;
  const pos = word.pos as PosTag;

  const tabs: { id: Tab; label: string }[] = [
    { id: "translation", label: language === "ms" ? "Terjemah" : "Meaning" },
    { id: "grammar", label: language === "ms" ? "Tatabahasa" : "Grammar" },
    { id: "reflection", label: language === "ms" ? "Renungan" : "Reflect" },
  ];

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={`${t.set_word_study}: ${word.text}`}
      className="absolute z-50 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-xl text-left overflow-hidden"
      style={{ top: layout.top, left: layout.left, width: layout.popWidth }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
        <div>
          <p className="arabic text-2xl leading-tight" lang="ar" dir="rtl">
            {word.text}
          </p>
          {word.translit && (
            <p className="text-xs text-[color:var(--muted)] italic mt-0.5">{word.translit}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-[color:var(--muted)] hover:text-[color:var(--foreground)] text-lg leading-none -mt-1 shrink-0"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-[color:var(--border)] px-4">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={[
              "text-xs font-bold py-2 px-3 border-b-2 transition-colors -mb-px",
              tab === id
                ? "border-[color:var(--accent)] text-[color:var(--accent)]"
                : "border-transparent text-[color:var(--muted)] hover:text-[color:var(--foreground)]",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {tab === "translation" && (
          <TranslationTab
            word={word}
            liveGloss={liveGloss}
            isIntroduced={isIntroduced}
            surahName={surahName}
            ayahNumber={ayahNumber}
            language={language}
            t={t}
            onIntroduce={() => introduce(word.lemma!, word.text)}
            onClose={onClose}
          />
        )}

        {tab === "grammar" && (
          <GrammarTab
            word={word}
            pos={pos}
            rootCount={rootCount}
            language={language}
            t={t}
            onClose={onClose}
          />
        )}

        {tab === "reflection" && (
          <ReflectionTab
            word={word}
            language={language}
          />
        )}
      </div>
    </div>,
    document.body
  );
}

/* ── Tab: Translation ─────────────────────────────────────────────────────── */

function TranslationTab({
  word,
  liveGloss,
  isIntroduced,
  surahName,
  ayahNumber,
  language,
  t,
  onIntroduce,
  onClose,
}: {
  word: WordEntry;
  liveGloss: string | null;
  isIntroduced: boolean;
  surahName: string;
  ayahNumber: number;
  language: "en" | "ms";
  t: typeof import("@/lib/i18n").UI_STRINGS["en"];
  onIntroduce: () => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[15px] font-medium text-[color:var(--foreground)]">
        {liveGloss || word.gloss || "—"}
      </p>

      {word.root && (
        <dl className="text-xs space-y-1.5">
          <Row label={t.word_root}>
            <span className="arabic text-lg" lang="ar" dir="rtl">{word.root}</span>
          </Row>
          {word.lemma && (
            <Row label={t.word_lemma}>
              <span className="arabic" lang="ar" dir="rtl">{word.lemma}</span>
            </Row>
          )}
          <Link
            href={`/root/${encodeURIComponent(word.root)}`}
            onClick={onClose}
            className="mt-2 inline-flex items-center gap-1 text-sm text-[color:var(--accent-strong)] hover:underline font-medium"
          >
            {t.word_all_occurrences} →
          </Link>
        </dl>
      )}

      {!word.root && (
        <p className="text-xs text-[color:var(--muted)] italic">
          {word.lemma ? `Particle / pronoun (lemma: ${word.lemma}).` : "Particle / pronoun."}
        </p>
      )}

      {word.lemma && (
        <div className="pt-1">
          {isIntroduced ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-500 font-bold bg-green-500/5 rounded-xl py-2.5 px-3 border border-green-500/20 text-sm">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>{language === "ms" ? "Sedang Belajar" : "Learning"}</span>
            </div>
          ) : (
            <button
              onClick={onIntroduce}
              className="w-full flex items-center justify-center gap-2 bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-[color:var(--accent)]/20 transition-all active:scale-95 text-sm"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {language === "ms" ? "Mula Belajar" : "Start Learning"}
            </button>
          )}
        </div>
      )}

      <p className="text-[10px] text-[color:var(--muted)] font-medium border-t border-[color:var(--border)] pt-2">
        {surahName} · {ayahNumber} · word {word.i}
      </p>
    </div>
  );
}

/* ── Tab: Grammar ─────────────────────────────────────────────────────────── */

function GrammarTab({
  word,
  pos,
  rootCount,
  language,
  t,
  onClose,
}: {
  word: WordEntry;
  pos: PosTag;
  rootCount: number | null;
  language: "en" | "ms";
  t: typeof import("@/lib/i18n").UI_STRINGS["en"];
  onClose: () => void;
}) {
  const posName = posLabel(pos, language);
  const badgeClass = posBadgeClass(pos);

  return (
    <div className="space-y-4">
      {/* POS badge */}
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badgeClass}`}>
          {posName}
        </span>
        {pos && (
          <span className="text-xs text-[color:var(--muted)]">
            {pos === "V" && (language === "ms" ? "Menunjukkan tindakan" : "Indicates an action")}
            {pos === "N" && (language === "ms" ? "Orang, tempat, atau benda" : "Person, place, or thing")}
            {pos === "P" && (language === "ms" ? "Menghubungkan kata" : "Connects other words")}
          </span>
        )}
      </div>

      {/* Morphology chain: Root → Lemma → Word Form */}
      {word.root && (
        <div className="rounded-xl bg-[color:var(--border)]/30 p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-[color:var(--muted)] font-bold">
            {language === "ms" ? "Pokok morfologi" : "Morphology tree"}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Root */}
            <div className="text-center">
              <p className="arabic text-xl text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]" lang="ar" dir="rtl">
                {word.root}
              </p>
              <p className="text-[9px] text-[color:var(--muted)] uppercase tracking-widest mt-0.5">
                {language === "ms" ? "Akar" : "Root"}
              </p>
            </div>
            <span className="text-[color:var(--muted)] text-lg">→</span>
            {/* Lemma */}
            {word.lemma && (
              <>
                <div className="text-center">
                  <p className="arabic text-xl text-[color:var(--accent-strong)]" lang="ar" dir="rtl">
                    {word.lemma}
                  </p>
                  <p className="text-[9px] text-[color:var(--muted)] uppercase tracking-widest mt-0.5">
                    {language === "ms" ? "Kata dasar" : "Lemma"}
                  </p>
                </div>
                <span className="text-[color:var(--muted)] text-lg">→</span>
              </>
            )}
            {/* Surface form */}
            <div className="text-center">
              <p className="arabic text-xl text-[color:var(--foreground)]" lang="ar" dir="rtl">
                {word.text}
              </p>
              <p className="text-[9px] text-[color:var(--muted)] uppercase tracking-widest mt-0.5">
                {language === "ms" ? "Kata sebenar" : "Form"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Root frequency */}
      {rootCount !== null && word.root && (
        <p className="text-xs text-[color:var(--muted)]">
          {language === "ms"
            ? `Akar ini muncul ${rootCount.toLocaleString()} kali dalam Al-Quran`
            : `This root appears ${rootCount.toLocaleString()} times in the Quran`}
        </p>
      )}

      {word.root && (
        <Link
          href={`/root/${encodeURIComponent(word.root)}`}
          onClick={onClose}
          className="inline-flex items-center gap-1 text-sm text-[color:var(--accent-strong)] hover:underline font-medium"
        >
          {t.word_all_occurrences} →
        </Link>
      )}
    </div>
  );
}

/* ── Tab: Reflection (Tadabbur) ───────────────────────────────────────────── */

function ReflectionTab({
  word,
  language,
}: {
  word: WordEntry;
  language: "en" | "ms";
}) {
  const entry = getTadabbur(word.root);

  if (entry) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-[color:var(--gold)]/30 bg-[color:var(--gold)]/5 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] uppercase tracking-widest text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] font-bold">
              {language === "ms" ? "Renungan (Tadabbur)" : "Reflection (Tadabbur)"}
            </p>
            <span className="text-[10px] font-mono text-[color:var(--muted)] italic">
              {entry.translit}
            </span>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-[color:var(--muted)] font-bold mb-1">
              {language === "ms" ? "Medan makna" : "Semantic field"}
            </p>
            <p className="text-sm text-[color:var(--foreground)] leading-relaxed">
              {entry.semanticField[language]}
            </p>
          </div>

          <div className="pt-2 border-t border-[color:var(--gold)]/20">
            <p className="text-[10px] uppercase tracking-wider text-[color:var(--muted)] font-bold mb-1">
              {language === "ms" ? "Renungan" : "Reflection"}
            </p>
            <p className="text-sm text-[color:var(--foreground)] leading-relaxed italic">
              {entry.reflection[language]}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback when no curated Tadabbur entry exists for this root.
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[color:var(--gold)]/30 bg-[color:var(--gold)]/5 p-4 space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] font-bold">
          {language === "ms" ? "Renungan (Tadabbur)" : "Reflection (Tadabbur)"}
        </p>
        {word.root ? (
          <p className="text-sm text-[color:var(--foreground)] leading-relaxed">
            {language === "ms"
              ? `Perkataan ini berasal dari akar `
              : `This word comes from the root `}
            <span className="arabic text-base text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]" lang="ar" dir="rtl">
              {word.root}
            </span>
            {language === "ms"
              ? `. Akar yang sama muncul dalam konteks berbeza di seluruh Al-Quran — setiap kemunculan membawa kedalaman makna yang dikongsi.`
              : `. The same root appears across the Quran in different contexts, each carrying a shared shade of meaning.`}
          </p>
        ) : (
          <p className="text-sm text-[color:var(--muted)] leading-relaxed italic">
            {language === "ms"
              ? "Kata tugas seperti ini kecil tetapi membentuk struktur ayat — perhatikan bagaimana ia menghubungkan idea."
              : "Particles are small but structurally load-bearing — notice how this word connects ideas across the verse."}
          </p>
        )}
      </div>
      <p className="text-[10px] text-[color:var(--muted)] italic">
        {language === "ms"
          ? "Renungan terperinci untuk akar ini akan ditambah kelak."
          : "Detailed reflection for this root is being curated."}
      </p>
    </div>
  );
}

/* ── Helper ───────────────────────────────────────────────────────────────── */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[color:var(--muted)] font-medium">{label}</dt>
      <dd className="text-[color:var(--foreground)]">{children}</dd>
    </div>
  );
}
