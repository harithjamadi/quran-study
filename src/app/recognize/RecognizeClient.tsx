"use client";

import { useRef, useState } from "react";
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
  cameraBusy: {
    en: "The camera is in use by another app. Close it and try again.",
    ms: "Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi itu dan cuba lagi.",
  },
} as const;

/**
 * Minimum matchedTerms/queryTerms ratio to show a result. At 0.5 a majority of
 * the typed words must appear in the top hit — below that, minisearch's OR
 * matching surfaces verses that share only a stray particle, which look like
 * confident wrong answers. Single-word queries always pass (1/1).
 */
const MIN_CONFIDENCE = 0.5;

export function RecognizeClient() {
  const language = useLearning((s) => s.language);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraMode, setCameraMode] = useState(false);
  // Monotonic run id: a newer recognition supersedes any in-flight one so a
  // slow earlier run can't commit a stale result over a fresher one.
  const runRef = useRef(0);

  async function runRecognition(text: string) {
    const runId = ++runRef.current;
    setLoading(true);
    try {
      const index = await loadAyahIndex();
      if (runId !== runRef.current) return; // superseded by a newer run
      setResult(index && text.trim() ? recognizeAyah(index, text) : null);
      setSearched(true);
    } finally {
      if (runId === runRef.current) setLoading(false);
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
    // No text yet (the OCR engine is still a stub) — leave the "not available"
    // hint in place rather than flashing the red "couldn't read" error.
    if (!text.trim()) return;
    setInput(text);
    await runRecognition(text);
  }

  // Bind the narrowed value once so the JSX below never needs `result!`.
  const matched = result && result.confidence >= MIN_CONFIDENCE ? result : null;
  const ref = matched ? parseAyahRef(matched.key) : null;
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
            className="btn-primary"
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
                busy: T.cameraBusy[language],
              }}
            />
            <p className="text-xs text-[color:var(--muted)]">{T.ocrPending[language]}</p>
          </div>
        )}
      </div>

      {/* Concise live announcements only — the rich result (full verse +
          Tajweed legend) stays outside so screen readers aren't read the
          entire ayah verbatim on every recognition. */}
      <div aria-live="polite" className="sr-only">
        {searched && !loading && matched && ref && (
          <span>{surah ? `${surah.englishName} ${matched.key}` : matched.key}</span>
        )}
        {searched && !loading && !matched && <span>{T.notFound[language]}</span>}
      </div>

      {matched && ref && (
        <section className="card-raised p-4 sm:p-5 space-y-3 animate-fade-up">
          <div className="flex items-baseline justify-between gap-3">
            {surah && (
              <h2 className="display text-[length:var(--text-lg)]" style={{ fontWeight: 600 }}>
                {surah.englishName}
              </h2>
            )}
            <span className="ml-auto font-mono text-xs tabular-nums text-[color:var(--muted)]">
              {matched.key}
            </span>
          </div>
          <TajweedText
            surahNumber={ref.surah}
            ayahNumber={ref.ayah}
            arabicFallback={matched.text}
            fontSize={32}
            highlightWords={matched.matchedRange}
          />
        </section>
      )}

      {searched && !matched && !loading && (
        <p className="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm text-[color:var(--muted-strong)]">
          {T.notFound[language]}
        </p>
      )}
    </div>
  );
}
