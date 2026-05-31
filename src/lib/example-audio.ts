/**
 * Singleton clip player for tajweed-guide examples.
 *
 * Unlike {@link "./verse-audio"} (which plays a whole verse), this plays only a
 * time slice of a verse — the word or phrase a tajweed example highlights — so
 * the learner hears just that example rather than the entire ayah.
 *
 * The slice [startMs, endMs] comes from Quran.com's per-word segment timings for
 * Shaikh Mishary Alafasy (the reciter those timings are published for), baked
 * into each example as `clip`. We load the verse MP3, seek to the start, and a
 * requestAnimationFrame loop pauses playback the instant we pass the end — a
 * small tail pad keeps the final letter/madd from being clipped, and for the
 * cross-word rules (idgham, iqlab, ikhfa) it lets the merge into the next letter
 * be heard, which is the whole point of those examples.
 *
 * Only one clip plays at a time across the guide; every button subscribes to the
 * same module-level state.
 */

"use client";

import { useSyncExternalStore } from "react";

/* ── URL ────────────────────────────────────────────────────────────────── */

function pad(n: number) {
  return String(n).padStart(3, "0");
}

/** Alafasy verse recitation — the source the baked-in clip timings line up to. */
function clipAudioUrl(surah: number, ayah: number): string {
  return `https://verses.quran.com/Alafasy/mp3/${pad(surah)}${pad(ayah)}.mp3`;
}

/** Seconds of tail kept past the clip end so the last letter/madd isn't cut. */
const END_PAD = 0.1;

/* ── Store ──────────────────────────────────────────────────────────────── */

interface ClipState {
  /** Unique id for the active example (e.g. "u-1"), or null. */
  id: string | null;
  playing: boolean;
  /** 0..1 within the clip window. */
  progress: number;
}

const INITIAL: ClipState = { id: null, playing: false, progress: 0 };

let state: ClipState = INITIAL;
let audio: HTMLAudioElement | null = null;
let startSec = 0;
let endSec = 0;
let pendingSeek = false;
let raf = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function setState(patch: Partial<ClipState>) {
  state = { ...state, ...patch };
  emit();
}

function stopLoop() {
  if (raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
}

/** Drives progress and stops playback the moment the clip end is reached. */
function tick() {
  if (!audio) return;
  if (endSec > startSec) {
    if (audio.currentTime >= endSec + END_PAD) {
      audio.pause();
      setState({ playing: false, progress: 1 });
      stopLoop();
      return;
    }
    const p = (audio.currentTime - startSec) / (endSec - startSec);
    setState({ progress: Math.max(0, Math.min(1, p)) });
  }
  raf = requestAnimationFrame(tick);
}

function ensureAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined" || typeof Audio === "undefined") return null;
  if (audio) return audio;
  audio = new Audio();
  audio.preload = "auto";
  audio.addEventListener("play", () => {
    setState({ playing: true });
    stopLoop();
    raf = requestAnimationFrame(tick);
  });
  audio.addEventListener("pause", () => {
    setState({ playing: false });
    stopLoop();
  });
  audio.addEventListener("loadedmetadata", () => {
    if (!pendingSeek || !audio) return;
    pendingSeek = false;
    try {
      audio.currentTime = startSec;
    } catch {
      /* seek may be rejected pre-buffer; tick still guards the window */
    }
    audio.play().catch(() => undefined);
  });
  return audio;
}

/* ── Actions ────────────────────────────────────────────────────────────── */

/**
 * Toggle the clip for one example.
 *
 * - Same example + playing → pause
 * - Same example + paused → resume (restart from the clip start if it had ended)
 * - Different example → load the verse, seek to the clip start, and play
 */
export function toggleExampleClip(
  id: string,
  surah: number,
  ayah: number,
  clip: [number, number]
): void {
  const a = ensureAudio();
  if (!a) return;

  if (state.id === id) {
    if (a.paused) {
      if (a.currentTime >= endSec) {
        try {
          a.currentTime = startSec;
        } catch {
          /* ignore */
        }
        setState({ progress: 0 });
      }
      a.play().catch(() => undefined);
    } else {
      a.pause();
    }
    return;
  }

  // Different example: load the (possibly new) verse and seek once metadata is
  // in. We start play() synchronously here so the call stays inside the user
  // gesture (iOS Safari blocks a play() deferred to an async event); the actual
  // seek to the clip start is applied in the loadedmetadata handler, before any
  // audio is audible.
  a.pause();
  startSec = clip[0] / 1000;
  endSec = clip[1] / 1000;
  pendingSeek = true;
  a.src = clipAudioUrl(surah, ayah);
  setState({ id, playing: false, progress: 0 });
  a.load();
  a.play().catch(() => undefined);
}

/** Hard stop — used when the guide unmounts so audio doesn't bleed into another route. */
export function stopAllExampleClips(): void {
  stopLoop();
  if (audio && !audio.paused) audio.pause();
  setState({ id: null, playing: false, progress: 0 });
}

/* ── React hook ─────────────────────────────────────────────────────────── */

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return INITIAL;
}

/** Playback state scoped to one example id. */
export function useExampleClipState(
  id: string
): { playing: boolean; progress: number; isActive: boolean } {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isThis = snap.id === id;
  return {
    playing: isThis && snap.playing,
    progress: isThis ? snap.progress : 0,
    isActive: isThis,
  };
}
