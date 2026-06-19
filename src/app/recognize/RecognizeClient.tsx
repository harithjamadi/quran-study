"use client";

import { useState } from "react";
import { loadAyahIndex, recognizeAyah, type RecognitionResult } from "@/lib/ayah-recognition";
import { parseAyahRef } from "@/lib/format";
import { TajweedText } from "@/components/TajweedText";
import { useLearning } from "@/store/learning";

const T = {
  title: { en: "Recognize an Ayah", ms: "Kenal Pasti Ayat" },
  hint: {
    en: "Paste or type Arabic from any Mushaf — we'll find the verse and show its Tajweed.",
    ms: "Tampal atau taip teks Arab dari mana-mana Mushaf — kami akan cari ayatnya dan tunjukkan Tajweednya.",
  },
  button: { en: "Recognize", ms: "Kenal Pasti" },
  notFound: {
    en: "Couldn't read that clearly. Try a longer or cleaner fragment.",
    ms: "Tidak dapat dibaca dengan jelas. Cuba petikan yang lebih panjang atau jelas.",
  },
} as const;

const MIN_CONFIDENCE = 0.5;

export function RecognizeClient() {
  const language = useLearning((s) => s.language);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleRecognize() {
    const index = await loadAyahIndex();
    setResult(index ? recognizeAyah(index, input) : null);
    setSearched(true);
  }

  const ref = result && result.confidence >= MIN_CONFIDENCE ? parseAyahRef(result.key) : null;

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-4">
      <h1 className="text-xl font-bold text-[color:var(--foreground)]">{T.title[language]}</h1>
      <p className="text-sm text-[color:var(--muted)]">{T.hint[language]}</p>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        dir="rtl"
        lang="ar"
        className="arabic w-full min-h-28 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-xl text-right"
      />
      <button
        onClick={handleRecognize}
        className="rounded-xl bg-[color:var(--accent-strong)] px-4 py-2 text-sm font-semibold text-white"
      >
        {T.button[language]}
      </button>

      {ref && (
        <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
          <p className="text-xs font-mono text-[color:var(--muted)] mb-2">{result!.key}</p>
          <TajweedText
            surahNumber={ref.surah}
            ayahNumber={ref.ayah}
            arabicFallback={result!.text}
            fontSize={32}
          />
        </section>
      )}

      {searched && !ref && (
        <p className="text-sm text-[color:var(--muted)]">{T.notFound[language]}</p>
      )}
    </main>
  );
}
