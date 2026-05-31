"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLearning } from "@/store/learning";
import { SURAHS } from "@/data/surahs";

/* ── Data ─────────────────────────────────────────────────────────────────── */

const DIFFICULTY_LABELS = {
  en: ["Easy", "Medium", "Hard"],
  ms: ["Mudah", "Sederhana", "Susah"],
} as const;

type SurahDef = { num: number; name: string; image: string };

const PHASES: {
  id: number;
  name: string;
  nameMs: string;
  subtitle: string;
  subtitleMs: string;
  surahs: SurahDef[];
  gateStars: number;
}[] = [
  {
    id: 1,
    name: "The Opening",
    nameMs: "Pembuka",
    subtitle: "Begin your journey",
    subtitleMs: "Mulakan perjalanan",
    surahs: [
      { num: 1,   name: "Al-Fatihah", image: "🕌" },
      { num: 114, name: "An-Naas",    image: "👥" },
      { num: 113, name: "Al-Falaq",   image: "🌄" },
    ],
    gateStars: 0,
  },
  {
    id: 2,
    name: "The Refuge",
    nameMs: "Perlindungan",
    subtitle: "Seek deeper meaning",
    subtitleMs: "Cari makna yang lebih dalam",
    surahs: [
      { num: 112, name: "Al-Ikhlas",  image: "☝️" },
      { num: 111, name: "Al-Masad",   image: "⛓️" },
      { num: 108, name: "Al-Kawthar", image: "⛲" },
    ],
    gateStars: 3,
  },
  {
    id: 3,
    name: "The Message",
    nameMs: "Pesanan",
    subtitle: "Master the final lessons",
    subtitleMs: "Kuasai pelajaran terakhir",
    surahs: [
      { num: 110, name: "An-Nasr",    image: "🚩" },
      { num: 109, name: "Al-Kafirun", image: "🚫" },
    ],
    gateStars: 9,
  },
];

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function StarRow({ count, max = 3, size = "md" }: { count: number; max?: number; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "text-base" : "text-xl";
  return (
    <span className={`${sz} leading-none tracking-tight`} aria-label={`${count} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={i < count ? "text-[color:var(--gold)]" : "text-[color:var(--muted)] opacity-50"}
        >
          ★
        </span>
      ))}
    </span>
  );
}

/** SVG dashed connector drawn between consecutive surah nodes. */
function NodeConnector({ completed }: { completed: boolean }) {
  return (
    <div className="flex justify-center pointer-events-none select-none" style={{ height: 28 }} aria-hidden>
      <svg width="6" height="28" viewBox="0 0 6 28" className="overflow-visible">
        {completed ? (
          <line
            x1="3" y1="0" x2="3" y2="28"
            stroke="var(--gold)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ) : (
          <line
            x1="3" y1="0" x2="3" y2="28"
            stroke="var(--border-strong)"
            strokeWidth="2"
            strokeDasharray="5 4"
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  );
}

/* ── Types ────────────────────────────────────────────────────────────────── */

type Track = "vocab" | "tajweed";
type PickerTarget = SurahDef & { prevName?: string };
type LockedTarget = SurahDef & { reason: string };

/* ── Main component ───────────────────────────────────────────────────────── */

export function QuestMap() {
  const language = useLearning((s) => s.language);
  const vocabStars = useLearning((s) => s.surahStars ?? {});
  const tajweedStars = useLearning((s) => s.tajweedStars ?? {});

  const [track, setTrack] = useState<Track>("vocab");
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [lockedMsg, setLockedMsg] = useState<LockedTarget | null>(null);

  const surahStars = track === "vocab" ? vocabStars : tajweedStars;
  const routePrefix = track === "vocab" ? "surah-quest" : "tajweed-quest";

  const totalStars = Object.values(surahStars).reduce((a, b) => a + b, 0);

  // The first unlocked surah with 0 stars — this is the player's current objective.
  const activeNum = (() => {
    for (const phase of PHASES) {
      if (totalStars < phase.gateStars) break;
      for (let i = 0; i < phase.surahs.length; i++) {
        const item = phase.surahs[i];
        const prev = i > 0 ? phase.surahs[i - 1] : null;
        const unlocked = i === 0 || (surahStars[prev!.num] ?? 0) >= 1;
        if (unlocked && (surahStars[item.num] ?? 0) === 0) return item.num;
      }
    }
    return null;
  })();

  return (
    <>
      {picker && (
        <DifficultyPicker
          item={picker}
          surahStars={surahStars}
          routePrefix={routePrefix}
          track={track}
          language={language}
          onClose={() => setPicker(null)}
        />
      )}
      {lockedMsg && (
        <LockedModal
          item={lockedMsg}
          language={language}
          onClose={() => setLockedMsg(null)}
        />
      )}

      <div className="relative py-8 pl-4 pr-3 max-h-[70vh] overflow-y-auto overscroll-contain scrollbar-thin scroll-fade-y bg-gradient-to-b from-[color:var(--surface)]/40 to-[color:var(--background)] rounded-[inherit]">
        <div className="max-w-sm mx-auto space-y-10">
          <TrackToggle track={track} setTrack={setTrack} language={language} />
          {PHASES.map((phase, phaseIdx) => {
            const isPhaseUnlocked = totalStars >= phase.gateStars;

            return (
              <div key={phase.id}>
                {phaseIdx > 0 && (
                  <PhaseGate
                    phase={phase}
                    totalStars={totalStars}
                    needed={phase.gateStars}
                    unlocked={isPhaseUnlocked}
                    language={language}
                  />
                )}

                {/* Phase header */}
                <div className="text-center mb-6 mt-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] text-xs font-bold uppercase tracking-widest text-[color:var(--muted)]">
                    {language === "ms" ? `Fasa ${phase.id}` : `Phase ${phase.id}`}
                  </div>
                  <p className="mt-2 font-black text-lg uppercase tracking-tight text-[color:var(--foreground)]">
                    {language === "ms" ? phase.nameMs : phase.name}
                  </p>
                  <p className="text-xs text-[color:var(--muted)] mt-0.5">
                    {language === "ms" ? phase.subtitleMs : phase.subtitle}
                  </p>
                </div>

                {/* Surah nodes + connectors */}
                <div className="flex flex-col items-center">
                  {phase.surahs.map((item, idxInPhase) => {
                    const surah = SURAHS.find((s) => s.number === item.num);
                    if (!surah) return null;

                    const stars = surahStars[item.num] ?? 0;
                    const prevInPhase = idxInPhase > 0 ? phase.surahs[idxInPhase - 1] : null;
                    const isUnlocked =
                      isPhaseUnlocked &&
                      (idxInPhase === 0 || (surahStars[prevInPhase!.num] ?? 0) >= 1);

                    const isCompleted = stars > 0;
                    const isCurrent = isUnlocked && item.num === activeNum;

                    const offset =
                      idxInPhase % 2 === 0
                        ? "translate-x-8 sm:translate-x-16"
                        : "-translate-x-8 sm:-translate-x-16";

                    return (
                      <React.Fragment key={item.num}>
                        {/* Connecting path from previous node */}
                        {idxInPhase > 0 && (
                          <NodeConnector completed={(surahStars[prevInPhase!.num] ?? 0) > 0} />
                        )}

                        <div className={`my-3 flex flex-col items-center transition-all duration-700 ${offset}`}>
                          <div className="relative">
                            {/* Spotlight glow behind active node */}
                            {isCurrent && (
                              <div
                                className="absolute -inset-6 pointer-events-none -z-10 rounded-full blur-2xl"
                                style={{ background: "radial-gradient(ellipse at center, color-mix(in srgb, var(--accent) 30%, transparent) 0%, transparent 70%)" }}
                                aria-hidden
                              />
                            )}

                            {/* Pulsing ring overlay for current node */}
                            {isCurrent && (
                              <span
                                className="animate-node-ring absolute inset-0 rounded-[2rem] border-4 border-[color:var(--accent)] pointer-events-none"
                                aria-hidden
                              />
                            )}

                            <button
                              onClick={() => {
                                if (!isUnlocked) {
                                  const reason = !isPhaseUnlocked
                                    ? language === "ms"
                                      ? `Perlukan ${phase.gateStars} bintang untuk buka fasa ini`
                                      : `Need ${phase.gateStars} stars to unlock this phase`
                                    : language === "ms"
                                    ? `Selesaikan ${prevInPhase!.name} terlebih dahulu`
                                    : `Complete ${prevInPhase!.name} first`;
                                  setLockedMsg({ ...item, reason });
                                } else {
                                  setPicker(item);
                                }
                              }}
                              className={[
                                "relative w-28 h-28 rounded-[2rem] flex flex-col items-center justify-center border-4 transition-all duration-500 overflow-hidden",
                                isCompleted
                                  ? "border-[color:var(--gold)] bg-[color:var(--surface)] cursor-pointer hover:scale-110 hover:-translate-y-2"
                                  : isCurrent
                                  ? "border-[color:var(--accent)] bg-[color:var(--surface)] cursor-pointer hover:scale-110 hover:-translate-y-2"
                                  : "border-[color:var(--border)] border-2 bg-transparent opacity-40 grayscale cursor-pointer",
                              ].join(" ")}
                              style={
                                isCompleted
                                  ? { boxShadow: "0 15px 40px -10px rgba(0,0,0,0.35), 0 0 0 2px color-mix(in srgb, var(--gold) 20%, transparent)" }
                                  : isCurrent
                                  ? { boxShadow: "0 15px 40px -10px rgba(0,0,0,0.35), 0 0 20px color-mix(in srgb, var(--accent) 30%, transparent)" }
                                  : undefined
                              }
                            >
                              <span className={`text-4xl mb-1 ${!isUnlocked ? "opacity-30 blur-sm" : ""}`}>
                                {item.image}
                              </span>

                              {isUnlocked ? (
                                <StarRow count={stars} size="sm" />
                              ) : (
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[color:var(--muted)] mt-1">
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                              )}
                            </button>

                            {/* Master badge */}
                            {stars >= 3 && (
                              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[color:var(--gold)] text-black text-[10px] font-black px-3 py-1 rounded-full shadow-md whitespace-nowrap">
                                {language === "ms" ? "MASTER" : "MASTER"}
                              </div>
                            )}

                            {/* Play CTA — larger and more prominent for the active node */}
                            {isCurrent && (
                              <div
                                className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-white text-xs font-black px-4 py-1 rounded-full whitespace-nowrap shadow-lg"
                                style={{ background: "var(--accent)", boxShadow: "0 4px 14px color-mix(in srgb, var(--accent) 50%, transparent)" }}
                              >
                                {language === "ms" ? "▶ MAIN" : "▶ PLAY"}
                              </div>
                            )}

                            {/* Replay hint for completed-but-not-master nodes */}
                            {isCompleted && stars < 3 && (
                              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[color:var(--surface)] border border-[color:var(--gold)]/60 text-[color:var(--gold)] text-[10px] font-black px-3 py-1 rounded-full shadow-sm whitespace-nowrap">
                                {language === "ms" ? "ULANG" : "REPLAY"}
                              </div>
                            )}
                          </div>

                          <div className={`mt-6 text-center ${!isUnlocked ? "opacity-40" : ""}`}>
                            <p className="font-black text-sm uppercase tracking-widest text-[color:var(--foreground)]">
                              {surah.englishName}
                            </p>
                            <p className="arabic text-sm mt-1 text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]" lang="ar" dir="rtl">
                              {surah.name}
                            </p>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Bottom total stars */}
          <div className="text-center pt-4 pb-8">
            <p className="text-xs text-[color:var(--muted)] uppercase tracking-widest">
              {language === "ms" ? "Jumlah bintang" : "Total stars"}
            </p>
            <p className="text-3xl font-black text-[color:var(--gold)] mt-1">
              {totalStars} <span className="text-[color:var(--muted)] text-lg font-medium">/ 24</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Phase Gate ───────────────────────────────────────────────────────────── */

function PhaseGate({
  phase,
  totalStars,
  needed,
  unlocked,
  language,
}: {
  phase: (typeof PHASES)[0];
  totalStars: number;
  needed: number;
  unlocked: boolean;
  language: "en" | "ms";
}) {
  const progress = Math.min(1, totalStars / needed);
  const pct = Math.round(progress * 100);

  return (
    <div className="my-2 mx-4">
      <div className={[
        "rounded-2xl border-2 p-4 text-center space-y-3 transition-all",
        unlocked
          ? "border-[color:var(--accent)]/40 bg-[color:var(--accent-soft)]/10"
          : "border-[color:var(--border)] bg-[color:var(--surface)]/50",
      ].join(" ")}>
        {unlocked ? (
          <p className="text-xs font-bold text-[color:var(--accent)] uppercase tracking-widest">
            ✓ {language === "ms" ? `Fasa ${phase.id} Dibuka` : `Phase ${phase.id} Unlocked`}
          </p>
        ) : (
          <>
            <p className="text-xs font-bold text-[color:var(--muted)] uppercase tracking-widest">
              {language === "ms"
                ? `Perlukan ${needed} bintang untuk buka Fasa ${phase.id}`
                : `Need ${needed} stars to unlock Phase ${phase.id}`}
            </p>
            <div className="relative h-3 rounded-full bg-[color:var(--border)] overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
                style={{
                  width: `${pct}%`,
                  background: "linear-gradient(90deg, var(--gold), var(--accent))",
                }}
              />
            </div>
            <p className="text-xs text-[color:var(--muted)]">
              {totalStars} / {needed} {language === "ms" ? "bintang" : "stars"}
              <span className="text-[color:var(--accent)] font-bold ml-1">({pct}%)</span>
            </p>
          </>
        )}
      </div>

      <div className="flex justify-center py-2 text-[color:var(--border-strong)]">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>
    </div>
  );
}

/* ── Difficulty Picker ────────────────────────────────────────────────────── */

function DifficultyPicker({
  item,
  surahStars,
  routePrefix,
  track,
  language,
  onClose,
}: {
  item: PickerTarget;
  surahStars: Record<number, number>;
  routePrefix: string;
  track: Track;
  language: "en" | "ms";
  onClose: () => void;
}) {
  const surah = SURAHS.find((s) => s.number === item.num);
  const earned = surahStars[item.num] ?? 0;
  const labels = DIFFICULTY_LABELS[language];

  const vocabDescs = {
    en: [
      "Recognize — spot in verse, multiple choice",
      "Produce — Arabic from meaning, build the translation",
      "Apply — listen, fill the blank, reorder the verse",
    ],
    ms: [
      "Kenali — cari dalam ayat, pilihan jawapan",
      "Hasilkan — Arab dari maksud, bina terjemahan",
      "Aplikasi — dengar, isi tempat kosong, susun ayat",
    ],
  };
  const tajweedDescs = {
    en: [
      "Recognize — pick the rule, match colors, identify letters",
      "Understand — match conditions, monochrome challenge, sort by category",
      "Apply — find the mistake, count rules, audio identification",
    ],
    ms: [
      "Kenali — pilih peraturan, padan warna, kenali huruf",
      "Faham — padan syarat, cabaran tanpa warna, susun mengikut kategori",
      "Aplikasi — cari kesilapan, kira peraturan, kenal pasti dari audio",
    ],
  };
  const descs = track === "vocab" ? vocabDescs[language] : tajweedDescs[language];

  const difficulties = [
    { level: 1 as const, label: labels[0], desc: descs[0], locked: false },
    { level: 2 as const, label: labels[1], desc: descs[1], locked: earned < 1 },
    { level: 3 as const, label: labels[2], desc: descs[2], locked: earned < 2 },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">{item.image}</div>
          <h3 className="font-black text-xl uppercase tracking-tight">{item.name}</h3>
          {surah && (
            <p className="arabic text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] text-lg mt-1" lang="ar" dir="rtl">
              {surah.name}
            </p>
          )}
          {earned > 0 && (
            <div className="mt-2">
              <StarRow count={earned} />
            </div>
          )}
        </div>

        <div className="space-y-2">
          {difficulties.map((d) => {
            const isEarned = earned >= d.level;
            return (
              <div key={d.level}>
                {d.locked ? (
                  <div className="flex items-center gap-3 rounded-2xl border-2 border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 opacity-50">
                    <span className="text-lg leading-none">
                      {"★".repeat(d.level)}{"☆".repeat(3 - d.level)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{d.label}</p>
                      <p className="text-xs text-[color:var(--muted)] truncate">{d.desc}</p>
                    </div>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[color:var(--muted)]">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                ) : (
                  <Link
                    href={`/learn/${routePrefix}/${item.num}?d=${d.level}`}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={isEarned
                      ? { borderColor: "var(--gold)", background: "color-mix(in srgb, var(--gold) 8%, transparent)" }
                      : { borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 6%, transparent)" }
                    }
                  >
                    <span className="text-lg leading-none text-[color:var(--gold)]">
                      {"★".repeat(d.level)}
                      <span className="text-[color:var(--muted)] opacity-50">{"★".repeat(3 - d.level)}</span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{d.label}</p>
                      <p className="text-xs text-[color:var(--muted)] truncate">{d.desc}</p>
                    </div>
                    <span className="text-xs font-black text-[color:var(--accent)] shrink-0">
                      {isEarned
                        ? (language === "ms" ? "ULANG" : "REPLAY")
                        : (language === "ms" ? "MULA" : "START")}
                    </span>
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl py-2.5 text-sm font-semibold border border-[color:var(--border)] hover:bg-[color:var(--border)]/30 transition-all"
        >
          {language === "ms" ? "Tutup" : "Close"}
        </button>
      </div>
    </div>
  );
}

/* ── Locked modal ─────────────────────────────────────────────────────────── */

function LockedModal({
  item,
  language,
  onClose,
}: {
  item: LockedTarget;
  language: "en" | "ms";
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-[color:var(--border)]/60 flex items-center justify-center text-3xl grayscale opacity-50">
            {item.image}
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight">{item.name}</h3>
            <p className="text-xs text-[color:var(--muted-strong)] mt-1">
              {language === "ms" ? "Misi ini masih terkunci" : "This mission is locked"}
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)]/60 px-4 py-3 text-sm text-[color:var(--muted)] leading-relaxed">
            {item.reason}
          </div>
          <button
            onClick={onClose}
            className="w-full bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-white font-bold py-2.5 rounded-xl transition-all active:scale-95"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Track Toggle ─────────────────────────────────────────────────────────── */

function TrackToggle({
  track,
  setTrack,
  language,
}: {
  track: Track;
  setTrack: (t: Track) => void;
  language: "en" | "ms";
}) {
  const opts: { id: Track; label: string; sub: string }[] = [
    {
      id: "vocab",
      label: language === "ms" ? "Perbendaharaan" : "Vocabulary",
      sub: language === "ms" ? "Makna kata" : "Word meanings",
    },
    {
      id: "tajweed",
      label: language === "ms" ? "Tajweed" : "Tajweed",
      sub: language === "ms" ? "Peraturan bacaan" : "Recitation rules",
    },
  ];
  return (
    <div className="flex justify-center -mt-2">
      <div className="inline-flex p-1 rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] shadow-sm">
        {opts.map((o) => {
          const active = track === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setTrack(o.id)}
              className={[
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all min-w-[110px]",
                active
                  ? "bg-[color:var(--accent)] text-white shadow"
                  : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]",
              ].join(" ")}
              aria-pressed={active}
            >
              <span className="block leading-none">{o.label}</span>
              <span className="block text-[9px] opacity-75 mt-1 font-normal normal-case tracking-normal">
                {o.sub}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
