"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadAyahIndex, recognizeAyah, type RecognitionResult } from "@/lib/ayah-recognition";
import { parseAyahRef, classNames } from "@/lib/format";
import { getSurah } from "@/data/surahs";
import { TajweedText } from "@/components/TajweedText";
import { CameraCapture } from "@/components/CameraCapture";
import { tesseractOcrEngine } from "@/lib/ocr-tesseract";
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
  upload: { en: "Upload image", ms: "Muat naik imej" },
  ocrHint: {
    en: "Beta — reads clear, plain Arabic print best (books, screenshots). Ornate mushaf script often isn't recognized yet; typing is most reliable. Images never leave your device.",
    ms: "Beta — paling tepat untuk cetakan Arab biasa yang jelas (buku, tangkapan skrin). Skrip mushaf berhias selalunya belum dikenali; menaip paling boleh diharap. Imej tidak sesekali meninggalkan peranti anda.",
  },
  ocrReading: { en: "Reading the image…", ms: "Membaca imej…" },
  ocrFirstUse: {
    en: "Preparing text recognition (first time only, ~5 MB)…",
    ms: "Menyediakan pengecaman teks (kali pertama sahaja, ~5 MB)…",
  },
  ocrEmpty: {
    en: "Couldn't find readable Arabic text in that image. Get closer, fill the frame with one or two lines, and avoid glare.",
    ms: "Tiada teks Arab yang boleh dibaca dalam imej itu. Dekatkan kamera, penuhkan bingkai dengan satu dua baris, dan elakkan silau.",
  },
  ocrBadFile: {
    en: "Couldn't open that image file. Try a JPG or PNG photo instead.",
    ms: "Fail imej itu tidak dapat dibuka. Cuba foto JPG atau PNG.",
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
  readInContext: { en: "Read in context", ms: "Baca dalam konteks" },
  closeMatch: {
    en: "Close match — worth double-checking the verse.",
    ms: "Padanan hampir — eloknya semak semula ayatnya.",
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
  // "first-use" while the ~5 MB engine+model download, "reading" per image.
  const [ocrPhase, setOcrPhase] = useState<"idle" | "first-use" | "reading">("idle");
  const [ocrNotice, setOcrNotice] = useState<"empty" | "bad-file" | null>(null);
  const ocrWarmRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    if (ocrPhase !== "idle") return; // one image at a time
    setOcrNotice(null);
    setOcrPhase(ocrWarmRef.current ? "reading" : "first-use");
    try {
      const text = await tesseractOcrEngine.recognize(image);
      ocrWarmRef.current = true;
      if (!text.trim()) {
        // Distinguish "no Arabic found in the image" from the retrieval
        // engine's "no matching verse" — different fixes for the user.
        setOcrNotice("empty");
        return;
      }
      setInput(text);
      await runRecognition(text);
    } finally {
      setOcrPhase("idle");
    }
  }

  // Longest side we materialise from an upload. Phone cameras produce
  // 12–48 MP images; drawing those full-size would allocate hundreds of MB
  // of canvas memory and crash mobile tabs. OCR needs nowhere near that.
  const MAX_UPLOAD_DIMENSION = 2400;

  /** Decode an uploaded photo honouring EXIF rotation. Prefer
   *  createImageBitmap (off-main-thread), fall back to an <img> decode for
   *  browsers that reject the options bag or the file format. */
  async function decodeUpload(file: File): Promise<ImageBitmap | HTMLImageElement> {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      const url = URL.createObjectURL(file);
      try {
        const img = new Image();
        img.src = url;
        await img.decode();
        return img;
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setOcrNotice(null);
    try {
      const source = await decodeUpload(file);
      const width = "naturalWidth" in source ? source.naturalWidth : source.width;
      const height = "naturalHeight" in source ? source.naturalHeight : source.height;
      const scale = Math.min(1, MAX_UPLOAD_DIMENSION / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      if (source instanceof ImageBitmap) source.close(); // release bitmap memory promptly
      await handleCapture(ctx.getImageData(0, 0, canvas.width, canvas.height));
    } catch {
      setOcrNotice("bad-file"); // undecodable/unsupported image file
    }
  }

  // Bind the narrowed value once so the JSX below never needs `result!`.
  const matched = result && result.confidence >= MIN_CONFIDENCE ? result : null;
  const ref = matched ? parseAyahRef(matched.key) : null;
  const surah = ref ? getSurah(ref.surah) : null;

  // On phones the result card can render below the fold (especially after an
  // OCR run with the camera panel open) — bring it gently into view.
  const resultRef = useRef<HTMLElement>(null);
  const matchedKey = matched?.key;
  useEffect(() => {
    if (!matchedKey) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    resultRef.current?.scrollIntoView?.({
      behavior: reduced ? "auto" : "smooth",
      block: "nearest",
    });
  }, [matchedKey]);

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
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={ocrPhase !== "idle"}
            className="touch-target inline-flex items-center gap-2 rounded-full border border-[color:var(--border-strong)] px-6 py-2.5 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:border-[color:var(--accent)] disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
              <circle cx="9" cy="10" r="1.6" />
              <path d="m4.5 17 4.5-4 3.5 3 3-2.5 4 3.5" />
            </svg>
            {T.upload[language]}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label={T.upload[language]}
            onChange={(e) => {
              void handleUpload(e.target.files?.[0]);
              e.target.value = ""; // allow re-picking the same file
            }}
          />
        </div>

        {ocrPhase !== "idle" && (
          <p aria-live="polite" className="flex items-center gap-2 text-xs text-[color:var(--muted-strong)]">
            <span
              aria-hidden
              className="h-3 w-3 rounded-full border-2 border-[color:var(--accent)]/30 border-t-[color:var(--accent)] animate-spin"
            />
            {ocrPhase === "first-use" ? T.ocrFirstUse[language] : T.ocrReading[language]}
          </p>
        )}
        {ocrNotice && ocrPhase === "idle" && (
          <p className="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-3 text-xs text-[color:var(--muted-strong)]">
            {ocrNotice === "empty" ? T.ocrEmpty[language] : T.ocrBadFile[language]}
          </p>
        )}

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
          </div>
        )}
        <p className="text-xs text-[color:var(--muted)]">{T.ocrHint[language]}</p>
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
        <section ref={resultRef} className="card-raised p-4 sm:p-5 space-y-3 animate-fade-up">
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
          {matched.confidence < 0.7 && (
            <p className="text-xs text-[color:var(--muted-strong)]">{T.closeMatch[language]}</p>
          )}
          <TajweedText
            surahNumber={ref.surah}
            ayahNumber={ref.ayah}
            arabicFallback={matched.text}
            fontSize={32}
            highlightWords={matched.matchedRange}
          />
          <div className="pt-1">
            <Link
              href={`/surah/${ref.surah}#v${ref.ayah}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--accent-strong)] hover:underline"
            >
              {T.readInContext[language]}
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m9 6 6 6-6 6" />
              </svg>
            </Link>
          </div>
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
