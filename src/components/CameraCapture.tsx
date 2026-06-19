"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onCapture: (image: ImageData) => void;
  labelStart: string;
  labelCapture: string;
}

/** Live camera preview with a single-shot capture that emits an ImageData frame. */
export function CameraCapture({ onCapture, labelStart, labelCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streaming, setStreaming] = useState(false);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStreaming(true);
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
    <div className="space-y-2">
      <video ref={videoRef} className="w-full rounded-xl bg-black" playsInline muted />
      {!streaming ? (
        <button onClick={start} className="rounded-xl bg-[color:var(--accent-strong)] px-4 py-2 text-sm font-semibold text-white">
          {labelStart}
        </button>
      ) : (
        <button onClick={capture} className="rounded-xl bg-[color:var(--accent-strong)] px-4 py-2 text-sm font-semibold text-white">
          {labelCapture}
        </button>
      )}
    </div>
  );
}
