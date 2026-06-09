"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLearning } from "@/store/learning";
import { useSettings } from "@/store/settings";
import { RECITERS } from "@/lib/editions";
import {
  TAJWEED_RULES,
  WAQF_SIGNS,
  EXAMPLE_VERSES,
  categoryLabel,
  type TajweedCategory,
  type TajweedRule,
  type WaqfSign,
} from "@/lib/tajweed";
import {
  toggleExampleVerse,
  seekExampleVerse,
  useExampleVerseState,
  stopAllExampleVerses,
} from "@/lib/example-audio";
import { getSurah } from "@/data/surahs";
import type { Language } from "@/lib/i18n";

/** "1:1" → "Al-Fatihah 1:1" — surah names help beginners place the example. */
function refLabel(ref: string): string {
  const surah = getSurah(Number(ref.split(":")[0]));
  return surah ? `${surah.englishName} ${ref}` : ref;
}

const CATEGORY_ORDER: TajweedCategory[] = [
  "qalqalah",
  "madd",
  "ghunna",
  "noon_tanween",
  "meem",
  "hamza_lam",
  "waqf",
];

const CATEGORY_DESC: Record<TajweedCategory, Record<Language, string>> = {
  qalqalah: {
    en: "An echoing bounce produced on five specific letters when they carry sukun.",
    ms: "Lantunan gema pada lima huruf tertentu apabila membawa sukun.",
  },
  madd: {
    en: "Prolongation rules governing how long vowel sounds are stretched (2, 4, 5, or 6 harakat).",
    ms: "Peraturan pemanjangan yang mengawal tempoh bunyi vokal panjang (2, 4, 5, atau 6 harakat).",
  },
  ghunna: {
    en: "A nasal hum through the nose when noon or meem is doubled (mushaddad).",
    ms: "Dengung nasal melalui hidung apabila nun atau mim digandakan (musyaddad).",
  },
  noon_tanween: {
    en: "Rules for noon saakin and tanween when followed by specific letters.",
    ms: "Peraturan untuk nun saakin dan tanwin apabila diikuti oleh huruf tertentu.",
  },
  meem: {
    en: "Rules specifically for meem saakin — different articulation point from noon rules.",
    ms: "Peraturan khusus untuk mim saakin — tempat sebutan berbeza dari peraturan nun.",
  },
  hamza_lam: {
    en: "Connecting hamzah and assimilating lam — often silent or merged in continuous recitation.",
    ms: "Hamzah penghubung dan lam yang diserap — sering senyap atau digabungkan dalam bacaan berterusan.",
  },
  waqf: {
    en: "Stop signs written in the Mushaf to guide when and how to pause.",
    ms: "Tanda berhenti dalam Mushaf untuk membimbing bila dan bagaimana perlu berhenti.",
  },
};

function groupByCategory(): Record<TajweedCategory, TajweedRule[]> {
  const groups: Partial<Record<TajweedCategory, TajweedRule[]>> = {};
  for (const rule of Object.values(TAJWEED_RULES)) {
    groups[rule.category] ??= [];
    groups[rule.category]!.push(rule);
  }
  return groups as Record<TajweedCategory, TajweedRule[]>;
}

export function TajweedGuideClient() {
  const language = useLearning((s) => s.language);
  const ruleMastery = useLearning((s) => s.ruleMastery ?? {});
  const reciterId = useSettings((s) => s.reciterId);
  const setReciter = useSettings((s) => s.setReciter);
  const groups = groupByCategory();

  // Surface the rule the user is weakest at (min 3 attempts so the data is meaningful).
  const weakestRule = (() => {
    const candidates = Object.entries(ruleMastery)
      .filter(([code, m]) => m.attempts >= 3 && TAJWEED_RULES[code])
      .map(([code, m]) => ({
        rule: TAJWEED_RULES[code],
        acc: m.correct / m.attempts,
        attempts: m.attempts,
      }))
      .sort((a, b) => a.acc - b.acc);
    return candidates[0] && candidates[0].acc < 0.8 ? candidates[0] : null;
  })();

  return (
    <div className="space-y-10">
      {/* Header */}
      <section className="card p-6 sm:p-8 relative overflow-hidden text-center">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--accent-soft)_0%,transparent_60%)] pointer-events-none" />
        <div className="relative">
          <p className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
            {language === "ms" ? "Pembelajaran · Rujukan" : "Learning · Reference"}
          </p>
          <h1 className="text-3xl font-semibold mt-2">
            {language === "ms" ? "Panduan Tajweed" : "Tajweed Guide"}
          </h1>
          <p className="arabic text-2xl mt-1 text-[color:var(--accent-strong)]">أحكام التجويد</p>
          <p className="text-sm text-[color:var(--muted)] mt-3 max-w-xl mx-auto leading-relaxed">
            {language === "ms"
              ? "Tajweed (تجويد) bermaksud \"memperindah\" — peraturan yang mengawal sebutan tepat setiap huruf dalam Al-Quran, memelihara bacaan Nabi Muhammad ﷺ."
              : "Tajweed (تجويد) means \"to do well\" — rules governing the precise pronunciation of every letter in the Quran, preserving the exact recitation of the Prophet ﷺ."}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] text-white px-5 py-2 text-sm hover:bg-[color:var(--accent-strong)]"
            >
              {language === "ms" ? "Aktifkan Warna Tajweed →" : "Enable Tajweed Colors in Reader →"}
            </Link>
            <Link
              href="/surahs"
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-5 py-2 text-sm hover:bg-[color:var(--accent-soft)]/40"
            >
              {language === "ms" ? "Baca Al-Quran" : "Read the Quran"}
            </Link>
          </div>
        </div>
      </section>

      {/* Weak-rule callout — only when the user has practiced enough to give signal */}
      {weakestRule && (
        <section
          className="card p-5 flex items-start gap-4"
          style={{ borderColor: `color-mix(in srgb, ${weakestRule.rule.color} 40%, var(--border))` }}
        >
          <span
            className="w-10 h-10 rounded-full shrink-0 grid place-items-center text-white text-lg font-black"
            style={{ backgroundColor: weakestRule.rule.color }}
            aria-hidden
          >
            !
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-[color:var(--muted)] font-bold">
              {language === "ms" ? "Tumpukan latihan di sini" : "Focus your practice here"}
            </p>
            <p className="text-sm font-bold mt-1">
              {language === "ms"
                ? `Anda menjawab ${weakestRule.rule.name[language]} dengan betul `
                : `You're getting ${weakestRule.rule.name[language]} right `}
              <span className="text-[color:var(--accent)]">
                {Math.round(weakestRule.acc * 100)}%
              </span>
              {language === "ms"
                ? ` daripada masa (${weakestRule.attempts} cubaan)`
                : ` of the time (${weakestRule.attempts} attempts)`}
            </p>
            <a
              href={`#cat-${weakestRule.rule.category}`}
              className="inline-block text-xs text-[color:var(--accent-strong)] hover:underline mt-1 font-semibold"
            >
              {language === "ms" ? "Baca peraturan →" : "Review the rule →"}
            </a>
          </div>
        </section>
      )}

      {/* Color legend */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)] mb-4">
          {language === "ms" ? "Rujukan Warna" : "Color Reference"}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Object.values(TAJWEED_RULES).map((rule) => (
            <a
              key={rule.code}
              href={`#cat-${rule.category}`}
              className="flex items-center gap-2.5 rounded-lg border border-[color:var(--border)] px-3 py-2 hover:bg-[color:var(--accent-soft)]/30 transition-colors"
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: rule.color }} aria-hidden />
              <span className="text-xs font-medium truncate">{rule.name[language]}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Example reciter — a slower qari can be easier for beginners to follow.
          Bound to the shared setting, so every example below uses this voice. */}
      <section className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {language === "ms" ? "Qari untuk contoh" : "Reciter for examples"}
          </p>
          <p className="text-xs text-[color:var(--muted)]">
            {language === "ms"
              ? "Pilih qari yang lebih perlahan jika lebih mudah diikuti."
              : "Pick a slower reciter if it's easier to follow."}
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm shrink-0">
          <span className="sr-only">
            {language === "ms" ? "Pilih qari" : "Choose reciter"}
          </span>
          <select
            value={reciterId}
            onChange={(e) => setReciter(e.target.value)}
            className="rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-3 py-1.5 text-sm focus:outline-none focus:border-[color:var(--accent)]"
            aria-label={language === "ms" ? "Pilih qari" : "Choose reciter"}
          >
            {RECITERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      {/* Categories */}
      {CATEGORY_ORDER.map((cat) => {
        const rules = groups[cat];
        return (
          <section key={cat} id={`cat-${cat}`} className="scroll-mt-20 space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{categoryLabel(cat, language)}</h2>
              <p className="text-sm text-[color:var(--muted)] mt-1">{CATEGORY_DESC[cat][language]}</p>
            </div>
            {cat === "waqf" ? (
              <WaqfSection language={language} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {(rules ?? []).map((rule) => (
                  <RuleCard
                    key={rule.code}
                    rule={rule}
                    mastery={ruleMastery[rule.code]}
                    language={language}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {/* Footer */}
      <div className="card p-5 text-sm text-[color:var(--muted)] leading-relaxed">
        <p className="font-semibold text-[color:var(--foreground)] mb-1">
          {language === "ms" ? "Tentang panduan ini" : "About this guide"}
        </p>
        <p>
          {language === "ms"
            ? "Anotasi warna mengikut edisi quran-tajweed dari alquran.cloud dalam skrip Uthmani. Warna tajweed tersedia untuk Surah 1–114 dalam pembaca. Aktifkan di "
            : "Color annotations follow the quran-tajweed edition from alquran.cloud in Uthmani script. Tajweed colors are available for all 114 Surahs in the reader. Enable in "}
          <Link href="/settings" className="text-[color:var(--accent-strong)] hover:underline">
            {language === "ms" ? "Tetapan → Warna Tajweed" : "Settings → Tajweed Colors"}
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function RuleCard({
  rule,
  mastery,
  language,
}: {
  rule: TajweedRule;
  mastery?: { attempts: number; correct: number };
  language: Language;
}) {
  const acc = mastery && mastery.attempts > 0 ? mastery.correct / mastery.attempts : null;
  const attempts = mastery?.attempts ?? 0;

  return (
    <article className="card p-5 space-y-3 border-t-2" style={{ borderTopColor: rule.color }}>
      <div className="flex items-start gap-3 justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: rule.color }} aria-hidden />
            <h3 className="font-bold text-[color:var(--foreground)]">{rule.name[language]}</h3>
          </div>
          <p className="arabic text-lg text-[color:var(--muted)] mt-0.5" lang="ar" dir="rtl">{rule.name.ar}</p>
        </div>
      </div>

      {/* Mastery bar — only when there's signal */}
      {acc !== null && (
        <div>
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-[color:var(--muted)] font-bold mb-1">
            <span>{language === "ms" ? "Penguasaan" : "Mastery"}</span>
            <span className="tabular-nums" style={{ color: rule.color }}>
              {Math.round(acc * 100)}% · {attempts}
            </span>
          </div>
          <div className="relative h-1.5 rounded-full bg-[color:var(--border)] overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
              style={{ width: `${Math.round(acc * 100)}%`, backgroundColor: rule.color }}
            />
          </div>
        </div>
      )}

      {rule.letters && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-[color:var(--muted)] font-bold shrink-0">
            {language === "ms" ? "Huruf" : "Letters"}
          </span>
          <p className="arabic text-lg leading-loose" lang="ar" dir="rtl" style={{ color: rule.color }}>
            {rule.letters}
          </p>
        </div>
      )}

      {rule.acronym && (
        <div className="rounded-xl border border-dashed border-[color:var(--border-strong)] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-widest text-[color:var(--muted)] font-bold mb-1">
            {language === "ms" ? "Cara Hafal" : "Memory Aid"}
          </p>
          <p className="arabic text-xl leading-loose text-[color:var(--foreground)]" lang="ar" dir="rtl">
            {rule.acronym.ar}
          </p>
          <p className="text-xs text-[color:var(--muted)] mt-1 leading-relaxed">
            <span className="italic">{rule.acronym.translit}</span>
            <span className="mx-1.5 opacity-50">·</span>
            <span>{rule.acronym.note[language]}</span>
          </p>
        </div>
      )}

      <div>
        <p className="text-[10px] uppercase tracking-widest text-[color:var(--muted)] font-bold mb-1">
          {language === "ms" ? "Syarat" : "Condition"}
        </p>
        <p className="text-sm text-[color:var(--foreground)] leading-relaxed">{rule.condition[language]}</p>
      </div>

      <div className="rounded-xl bg-[color:var(--border)]/30 p-3">
        <p className="text-[10px] uppercase tracking-widest text-[color:var(--muted)] font-bold mb-1">
          {language === "ms" ? "Cara Sebut" : "How to Read"}
        </p>
        <p className="text-sm text-[color:var(--foreground)] leading-relaxed">{rule.howToRead[language]}</p>
      </div>

      <ExampleBlock rule={rule} language={language} />
    </article>
  );
}

function ExampleBlock({ rule, language }: { rule: TajweedRule; language: Language }) {
  const [idx, setIdx] = useState(0);
  const examples = rule.examples;
  const example = examples[idx] ?? examples[0];
  const total = examples.length;

  // Stop audio when the guide unmounts (route change) or when the user cycles
  // to a different example (so the previous verse doesn't keep playing).
  useEffect(() => () => stopAllExampleVerses(), []);
  useEffect(() => {
    stopAllExampleVerses();
  }, [idx]);

  const verse = example.ref ? EXAMPLE_VERSES[example.ref] : undefined;
  const hasVerse = Boolean(verse && example.highlight);
  const [surahStr, ayahStr] = (example.ref ?? "").split(":");
  const surah = Number(surahStr);
  const ayah = Number(ayahStr);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-[10px] uppercase tracking-widest text-[color:var(--muted)] font-bold">
          {language === "ms" ? "Contoh" : "Example"}
          {total > 1 && (
            <span className="ml-1.5 font-mono normal-case tracking-normal text-[color:var(--muted)]">
              {idx + 1}/{total}
            </span>
          )}
        </p>
        {total > 1 && (
          <button
            type="button"
            onClick={() => setIdx((i) => (i + 1) % total)}
            className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--muted)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition-colors"
          >
            {language === "ms" ? "Contoh lain" : "Another example"}
            <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden>
              <path d="M12 4V1L8 5l4 4V6a6 6 0 11-6 6H4a8 8 0 108-8z" />
            </svg>
          </button>
        )}
      </div>

      {hasVerse ? (
        <ExampleVerse
          verse={verse!}
          highlight={example.highlight!}
          color={rule.color}
          refStr={example.ref!}
        />
      ) : (
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <p className="arabic text-2xl leading-loose" lang="ar" dir="rtl" style={{ color: rule.color }}>
            {example.arabic}
          </p>
          {example.ref && (
            <span className="text-xs text-[color:var(--muted)] shrink-0">
              {refLabel(example.ref)}
            </span>
          )}
        </div>
      )}

      <p className="text-xs text-[color:var(--muted)] mt-1.5">
        <span className="italic">{example.translit}</span>
        <span className="mx-1.5 opacity-50">·</span>
        <span>{example.note[language]}</span>
      </p>

      {hasVerse && surah > 0 && ayah > 0 && (
        <VersePlayer
          id={`${rule.code}-${idx}`}
          surah={surah}
          ayah={ayah}
          color={rule.color}
          language={language}
        />
      )}
    </div>
  );
}

/** Renders the whole verse, colouring the word(s) the example highlights. */
function ExampleVerse({
  verse,
  highlight,
  color,
  refStr,
}: {
  verse: string[];
  highlight: [number, number];
  color: string;
  refStr: string;
}) {
  const [from, to] = highlight;
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="arabic text-2xl leading-[2.15]" lang="ar" dir="rtl">
        {verse.map((word, i) => {
          const hot = i + 1 >= from && i + 1 <= to;
          return (
            <span key={i}>
              <span
                className={hot ? "font-bold rounded px-0.5" : undefined}
                style={hot ? { color, backgroundColor: `${color}22` } : undefined}
              >
                {word}
              </span>
              {i < verse.length - 1 ? " " : ""}
            </span>
          );
        })}
      </p>
      <span className="text-xs text-[color:var(--muted)] shrink-0 mt-1">
        {refLabel(refStr)}
      </span>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Whole-verse player with a play/pause control, a draggable scrubber, and a
 *  current-time / duration readout. */
function VersePlayer({
  id,
  surah,
  ayah,
  color,
  language,
}: {
  id: string;
  surah: number;
  ayah: number;
  color: string;
  language: Language;
}) {
  const { playing, currentTime, duration } = useExampleVerseState(id);
  const reciterId = useSettings((s) => s.reciterId);
  const max = duration || 0;

  return (
    <div className="mt-3 flex items-center gap-3">
      <button
        type="button"
        onClick={() => toggleExampleVerse(id, surah, ayah, reciterId)}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors"
        style={
          playing
            ? { backgroundColor: color, borderColor: color, color: "#fff" }
            : { borderColor: "var(--border-strong)", color: "var(--foreground)" }
        }
        aria-pressed={playing}
        aria-label={
          playing
            ? language === "ms"
              ? "Henti"
              : "Pause"
            : language === "ms"
              ? "Mainkan ayat"
              : "Play verse"
        }
      >
        {playing ? (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
            <path d="M8 5l12 7-12 7z" />
          </svg>
        )}
      </button>

      <input
        type="range"
        min={0}
        max={max}
        step={0.05}
        value={Math.min(currentTime, max)}
        disabled={max === 0}
        onChange={(e) => seekExampleVerse(id, Number(e.target.value))}
        className="h-1 min-w-0 flex-1 cursor-pointer disabled:cursor-default disabled:opacity-50"
        style={{ accentColor: color }}
        aria-label={language === "ms" ? "Cari kedudukan audio" : "Seek audio position"}
      />

      <span className="w-[68px] shrink-0 text-right font-mono text-[10px] tabular-nums text-[color:var(--muted)]">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
}

function WaqfSection({ language }: { language: Language }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {WAQF_SIGNS.map((sign, idx) => (
        <WaqfCard 
          key={sign.char} 
          sign={sign} 
          language={language} 
          className={idx === WAQF_SIGNS.length - 1 ? "sm:col-span-2" : ""}
        />
      ))}
    </div>
  );
}

function WaqfCard({ sign, language, className = "" }: { sign: WaqfSign; language: Language; className?: string }) {
  // Mu'anaqah (ۛ) is a combining mark with no glyph of its own. Pairing it
  // with the dotted circle ◌ (U+25CC) tilts the result because ◌ falls back
  // to a non-Arabic font while ۛ comes from Amiri Quran — their metrics
  // don't align. Instead, attach ۛ to a non-breaking space (same font, same
  // metrics) and oversize it so the three dots read clearly inside the badge.
  const isMuanaqah = sign.char === "ۛ";
  const iconChar = isMuanaqah ? " ۛ" : sign.char;

  return (
    <article className={`card p-5 border-t-2 border-t-[color:var(--gold)] ${className}`}>
      <div className="flex items-start gap-4">
        <div
          className="shrink-0 w-16 h-16 rounded-full bg-[color:var(--gold)]/10 border border-[color:var(--gold)]/30 grid place-items-center overflow-hidden"
          aria-hidden
        >
          <span
            className="text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] select-none"
            style={{
              fontFamily: 'var(--font-arabic-family)',
              fontSize: isMuanaqah ? '4.5rem' : '1.5rem',
              lineHeight: isMuanaqah ? 1.4 : 0.85,
              display: isMuanaqah ? 'inline-block' : undefined,
              transform: isMuanaqah ? 'translate(0.5rem, -1rem) rotate(20deg)' : undefined,
              transformOrigin: 'center',
            }}
            lang="ar"
            dir="rtl"
          >
            {iconChar}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-[color:var(--foreground)] leading-snug">{sign.name[language]}</h3>
          <p className="arabic text-sm text-[color:var(--muted)] mt-0.5" lang="ar" dir="rtl">{sign.name.ar}</p>
        </div>
      </div>
      <p className="text-sm text-[color:var(--foreground-soft)] leading-relaxed mt-3">{sign.instruction[language]}</p>
      {sign.char === "۩" && (
        <div className="rounded-xl border border-[color:var(--gold)]/30 bg-[color:var(--gold)]/5 px-4 py-6 space-y-3 mt-3">
          <p className="text-[10px] uppercase tracking-widest text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] font-bold">
            {language === "ms" ? "Doa Sujud Tilawah" : "Sajdah Supplication"}
          </p>
          <p className="arabic text-xl leading-[2.5] text-[color:var(--foreground)] text-center py-4" lang="ar" dir="rtl">
            سَجَدَ وَجْهِيَ لِلَّذِي خَلَقَهُ وَشَقَّ سَمْعَهُ وَبَصَرَهُ بِحَوْلِهِ وَقُوَّتِهِ
          </p>
          <p className="text-xs text-[color:var(--muted)] italic leading-relaxed text-center">
            {language === "ms"
              ? "Wajahku sujud kepada Yang menciptakannya dan menjadikan pendengaran dan penglihatannya dengan kekuasaan dan kekuatan-Nya."
              : "My face prostrates to the One who created it and formed its hearing and sight by His power and strength."}
          </p>
        </div>
      )}
    </article>
  );
}
