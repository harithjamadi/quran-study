"use client";

import { useEffect, useRef, useState } from "react";

/** Why the camera couldn't open — each maps to a different fix for the user. */
export type CameraError = "insecure" | "denied" | "unavailable";

interface Props {
  onCapture: (image: ImageData) => void;
  labelStart: string;
  labelCapture: string;
  /** Cause-specific messages so the user is told the actual fix. */
  errors: Record<CameraError, string>;
}

/** Live camera preview with a single-shot capture that emits an ImageData frame. */
export function CameraCapture({ onCapture, labelStart, labelCapture, errors }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);

  async function start() {
    setError(null);
    setStarting(true);
    // getUserMedia only exists in a secure context (https / localhost). On a
    // plain-http LAN IP `mediaDevices` is undefined and there is no prompt — say
    // so explicitly instead of a generic "permission" message.
    const media = navigator.mediaDevices;
    if (!media?.getUserMedia) {
      setError("insecure");
      setStarting(false);
      return;
    }
    try {
      const stream = await media.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreaming(true);
      } else {
        // Component unmounted before the stream resolved — release the camera.
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch (e) {
      const name = (e as DOMException)?.name;
      if (name === "NotAllowedError" || name === "SecurityError") setError("denied");
      else if (name === "NotFoundError" || name === "OverconstrainedError") setError("unavailable");
      else setError(window.isSecureContext ? "unavailable" : "insecure");
    } finally {
      setStarting(false);
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    onCapture(ctx.getImageData(0, 0, canvas.width, canvas.height));
  }

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      const stream = video?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius)] border border-[color:var(--border-strong)] bg-[color:var(--foreground)]/90">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          aria-label="Camera preview"
          playsInline
          muted
        />
        {!streaming && (
          <div className="absolute inset-0 grid place-items-center text-white/60">
            {starting ? (
              <span
                aria-hidden
                className="h-7 w-7 rounded-full border-2 border-white/30 border-t-white/80 animate-spin"
              />
            ) : (
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
                <circle cx="12" cy="12" r="3.2" />
              </svg>
            )}
          </div>
        )}
      </div>
      {!streaming ? (
        <button
          onClick={start}
          disabled={starting}
          className="touch-target inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[color:var(--accent-strong)] hover:shadow-[var(--shadow-glow)] active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
        >
          {labelStart}
        </button>
      ) : (
        <button
          onClick={capture}
          className="touch-target inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[color:var(--accent-strong)] hover:shadow-[var(--shadow-glow)] active:scale-95"
        >
          {labelCapture}
        </button>
      )}
      {error && (
        <p className="text-xs text-[color:var(--danger)]" role="alert">
          {errors[error]}
        </p>
      )}
    </div>
  );
}
