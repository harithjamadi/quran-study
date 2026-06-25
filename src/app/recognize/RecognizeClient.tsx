"use client";

import { useState } from "react";
import { loadAyahIndex, recognizeAyah, type RecognitionResult } from "@/lib/ayah-recognition";
import { parseAyahRef, classNames } from "@/lib/format";
import { getSurah } from "@/data/surahs";
import { TajweedText } from "@/components/TajweedText";
import { CameraCapture } from "@/components/CameraCapture";
import { stubOcrEngine } from "@/lib/ocr";
import { useLearning } from "@/store/learning";

const T = {
  eyebrow: { en: "Tajweed · Recognize", ms: "Tajweed · Kenal Pasti" },
  title: { en: "Recognize an Ayah", ms: "Kenal Pasti Ayat" },
  hint: {
    en: "Paste or type Arabic from any Mushaf — we'll find the verse and show its Tajweed.",
    ms: "Tampal atau taip teks Arab dari mana-mana Mushaf — kami akan cari ayatnya dan tunjukkan Tajweednya.",
  },
  inputLabel: { en: "Arabic text to recognize", ms: "Teks Arab untuk dikenal pasti" },
  placeholder: { en: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ", ms: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ" },
  button: { en: "Recognize", ms: "Kenal Pasti" },
  searching: { en: "Searching…", ms: "Mencari…" },
  notFound: {
    en: "Couldn't read that clearly. Try a longer or cleaner fragment.",
    ms: "Tidak dapat dibaca dengan jelas. Cuba petikan yang lebih panjang atau jelas.",
  },
  camera: { en: "Use camera", ms: "Guna kamera" },
  cameraClose: { en: "Close camera", ms: "Tutup kamera" },
  startCamera: { en: "Start camera", ms: "Mula kamera" },
  capture: { en: "Capture", ms: "Tangkap" },
  ocrPending: {
    en: "Camera text recognition isn't available yet — type or paste for now.",
    ms: "Pengecaman teks kamera belum tersedia — taip atau tampal buat masa ini.",
  },
  cameraInsecure: {
    en: "The camera needs a secure connection. Open this page on https:// or http://localhost.",
    ms: "Kamera memerlukan sambungan selamat. Buka halaman ini melalui https:// atau http://localhost.",
  },
  cameraDenied: {
    en: "Camera access is blocked. Allow it for this site (tap the lock icon in the address bar) and try again.",
    ms: "Akses kamera disekat. Benarkan untuk laman ini (ketik ikon kunci pada bar alamat) dan cuba lagi.",
  },
  cameraUnavailable: {
    en: "No camera is available on this device.",
    ms: "Tiada kamera tersedia pada peranti ini.",
  },
} as const;

const MIN_CONFIDENCE = 0.5;

export function RecognizeClient() {
  const language = useLearning((s) => s.language);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraMode, setCameraMode] = useState(false);

  async function runRecognition(text: string) {
    setLoading(true);
    try {
      const index = await loadAyahIndex();
      setResult(index && text.trim() ? recognizeAyah(index, text) : null);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  function handleRecognize() {
    if (!input.trim() || loading) return;
    void runRecognition(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // ⌘/Ctrl+Enter submits, matching the search box affordance elsewhere.
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleRecognize();
    }
  }

  async function handleCapture(image: ImageData) {
    const text = await stubOcrEngine.recognize(image);
    setInput(text);
    await runRecognition(text);
  }

  const ref = result && result.confidence >= MIN_CONFIDENCE ? parseAyahRef(result.key) : null;
  const surah = ref ? getSurah(ref.surah) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-up">
      <header className="space-y-1">
        <p className="eyebrow text-[color:var(--accent-strong)]">{T.eyebrow[language]}</p>
        <h1 className="display text-[length:var(--text-2xl)]" style={{ fontWeight: 700 }}>
          {T.title[language]}
        </h1>
        <p className="max-w-[60ch] text-sm text-[color:var(--muted)] leading-relaxed">
          {T.hint[language]}
        </p>
      </header>

      <div className="card p-4 space-y-3">
        <label htmlFor="recognize-input" className="sr-only">
          {T.inputLabel[language]}
        </label>
        <textarea
          id="recognize-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          dir="rtl"
          lang="ar"
          placeholder={T.placeholder[language]}
          className="arabic w-full min-h-28 rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-3 text-xl text-right placeholder:text-[color:var(--muted)] focus:border-[color:var(--accent)]"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRecognize}
            disabled={!input.trim() || loading}
            className="touch-target inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[color:var(--accent-strong)] hover:shadow-[var(--shadow-glow)] active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading && (
              <span
                aria-hidden
                className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin"
              />
            )}
            {loading ? T.searching[language] : T.button[language]}
          </button>
          <button
            onClick={() => setCameraMode((v) => !v)}
            aria-pressed={cameraMode}
            className={classNames(
              "touch-target inline-flex items-center gap-2 rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors",
              cameraMode
                ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]"
                : "border-[color:var(--border-strong)] text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
            )}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
              <rect x="8" y="9" width="8" height="6" rx="1" />
            </svg>
            {cameraMode ? T.cameraClose[language] : T.camera[language]}
          </button>
        </div>

        {cameraMode && (
          <div className="space-y-2 pt-1">
            <CameraCapture
              onCapture={handleCapture}
              labelStart={T.startCamera[language]}
              labelCapture={T.capture[language]}
              errors={{
                insecure: T.cameraInsecure[language],
                denied: T.cameraDenied[language],
                unavailable: T.cameraUnavailable[language],
              }}
            />
            <p className="text-xs text-[color:var(--muted)]">{T.ocrPending[language]}</p>
          </div>
        )}
      </div>

      <div aria-live="polite">
        {ref && surah && (
          <section className="card-raised p-4 sm:p-5 space-y-3 animate-fade-up">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="display text-[length:var(--text-lg)]" style={{ fontWeight: 600 }}>
                {surah.englishName}
              </h2>
              <span className="font-mono text-xs tabular-nums text-[color:var(--muted)]">
                {result!.key}
              </span>
            </div>
            <TajweedText
              surahNumber={ref.surah}
              ayahNumber={ref.ayah}
              arabicFallback={result!.text}
              fontSize={32}
              highlightWords={result!.matchedRange}
            />
          </section>
        )}

        {searched && !ref && !loading && (
          <p className="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm text-[color:var(--muted-strong)]">
            {T.notFound[language]}
          </p>
        )}
      </div>
    </div>
  );
}
