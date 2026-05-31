/**
 * Singleton verse-audio player.
 *
 * Plays Mujawwad recitations from the Quran.com CDN. Only one verse plays at
 * a time across the whole app — every `PlayVerseButton` and the AudioTap
 * stage all subscribe to the same module-level state.
 *
 * Public surface:
 *   - {@link toggleVerseAudio}     play / pause / switch verse
 *   - {@link stopAllVerseAudio}    hard stop (used on stage navigation)
 *   - {@link useVerseAudioState}   React hook for play/progress per verse
 */

"use client";

import { useSyncExternalStore } from "react";

/* ── URL ────────────────────────────────────────────────────────────────── */

function pad(n: number) {
  return String(n).padStart(3, "0");
}

export function verseAudioUrl(surah: number, ayah: number): string {
  return `https://verses.quran.com/AbdulBaset/Mujawwad/mp3/${pad(surah)}${pad(ayah)}.mp3`;
}

/* ── Store ──────────────────────────────────────────────────────────────── */

interface VerseAudioState {
  /** "surah:ayah" for the currently-loaded track, or null. */
  key: string | null;
  playing: boolean;
  /** 0..1, derived from audio.currentTime / duration. */
  progress: number;
}

const INITIAL: VerseAudioState = { key: null, playing: false, progress: 0 };

let state: VerseAudioState = INITIAL;
let audio: HTMLAudioElement | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

/** Replace the snapshot reference so useSyncExternalStore detects the change. */
function setState(patch: Partial<VerseAudioState>) {
  state = { ...state, ...patch };
  emit();
}

function ensureAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined" || typeof Audio === "undefined") return null;
  if (audio) return audio;
  audio = new Audio();
  audio.addEventListener("play", () => setState({ playing: true }));
  audio.addEventListener("pause", () => setState({ playing: false }));
  audio.addEventListener("ended", () => setState({ playing: false, progress: 1 }));
  audio.addEventListener("timeupdate", () => {
    if (!audio || !audio.duration || !Number.isFinite(audio.duration)) return;
    setState({ progress: Math.min(1, audio.currentTime / audio.duration) });
  });
  return audio;
}

/* ── Actions ────────────────────────────────────────────────────────────── */

/**
 * Toggle audio for a specific verse.
 *
 * - Same verse + currently playing → pause
 * - Same verse + paused → resume (from current position, or restart if ended)
 * - Different verse → swap the source and start fresh
 */
export function toggleVerseAudio(surah: number, ayah: number): void {
  const a = ensureAudio();
  if (!a) return;
  const key = `${surah}:${ayah}`;

  if (state.key === key) {
    if (a.paused) {
      // If the track ran to the end, restart from 0 so re-tapping replays.
      if (a.duration && a.currentTime >= a.duration - 0.05) {
        a.currentTime = 0;
        setState({ progress: 0 });
      }
      a.play().catch(() => undefined);
    } else {
      a.pause();
    }
    return;
  }

  // Different verse: stop current, load new, play.
  a.pause();
  a.src = verseAudioUrl(surah, ayah);
  a.currentTime = 0;
  setState({ key, playing: false, progress: 0 });
  a.play().catch(() => undefined);
}

/** Hard stop. Used when navigating between stages so the next prompt starts silent. */
export function stopAllVerseAudio(): void {
  if (audio && !audio.paused) audio.pause();
  setState({ key: null, playing: false, progress: 0 });
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

/**
 * Returns playback state for one specific verse. Components re-render only
 * when *any* verse changes state, but the values returned are scoped — a
 * button for a different verse sees `playing: false, progress: 0`.
 */
export function useVerseAudioState(
  surah: number,
  ayah: number
): { playing: boolean; progress: number; isActive: boolean } {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isThis = snap.key === `${surah}:${ayah}`;
  return {
    playing: isThis && snap.playing,
    progress: isThis ? snap.progress : 0,
    isActive: isThis,
  };
}
