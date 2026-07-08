"use client";

import { useEffect, useRef, useState } from "react";

/** Why the camera couldn't open — each maps to a different fix for the user. */
export type CameraError = "insecure" | "denied" | "unavailable" | "busy";

interface Props {
  onCapture: (image: ImageData) => void;
  labelStart: string;
  labelCapture: string;
  /** Caption shown over the framing guide, e.g. "Align 1–2 lines here". */
  guideLabel?: string;
  /** Cause-specific messages so the user is told the actual fix. */
  errors: Record<CameraError, string>;
}

/**
 * Framing guide as fractions of the frame — a wide, centred horizontal band
 * sized for one or two lines of a mushaf. Capture crops to this band so the
 * wall, page edges, reader-mask and other furniture around the text never
 * reach the OCR model. The overlay is drawn with the same fractions; with the
 * ~16:9 camera stream feeding a 16:9 preview, object-cover is near 1:1 so the
 * on-screen box matches the cropped region closely.
 */
const GUIDE = { x: 0.06, y: 0.29, w: 0.88, h: 0.42 } as const;

/** Live camera preview with a single-shot capture that emits an ImageData frame. */
export function CameraCapture({ onCapture, labelStart, labelCapture, guideLabel, errors }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Hold the stream explicitly so cleanup never depends on reading it back off
  // the <video> element — it's the single owner of the camera resource.
  const streamRef = useRef<MediaStream | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [starting, setStarting] = useState(false);
  // True once the first frame's dimensions are known — gates capture so a tap
  // can't be a silent no-op while the preview is still black.
  const [ready, setReady] = useState(false);
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
      // `ideal` resolution hints only — browsers pick the nearest supported
      // mode instead of failing. Default streams are often 640×480, which
      // starves OCR of pixels; ~1080p reads small print reliably.
      const stream = await media.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (videoRef.current) {
        streamRef.current = stream;
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
      // The camera exists but couldn't be started — usually another app/tab holds it.
      else if (name === "NotReadableError" || name === "TrackStartError") setError("busy");
      else setError(window.isSecureContext ? "unavailable" : "insecure");
    } finally {
      setStarting(false);
    }
  }

  function capture() {
    const video = videoRef.current;
    // videoWidth/Height are 0 until the first frame's metadata lands; capturing
    // then would build a 0×0 canvas and make getImageData throw IndexSizeError.
    if (!video || !video.videoWidth || !video.videoHeight) return;
    // Crop to the framing band (source-pixel space) — everything outside it is
    // page furniture that only degrades recognition.
    const sx = Math.round(video.videoWidth * GUIDE.x);
    const sy = Math.round(video.videoHeight * GUIDE.y);
    const sw = Math.round(video.videoWidth * GUIDE.w);
    const sh = Math.round(video.videoHeight * GUIDE.h);
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    onCapture(ctx.getImageData(0, 0, sw, sh));
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius)] border border-[color:var(--border-strong)] bg-[color:var(--foreground)]/90">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          aria-label="Camera preview"
          onLoadedMetadata={() => setReady(true)}
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
        {streaming && (
          <div
            aria-hidden
            className="pointer-events-none absolute rounded-md border-2 border-dashed border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
            style={{
              left: `${GUIDE.x * 100}%`,
              top: `${GUIDE.y * 100}%`,
              width: `${GUIDE.w * 100}%`,
              height: `${GUIDE.h * 100}%`,
            }}
          >
            {guideLabel && (
              <span className="absolute -top-6 left-0 rounded bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
                {guideLabel}
              </span>
            )}
          </div>
        )}
      </div>
      {!streaming ? (
        <button onClick={start} disabled={starting} className="btn-primary">
          {labelStart}
        </button>
      ) : (
        <button onClick={capture} disabled={!ready} className="btn-primary">
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
