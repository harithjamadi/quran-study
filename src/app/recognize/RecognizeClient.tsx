"use client";

import { useState } from "react";
import { loadAyahIndex, recognizeAyah, type RecognitionResult } from "@/lib/ayah-recognition";
import { parseAyahRef } from "@/lib/format";
import { TajweedText } from "@/components/TajweedText";
import { CameraCapture } from "@/components/CameraCapture";
import { stubOcrEngine } from "@/lib/ocr";
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
  camera: { en: "Use camera", ms: "Guna kamera" },
  startCamera: { en: "Start camera", ms: "Mula kamera" },
  capture: { en: "Capture", ms: "Tangkap" },
  ocrPending: {
    en: "Camera text recognition isn't available yet — type or paste for now.",
    ms: "Pengecaman teks kamera belum tersedia — taip atau tampal buat masa ini.",
  },
} as const;

const MIN_CONFIDENCE = 0.5;

export function RecognizeClient() {
  const language = useLearning((s) => s.language);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [cameraMode, setCameraMode] = useState(false);

  async function handleRecognize() {
    const index = await loadAyahIndex();
    setResult(index ? recognizeAyah(index, input) : null);
    setSearched(true);
  }

  async function handleCapture(image: ImageData) {
    const text = await stubOcrEngine.recognize(image);
    setInput(text);
    const index = await loadAyahIndex();
    setResult(index && text ? recognizeAyah(index, text) : null);
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
      <button
        onClick={() => setCameraMode((v) => !v)}
        className="ml-2 rounded-xl border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)]"
      >
        {T.camera[language]}
      </button>

      {cameraMode && (
        <div className="space-y-2">
          <CameraCapture
            onCapture={handleCapture}
            labelStart={T.startCamera[language]}
            labelCapture={T.capture[language]}
          />
          <p className="text-xs text-[color:var(--muted)]">{T.ocrPending[language]}</p>
        </div>
      )}

      {ref && (
        <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
          <p className="text-xs font-mono text-[color:var(--muted)] mb-2">{result!.key}</p>
          <TajweedText
            surahNumber={ref.surah}
            ayahNumber={ref.ayah}
            arabicFallback={result!.text}
            fontSize={32}
            highlightWords={result!.matchedRange}
          />
        </section>
      )}

      {searched && !ref && (
        <p className="text-sm text-[color:var(--muted)]">{T.notFound[language]}</p>
      )}
    </main>
  );
}
