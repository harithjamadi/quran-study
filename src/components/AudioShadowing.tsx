"use client";

import { useState, useRef, useEffect } from "react";
import { useLearning } from "@/store/learning";
import { classNames } from "@/lib/format";

/* ── Types ───────────────────────────────────────────────────────────────── */

type RecordState = "inactive" | "recording" | "done";

interface VerseOption {
  globalAyah: number; // Islamic Network CDN global number
  arabicText: string;
  label: string;
}

/* ── Static verse list (Al-Fatihah + short surahs at end of Quran) ───────── */
// Global ayah numbers: surah 112 starts at 6222, 113 at 6226, 114 at 6231

const VERSES: VerseOption[] = [
  { globalAyah: 1, arabicText: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", label: "Al-Fatihah 1:1" },
  { globalAyah: 2, arabicText: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", label: "Al-Fatihah 1:2" },
  { globalAyah: 3, arabicText: "الرَّحْمَٰنِ الرَّحِيمِ", label: "Al-Fatihah 1:3" },
  { globalAyah: 6222, arabicText: "قُلْ هُوَ اللَّهُ أَحَدٌ", label: "Al-Ikhlas 112:1" },
  { globalAyah: 6223, arabicText: "اللَّهُ الصَّمَدُ", label: "Al-Ikhlas 112:2" },
  { globalAyah: 6224, arabicText: "لَمْ يَلِدْ وَلَمْ يُولَدْ", label: "Al-Ikhlas 112:3" },
  { globalAyah: 6226, arabicText: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ", label: "Al-Falaq 113:1" },
  { globalAyah: 6231, arabicText: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ", label: "An-Nas 114:1" },
];

const AUDIO_CDN = "https://cdn.islamic.network/quran/audio/128/ar.alafasy";

/* ── Waveform bars (animated during playback/recording) ─────────────────── */

function WaveformBars({ active, color = "var(--accent)" }: { active: boolean; color?: string }) {
  return (
    <div className="flex items-end gap-[3px] h-8 px-1">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className={classNames("w-1.5 rounded-sm origin-bottom", active ? "animate-waveform" : "h-1 opacity-30")}
          style={{ background: color, animationDelay: active ? `${i * 60}ms` : undefined }}
        />
      ))}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */

export function AudioShadowing() {
  const language = useLearning((s) => s.language);
  const [verse, setVerse] = useState<VerseOption>(VERSES[0]);
  const [recordState, setRecordState] = useState<RecordState>("inactive");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [refPlaying, setRefPlaying] = useState(false);
  const [myPlaying, setMyPlaying] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);

  const refAudio = useRef<HTMLAudioElement | null>(null);
  const myAudio = useRef<HTMLAudioElement | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      refAudio.current?.pause();
      myAudio.current?.pause();
      if (recorder.current?.state === "recording") recorder.current.stop();
    };
  }, []);

  function playRef() {
    const url = `${AUDIO_CDN}/${verse.globalAyah}.mp3`;
    if (!refAudio.current || refAudio.current.src !== url) {
      refAudio.current = new Audio(url);
      refAudio.current.onended = () => setRefPlaying(false);
    }
    refAudio.current.currentTime = 0;
    refAudio.current.play().catch(() => setRefPlaying(false));
    setRefPlaying(true);
  }

  function stopRef() {
    refAudio.current?.pause();
    if (refAudio.current) refAudio.current.currentTime = 0;
    setRefPlaying(false);
  }

  async function startRec() {
    stopRef();
    setPermissionDenied(false);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setPermissionDenied(true);
      return;
    }
    chunks.current = [];
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      if (myAudio.current) URL.revokeObjectURL(myAudio.current.src);
      myAudio.current = new Audio(URL.createObjectURL(blob));
      myAudio.current.onended = () => setMyPlaying(false);
      setHasRecording(true);
      setRecordState("done");
      stream.getTracks().forEach((t) => t.stop());
    };
    recorder.current = mr;
    mr.start();
    setRecordState("recording");
  }

  function stopRec() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  function playMine() {
    myAudio.current?.play().catch(() => setMyPlaying(false));
    setMyPlaying(true);
  }

  function stopMine() {
    myAudio.current?.pause();
    if (myAudio.current) myAudio.current.currentTime = 0;
    setMyPlaying(false);
  }

  function changeVerse(v: VerseOption) {
    stopRef();
    stopMine();
    if (recorder.current?.state === "recording") recorder.current.stop();
    if (myAudio.current) { URL.revokeObjectURL(myAudio.current.src); myAudio.current = null; }
    if (refAudio.current) { refAudio.current = null; }
    setHasRecording(false);
    setRecordState("inactive");
    setVerse(v);
  }

  const t = (en: string, ms: string) => language === "ms" ? ms : en;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="space-y-1">
        <p className="eyebrow text-[color:var(--accent-strong)]">
          {t("Tajweed · Pronunciation", "Tajweed · Sebutan")}
        </p>
        <h1 className="display text-[length:var(--text-2xl)]" style={{ fontWeight: 700 }}>
          {t("Audio Shadowing", "Ikut Bacaan")}
        </h1>
        <p className="text-sm text-[color:var(--muted)]">
          {t("Listen, record, and compare your recitation", "Dengar, rakam, banding balik bacaan anda")}
        </p>
      </header>

      {/* Verse selector */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide">
          {t("Choose a verse", "Pilih ayat")}
        </p>
        <div className="flex flex-wrap gap-2">
          {VERSES.map((v) => (
            <button
              key={v.globalAyah}
              onClick={() => changeVerse(v)}
              className={classNames(
                "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                verse.globalAyah === v.globalAyah
                  ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-white"
                  : "border-[color:var(--border)] hover:border-[color:var(--accent)]"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Arabic verse display */}
      <div className="card p-5 text-center">
        <p className="arabic text-[length:var(--arabic-sm)] mb-1" lang="ar" dir="rtl">{verse.arabicText}</p>
        <p className="text-xs text-[color:var(--muted)]">{verse.label}</p>
      </div>

      <p className="text-xs text-[color:var(--muted)] text-center">
        {t(
          "Listen → Record yourself → Compare with the original",
          "Dengar → Rakam diri anda → Bandingkan dengan asal"
        )}
      </p>

      {permissionDenied && (
        <div className="rounded-2xl border border-[color:var(--danger)] bg-[color:var(--danger)]/10 px-4 py-3 text-sm text-[color:var(--danger)]">
          {t(
            "Microphone access denied. Please allow microphone in your browser settings.",
            "Akses mikrofon ditolak. Benarkan mikrofon dalam tetapan pelayar anda."
          )}
        </div>
      )}

      {/* Step 1 — Reference */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-[color:var(--accent)] grid place-items-center text-white text-xs font-bold shrink-0">1</span>
            <span className="text-sm font-semibold">{t("Reference recitation", "Bacaan asal")}</span>
          </div>
          <WaveformBars active={refPlaying} color="var(--accent)" />
        </div>
        <button
          onClick={refPlaying ? stopRef : playRef}
          className={classNames(
            "w-full rounded-2xl border-2 py-3 text-sm font-semibold transition-all active:scale-[0.98]",
            refPlaying
              ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-white"
              : "border-[color:var(--border)] hover:border-[color:var(--accent)]"
          )}
        >
          {refPlaying ? `⏹ ${t("Stop", "Henti")}` : `▶ ${t("Listen", "Dengar")}`}
        </button>
      </div>

      {/* Step 2 — Record */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-[color:var(--danger)] grid place-items-center text-white text-xs font-bold shrink-0">2</span>
            <span className="text-sm font-semibold">{t("Your recitation", "Bacaan anda")}</span>
          </div>
          <WaveformBars active={recordState === "recording"} color="var(--danger)" />
        </div>
        {recordState !== "recording" ? (
          <button
            onClick={startRec}
            className="w-full rounded-2xl border-2 border-[color:var(--danger)] py-3 text-sm font-semibold text-[color:var(--danger)] hover:bg-[color:var(--danger)] hover:text-white transition-all active:scale-[0.98]"
          >
            ⏺ {hasRecording ? t("Record again", "Rakam semula") : t("Record yourself", "Rakam bacaan anda")}
          </button>
        ) : (
          <button
            onClick={stopRec}
            className="w-full rounded-2xl border-2 border-[color:var(--danger)] bg-[color:var(--danger)] py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] animate-pulse"
          >
            ⏹ {t("Done recording", "Selesai rakaman")}
          </button>
        )}
      </div>

      {/* Step 3 — Compare (shown once recording exists) */}
      {hasRecording && (
        <div className="card-raised p-4 space-y-3 animate-fade-up">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-[color:var(--gold)] grid place-items-center text-white text-xs font-bold shrink-0">3</span>
            <span className="text-sm font-semibold">{t("Compare", "Bandingkan")}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={refPlaying ? stopRef : playRef}
              className={classNames(
                "rounded-2xl border-2 py-3 text-xs font-semibold transition-all",
                refPlaying
                  ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-white"
                  : "border-[color:var(--accent)]/50 hover:border-[color:var(--accent)]"
              )}
            >
              {refPlaying ? "⏹" : "▶"} {t("Reference", "Asal")}
            </button>
            <button
              onClick={myPlaying ? stopMine : playMine}
              className={classNames(
                "rounded-2xl border-2 py-3 text-xs font-semibold transition-all",
                myPlaying
                  ? "border-[color:var(--danger)] bg-[color:var(--danger)] text-white"
                  : "border-[color:var(--danger)]/50 hover:border-[color:var(--danger)]"
              )}
            >
              {myPlaying ? "⏹" : "▶"} {t("Yours", "Anda")}
            </button>
          </div>
          <p className="text-xs text-[color:var(--muted)] text-center">
            {t("Listen to both — what's different?", "Dengar dua-dua, apa perbezaannya?")}
          </p>
        </div>
      )}
    </div>
  );
}
