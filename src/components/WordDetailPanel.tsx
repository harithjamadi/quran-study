"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { LemmaMeta, LemmaState } from "@/lib/learning";
import { effectiveGloss, statusOf } from "@/lib/learning";
import {
  loadRootOccurrences,
  loadLemmaExamples,
  type RootOccurrence,
} from "@/lib/words";
import { posLabel, posBadgeClass, type PosTag } from "@/lib/pos-colors";
import { SURAHS } from "@/data/surahs";
import { useLearning } from "@/store/learning";

type Tab = "overview" | "combinations";

export type VocabItem = LemmaMeta & { state: LemmaState; status: string };

interface Props {
  item: VocabItem;
  language: "en" | "ms";
  /** Full lemma metadata list — used to render sibling words sharing the same root. */
  freq: LemmaMeta[];
  onClose: () => void;
}

/* ── helpers ── */

const STATUS_CHIP: Record<string, string> = {
  strong: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  good:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  weak:   "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  new:    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

function surahName(num: number) {
  return SURAHS.find((x) => x.number === num)?.englishName ?? `Surah ${num}`;
}

function relativeDate(ms: number, language: "en" | "ms"): string {
  const diff = ms - Date.now();
  const abs = Math.abs(diff);
  const days = Math.round(abs / 86_400_000);
  const hours = Math.round(abs / 3_600_000);
  if (diff < 0) return language === "ms" ? "Kini" : "Now";
  if (hours < 24) return language === "ms" ? `${hours}j lagi` : `in ${hours}h`;
  return language === "ms" ? `${days}h lagi` : `in ${days}d`;
}

function isSampleMismatch(item: LemmaMeta): boolean {
  return !!item.sampleText && item.sampleText !== item.lemma;
}

function singleLangGloss(meta: { en: string | null; ms: string | null }, language: "en" | "ms") {
  if (language === "ms") return meta.ms || meta.en || null;
  return meta.en || meta.ms || null;
}

/* ── panel ── */

export function WordDetailPanel({ item, language, freq, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [lemmaOccurrences, setLemmaOccurrences] = useState<RootOccurrence[] | null>(null);

  // Derived: we're loading whenever the Combinations tab is open but its data
  // hasn't arrived yet. Avoids a redundant loading flag set inside an effect.
  const loading = tab === "combinations" && lemmaOccurrences === null;

  const lemmasState = useLearning((s) => s.lemmas);
  const seenForms = useLearning((s) => s.seenForms);
  const markFormSeen = useLearning((s) => s.markFormSeen);

  const gloss = effectiveGloss(item, language);
  const mismatch = isSampleMismatch(item);

  // The lemma's own sample form counts as seen the moment the user opens the panel
  // for it — the user has already met this word in their learning journey.
  useEffect(() => {
    if (item.sampleText && !seenForms[item.sampleText]) {
      markFormSeen(item.sampleText);
    }
  }, [item.sampleText, seenForms, markFormSeen]);

  // Encountered sibling lemmas (same root, user has SRS state). Used in Overview.
  const encounteredSiblings = useMemo(() => {
    if (!item.root) return [];
    return freq
      .filter((m) => m.root === item.root && lemmasState[m.lemma])
      .sort((a, b) => b.count - a.count);
  }, [freq, item.root, lemmasState]);

  // Lazy-load Quran occurrences of THIS lemma when the user opens Combinations.
  // For rooted lemmas we use the root file (filtered); for particles we scan early surahs.
  useEffect(() => {
    if (tab !== "combinations") return;
    if (lemmaOccurrences !== null) return;

    if (item.root) {
      loadRootOccurrences(item.root).then((occs) => {
        const filtered = (occs ?? []).filter((o) => o.lemma === item.lemma);
        setLemmaOccurrences(filtered);
      });
    } else {
      loadLemmaExamples(item.lemma).then((occs) => {
        setLemmaOccurrences(occs);
      });
    }
  }, [tab, item.root, item.lemma, lemmaOccurrences]);

  // Group occurrences by their surface text (the actual Arabic form in the Quran).
  const combinations = useMemo(() => {
    if (!lemmaOccurrences) return [];
    const map = new Map<string, { count: number; example: RootOccurrence }>();
    for (const occ of lemmaOccurrences) {
      const cur = map.get(occ.text);
      if (!cur) map.set(occ.text, { count: 1, example: occ });
      else cur.count++;
    }
    return [...map.entries()]
      .map(([text, { count, example }]) => ({ text, count, example }))
      .sort((a, b) => b.count - a.count);
  }, [lemmaOccurrences]);

  const TABS: { id: Tab; label: string; labelMs: string }[] = [
    { id: "overview",     label: "Overview",     labelMs: "Ringkasan" },
    { id: "combinations", label: "Combinations", labelMs: "Gabungan" },
  ];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[88vh] sm:max-h-[80vh] flex flex-col shadow-2xl animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-[color:var(--border-strong)] mx-auto mt-3 sm:hidden" aria-hidden />

        {/* Header */}
        <div className="px-6 pt-4 pb-4 border-b border-[color:var(--border)]">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="arabic text-5xl leading-tight mb-1" lang="ar" dir="rtl">
                {item.lemma}
              </div>
              {item.translit && !mismatch && (
                <div className="text-xs font-mono text-[color:var(--muted)] mb-1">{item.translit}</div>
              )}
              <div className="text-base font-semibold">{gloss?.text ?? "—"}</div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <button
                onClick={onClose}
                className="text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-colors"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
              <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold ${STATUS_CHIP[item.status] ?? STATUS_CHIP.new}`}>
                {item.status}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${posBadgeClass(item.pos as PosTag)}`}>
              {posLabel(item.pos as PosTag, language)}
            </span>
            {item.root && (
              <span className="flex items-center gap-1.5 text-xs text-[color:var(--muted)] px-2 py-0.5 rounded-full border border-[color:var(--border)]">
                {language === "ms" ? "Akar" : "Root"}
                <span className="arabic text-[color:var(--gold)] font-bold text-sm" lang="ar" dir="rtl">{item.root}</span>
              </span>
            )}
            <span className="text-xs text-[color:var(--muted)] px-2 py-0.5 rounded-full border border-[color:var(--border)]">
              {item.count.toLocaleString()}× {language === "ms" ? "dalam Quran" : "in Quran"}
            </span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-[color:var(--border)] px-2 shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-3 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all -mb-px ${
                tab === t.id
                  ? "border-[color:var(--accent)] text-[color:var(--accent)]"
                  : "border-transparent text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              }`}
            >
              {language === "ms" ? t.labelMs : t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scroll-fade-y">
          {tab === "overview" && (
            <OverviewTab
              item={item}
              language={language}
              mismatch={mismatch}
              siblings={encounteredSiblings}
              lemmasState={lemmasState}
            />
          )}
          {tab === "combinations" && (
            <CombinationsTab
              item={item}
              language={language}
              loading={loading}
              combinations={combinations}
              seenForms={seenForms}
              freq={freq}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Overview tab ─────────────────────────────────────────────────────────── */

function OverviewTab({
  item, language, mismatch, siblings, lemmasState,
}: {
  item: VocabItem;
  language: "en" | "ms";
  mismatch: boolean;
  siblings: LemmaMeta[];
  lemmasState: Record<string, LemmaState>;
}) {
  const { state } = item;

  const fsrsStateLabel   = ["New", "Learning", "Review", "Relearning"];
  const fsrsStateLabelMs = ["Baru", "Belajar", "Ulang Kaji", "Belajar Semula"];

  const meaningText = singleLangGloss(item, language);

  return (
    <div className="p-5 space-y-5">
      {/* Meaning — single language */}
      <Section title={language === "ms" ? "Makna" : "Meaning"}>
        <div className="text-base font-medium leading-relaxed">
          {meaningText ?? "—"}
        </div>
        {mismatch && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-[color:var(--accent-soft)]/30 border border-[color:var(--accent)]/20 text-xs text-[color:var(--muted)] leading-relaxed">
            {language === "ms"
              ? <>Nota: contoh teks dalam data ialah <span className="arabic text-[color:var(--gold)] text-sm mx-1" lang="ar" dir="rtl">{item.sampleText}</span> (<span className="font-mono">{item.translit}</span>) — bentuk asas ialah <span className="arabic text-[color:var(--foreground)] mx-1" lang="ar" dir="rtl">{item.lemma}</span></>
              : <>Note: the data sample is <span className="arabic text-[color:var(--gold)] text-sm mx-1" lang="ar" dir="rtl">{item.sampleText}</span> (<span className="font-mono">{item.translit}</span>) — the base form is <span className="arabic text-[color:var(--foreground)] mx-1" lang="ar" dir="rtl">{item.lemma}</span></>
            }
          </div>
        )}
      </Section>

      {/* Encountered siblings from the same root */}
      {item.root && (
        <Section title={language === "ms" ? "Kata dari akar ini (sudah dijumpai)" : "Words from this root (encountered)"}>
          {siblings.length === 0 ? (
            <p className="text-xs text-[color:var(--muted)]">
              {language === "ms" ? "Tiada kata lain dari akar ini dijumpai lagi." : "No other words from this root encountered yet."}
            </p>
          ) : (
            <div className="space-y-2">
              {siblings.map((sib) => {
                const isCurrent = sib.lemma === item.lemma;
                const sibStatus = statusOf(lemmasState[sib.lemma]);
                const sibGloss = singleLangGloss(sib, language);
                return (
                  <div
                    key={sib.lemma}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                      isCurrent
                        ? "border-[color:var(--gold)] bg-[color:var(--gold)]/5"
                        : "border-[color:var(--border)] bg-[color:var(--surface)]"
                    }`}
                  >
                    <div className="arabic text-xl leading-tight shrink-0 w-16 text-right" lang="ar" dir="rtl">
                      {sib.lemma}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{sibGloss ?? "—"}</p>
                      <p className="text-[10px] text-[color:var(--muted)] mt-0.5">
                        {sib.count.toLocaleString()}× {language === "ms" ? "dalam Quran" : "in Quran"}
                      </p>
                    </div>
                    <span className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full font-bold shrink-0 ${STATUS_CHIP[sibStatus] ?? STATUS_CHIP.new}`}>
                      {isCurrent ? (language === "ms" ? "INI" : "THIS") : sibStatus}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {/* Grammar — about the current lemma */}
      <Section title={language === "ms" ? "Tatabahasa" : "Grammar"}>
        <div className="space-y-2">
          <Row label={language === "ms" ? "Kata" : "POS"}>
            <span className="font-medium">{posLabel(item.pos as PosTag, language)}</span>
          </Row>
          {item.root && (
            <Row label={language === "ms" ? "Akar" : "Root"}>
              <span className="arabic text-lg text-[color:var(--gold)]" lang="ar" dir="rtl">{item.root}</span>
            </Row>
          )}
          {item.translit && !mismatch && (
            <Row label={language === "ms" ? "Sebutan" : "Translit"}>
              <span className="font-mono text-sm">{item.translit}</span>
            </Row>
          )}
          <Row label={language === "ms" ? "Kekerapan" : "Frequency"}>
            <span className="font-medium">
              {item.count.toLocaleString()} {language === "ms" ? "kali dalam Quran" : "times in Quran"}
            </span>
          </Row>
        </div>
      </Section>

      {/* SRS progress */}
      <Section title={language === "ms" ? "Kemajuan Belajar" : "Learning Progress"}>
        <div className="space-y-2">
          <Row label={language === "ms" ? "Status" : "Status"}>
            <span className="font-medium capitalize">
              {language === "ms" ? fsrsStateLabelMs[state.state] : fsrsStateLabel[state.state]}
            </span>
          </Row>
          <Row label={language === "ms" ? "Ulangan" : "Reviews"}>
            <span className="font-medium">{state.reps}× {language === "ms" ? "betul" : "correct"}</span>
            {state.lapses > 0 && (
              <span className="text-orange-500 text-xs ml-2">
                {state.lapses}× {language === "ms" ? "lupa" : "forgotten"}
              </span>
            )}
          </Row>
          {state.reps > 0 && (
            <Row label={language === "ms" ? "Seterusnya" : "Next review"}>
              <span className="font-medium">{relativeDate(state.due, language)}</span>
            </Row>
          )}
          {state.scheduledDays > 0 && (
            <Row label={language === "ms" ? "Selang" : "Interval"}>
              <span className="font-medium">{state.scheduledDays}d</span>
            </Row>
          )}
        </div>
      </Section>

      <Link
        href={`/surah/${item.sampleSurah}#v${item.sampleAyah}`}
        className="flex items-center justify-between w-full rounded-2xl border border-[color:var(--border)] px-4 py-3 hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]/10 transition-all group"
      >
        <div>
          <p className="text-xs text-[color:var(--muted)] uppercase tracking-wider">
            {language === "ms" ? "Lihat dalam Quran" : "See in Quran"}
          </p>
          <p className="text-sm font-medium mt-0.5">
            {surahName(item.sampleSurah)} {item.sampleSurah}:{item.sampleAyah}
          </p>
        </div>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-[color:var(--muted)] group-hover:text-[color:var(--accent)] transition-colors">
          <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </div>
  );
}

/* ── Combinations tab (universal — surface forms of THIS lemma) ──────────── */

function CombinationsTab({
  item, language, loading, combinations, seenForms, freq,
}: {
  item: VocabItem;
  language: "en" | "ms";
  loading: boolean;
  combinations: { text: string; count: number; example: RootOccurrence }[];
  seenForms: Record<string, true>;
  freq: LemmaMeta[];
}) {
  const freqMap = useMemo(() => new Map(freq.map(f => [f.lemma, f])), [freq]);

  if (loading) return <LoadingState />;

  const discoveredCount = combinations.filter((c) => seenForms[c.text]).length;
  const discoveredPct = combinations.length === 0 ? 0 : Math.round((discoveredCount / combinations.length) * 100);

  const blurbEn = item.root
    ? "Different surface forms of this word as it appears in the Quran."
    : "This particle appears in many forms when attached to pronouns and other words.";
  const blurbMs = item.root
    ? "Pelbagai bentuk perkataan ini seperti yang muncul dalam Quran."
    : "Kata tugas ini muncul dalam pelbagai bentuk apabila digabungkan dengan kata ganti nama dan kata lain.";

  return (
    <div className="p-5 space-y-5">
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)]/60 p-4 space-y-3">
        <div className="arabic text-3xl text-[color:var(--gold)] text-center" lang="ar" dir="rtl">{item.lemma}</div>
        <p className="text-xs text-[color:var(--muted)] text-center">{language === "ms" ? blurbMs : blurbEn}</p>

        {/* Pokedex-style discovery counter */}
        {combinations.length > 0 && (
          <div className="space-y-1 max-w-[200px] mx-auto pt-1">
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-[10px] uppercase tracking-widest text-[color:var(--muted)] font-bold">
                {language === "ms" ? "Dijumpai" : "Discovered"}
              </span>
              <span className="text-lg font-black text-[color:var(--accent)] tabular-nums">{discoveredCount}</span>
              <span className="text-sm text-[color:var(--muted)] tabular-nums">/ {combinations.length}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[color:var(--border)] overflow-hidden">
              <div className="h-full bg-[color:var(--accent)] transition-all" style={{ width: `${discoveredPct}%` }} />
            </div>
          </div>
        )}
      </div>

      {combinations.length === 0 ? (
        <p className="text-sm text-center text-[color:var(--muted)] py-4">
          {language === "ms" ? "Tiada bentuk dijumpai." : "No forms found."}
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-[color:var(--muted)] font-bold">
            {language === "ms"
              ? `${combinations.length} bentuk ditemui`
              : `${combinations.length} forms found`}
          </p>
          {combinations.map(({ text, count, example }) => {
            const encountered = !!seenForms[text];
            return (
              <div
                key={text}
                className={`rounded-2xl border p-3 transition-all ${
                  encountered
                    ? "border-[color:var(--border)] bg-[color:var(--surface)]"
                    : "border-dashed border-[color:var(--border)] bg-[color:var(--surface)]/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`arabic text-2xl leading-tight text-right w-20 shrink-0 ${encountered ? "" : "text-[color:var(--muted)] opacity-60"}`} lang="ar" dir="rtl">
                    {text}
                  </div>
                  <div className="flex-1 min-w-0">
                    {encountered ? (
                      <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-bold">
                        <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {language === "ms" ? "DIJUMPAI" : "ENCOUNTERED"}
                      </span>
                    ) : (
                      <span className="inline-block text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 font-bold">
                        {language === "ms" ? "??? BELUM" : "??? UNDISCOVERED"}
                      </span>
                    )}
                    <p className={`text-xs mt-1 truncate ${encountered ? "text-[color:var(--muted)]" : "text-[color:var(--muted)] opacity-50 font-mono tracking-widest"}`}>
                      {encountered ? (() => {
                        const meta = example.lemma ? freqMap.get(example.lemma) : null;
                        return (language === "ms"
                          ? (example.glossMs || meta?.ms || example.gloss)
                          : (meta?.en || example.gloss)) || "—";
                      })() : "??? ??? ???"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold">{count}</div>
                    <div className="text-[10px] text-[color:var(--muted)]">{language === "ms" ? "kali" : "times"}</div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-[color:var(--border)]/50 flex items-center justify-end">
                  <Link
                    href={`/surah/${example.s}#v${example.a}`}
                    className="text-[10px] text-[color:var(--muted)] hover:text-[color:var(--accent)] transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {surahName(example.s)} {example.s}:{example.a} →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Shared primitives ────────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-[color:var(--muted)] font-bold mb-2">{title}</p>
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)]/60 px-4 py-3">
        {children}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] uppercase tracking-wider text-[color:var(--muted)] w-16 shrink-0">{label}</span>
      <span className="text-sm text-[color:var(--foreground)]">{children}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="p-5 space-y-3 animate-pulse">
      {[80, 60, 90, 70].map((w, i) => (
        <div key={i} className="h-14 rounded-2xl bg-[color:var(--border)]" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}
