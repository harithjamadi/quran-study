"use client";

import { useState } from "react";
import Link from "next/link";
import { useLearning } from "@/store/learning";
import { classNames } from "@/lib/format";

// Global ayah offsets for selected surahs (verified against the CDN)
const SURAH_OFFSETS: Record<number, number> = {
  1: 1, 2: 8, 112: 6222, 113: 6227, 114: 6232,
};

function globalAyah(surah: number, ayah: number): number {
  return (SURAH_OFFSETS[surah] ?? 1) + ayah - 1;
}

function abdulBasetUrl(surah: number, ayah: number): string {
  const p = (n: number) => String(n).padStart(3, "0");
  return `https://verses.quran.com/AbdulBaset/Mujawwad/mp3/${p(surah)}${p(ayah)}.mp3`;
}

function alafasyUrl(surah: number, ayah: number): string {
  return `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalAyah(surah, ayah)}.mp3`;
}

interface Example {
  surah: number;
  ayah: number;
  label: string;
  rule: string;
  question: { en: string; ms: string };
  correctReciter: 0 | 1; // 0 = Abdul Baset, 1 = Alafasy
  explanation: { en: string; ms: string };
}

const EXAMPLES: Example[] = [
  {
    surah: 112, ayah: 1,
    label: "Al-Ikhlas 112:1",
    rule: "Ghunna",
    question: { en: "Which reciter holds the Ghunna on 'هُوَ' longer?", ms: "Pembaca mana yang menahan Ghunnah pada 'هُوَ' lebih lama?" },
    correctReciter: 0,
    explanation: { en: "Abdul Baset (Mujawwad style) uses a more prolonged, ornamented Ghunna. Alafasy is cleaner but shorter.", ms: "Abdul Baset (gaya Mujawwad) menggunakan Ghunnah yang lebih panjang dan dihias. Alafasy lebih ringkas." },
  },
  {
    surah: 113, ayah: 1,
    label: "Al-Falaq 113:1",
    rule: "Qalqalah",
    question: { en: "Which reciter has a more pronounced Qalqalah on 'الْفَلَقِ'?", ms: "Pembaca mana yang lebih jelas Qalqalahnya pada 'الْفَلَقِ'?" },
    correctReciter: 0,
    explanation: { en: "The Mujawwad style of Abdul Baset emphasises the echoing bounce on ق at the waqf more clearly.", ms: "Gaya Mujawwad Abdul Baset lebih menekankan lantunan ق ketika waqf." },
  },
  {
    surah: 114, ayah: 1,
    label: "An-Nas 114:1",
    rule: "Lam Shamsiyya",
    question: { en: "Which reciter makes the Lam Shamsiyya (ٱلنَّاسِ) clearer through the shadda?", ms: "Pembaca mana yang lebih jelas Lam Syamsiyyah (ٱلنَّاسِ) melalui syaddah?" },
    correctReciter: 1,
    explanation: { en: "Alafasy's crisp Hafs-style articulation makes the doubling of ن in ٱلنَّاسِ particularly clear.", ms: "Artikulasi Hafs Alafasy yang jelas menjadikan penggandaan ن dalam ٱلنَّاسِ sangat ketara." },
  },
  {
    surah: 1, ayah: 2,
    label: "Al-Fatihah 1:2",
    rule: "Idgham bila Ghunna",
    question: { en: "In 'رَبِّ ٱلْعَٰلَمِينَ', which reciter makes the Idgham on ل more audible?", ms: "Dalam 'رَبِّ ٱلْعَٰلَمِينَ', pembaca mana yang lebih jelas Idgham pada ل?" },
    correctReciter: 0,
    explanation: { en: "Abdul Baset's Mujawwad style naturally extends the merging for dramatic effect.", ms: "Gaya Mujawwad Abdul Baset secara semula jadi memanjangkan penggabungan untuk kesan dramatik." },
  },
];

function useAudioPair(urlA: string, urlB: string) {
  const [playing, setPlaying] = useState<0 | 1 | null>(null);
  const [audios] = useState<[HTMLAudioElement | null, HTMLAudioElement | null]>([null, null]);

  function play(idx: 0 | 1) {
    const url = idx === 0 ? urlA : urlB;
    const other = idx === 0 ? 1 : 0;

    // Stop the other
    if (audios[other]) { audios[other]!.pause(); audios[other]!.currentTime = 0; }

    if (!audios[idx]) {
      (audios as unknown as HTMLAudioElement[])[idx] = new Audio(url);
      audios[idx]!.addEventListener("ended", () => setPlaying(null));
    }

    if (playing === idx) {
      audios[idx]!.pause();
      setPlaying(null);
    } else {
      audios[idx]!.src = url;
      audios[idx]!.play().catch(() => undefined);
      setPlaying(idx);
    }
  }

  return { playing, play };
}

function ExampleCard({ ex, language }: { ex: Example; language: "en" | "ms" }) {
  const [answered, setAnswered] = useState<0 | 1 | null>(null);
  const { playing, play } = useAudioPair(
    abdulBasetUrl(ex.surah, ex.ayah),
    alafasyUrl(ex.surah, ex.ayah)
  );

  const RECITERS = ["Abdul Baset Mujawwad", "Alafasy"];

  return (
    <div className="card-raised p-6 space-y-4">
      <div>
        <p className="eyebrow mb-1">{ex.label} · <span style={{ color: "var(--accent)" }}>{ex.rule}</span></p>
        <p className="font-semibold text-sm">{ex.question[language]}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {([0, 1] as const).map((idx) => {
          const isPlaying = playing === idx;
          const isCorrect = answered !== null && idx === ex.correctReciter;
          const isWrong = answered !== null && answered === idx && idx !== ex.correctReciter;
          return (
            <div key={idx} className="space-y-2">
              <button
                onClick={() => play(idx)}
                className={classNames(
                  "w-full rounded-2xl border-2 p-4 flex items-center justify-center gap-3 transition-all active:scale-95",
                  isPlaying ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/30" : "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)]/60"
                )}
                aria-label={`${isPlaying ? "Pause" : "Play"} ${RECITERS[idx]}`}
              >
                <span className={classNames("h-9 w-9 rounded-full grid place-items-center shrink-0", isPlaying ? "bg-[color:var(--accent)] text-white" : "bg-[color:var(--border)]/60")}>
                  {isPlaying
                    ? <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
                    : <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5l12 7-12 7z"/></svg>}
                </span>
                <span className="text-sm font-semibold">{RECITERS[idx]}</span>
              </button>
              {answered === null && (
                <button
                  onClick={() => setAnswered(idx)}
                  className="w-full rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] py-2 text-xs font-semibold hover:border-[color:var(--accent)] transition-colors"
                >
                  {language === "ms" ? "Pilih ini ✓" : "Select this ✓"}
                </button>
              )}
              {answered !== null && (
                <div className={classNames(
                  "rounded-xl px-3 py-2 text-xs font-semibold text-center",
                  isCorrect && "bg-[color:var(--accent)]/10 text-[color:var(--accent-strong)] border border-[color:var(--accent)]/30",
                  isWrong && "bg-[color:var(--danger)]/8 text-[color:var(--danger)] border border-[color:var(--danger)]/25",
                  !isCorrect && !isWrong && "bg-[color:var(--border)]/40 text-[color:var(--muted)] border border-[color:var(--border)]"
                )}>
                  {isCorrect ? (language === "ms" ? "✓ Betul" : "✓ Correct") : isWrong ? (language === "ms" ? "✕ Cuba lagi" : "✕ Not quite") : "—"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {answered !== null && (
        <div className="rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] p-4 text-sm text-[color:var(--foreground)] leading-relaxed animate-fade-up">
          {ex.explanation[language]}
        </div>
      )}
    </div>
  );
}

export function QariComparison() {
  const language = useLearning((s) => s.language);

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <p className="eyebrow text-[color:var(--accent-strong)]">
          {language === "ms" ? "Perbandingan Qari" : "Qari Comparison"}
        </p>
        <h1 className="display text-[length:var(--text-2xl)]" style={{ fontWeight: 600 }}>
          {language === "ms" ? "Latih pendengaran anda" : "Train your ear"}
        </h1>
        <p className="text-sm text-[color:var(--muted)]">
          {language === "ms"
            ? "Dengar ayat yang sama oleh dua qari — kenalpasti hukum yang lebih jelas"
            : "Hear the same verse by two reciters — identify the clearer rule application"}
        </p>
      </div>

      {EXAMPLES.map((ex, i) => (
        <ExampleCard key={i} ex={ex} language={language} />
      ))}

      <Link
        href="/learn"
        className="block text-center text-sm text-[color:var(--muted)] hover:text-[color:var(--accent)] transition-colors py-2"
      >
        {language === "ms" ? "← Kembali ke Papan Pemuka" : "← Back to Dashboard"}
      </Link>
    </div>
  );
}
