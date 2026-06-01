/**
 * Singleton verse player for the tajweed guide's examples.
 *
 * Plays the whole verse an example is drawn from — in the reciter the learner
 * picks (a slower qari can be easier to follow) — and exposes a seekable
 * timeline (current time, duration, seek) so the guide can render an interactive
 * scrubber. Only one verse plays at a time across the guide; every player
 * subscribes to the same module-level state.
 */

"use client";

import { useSyncExternalStore } from "react";
import { audioUrlForAyah } from "@/lib/api";
import { globalAyahNumber } from "@/data/surahs";

/* ── URL ────────────────────────────────────────────────────────────────── */

function verseAudioUrl(surah: number, ayah: number, reciterId: string): string {
  return audioUrlForAyah(globalAyahNumber(surah, ayah), reciterId);
}

/* ── Store ──────────────────────────────────────────────────────────────── */

interface VerseState {
  /** Unique id for the active example (e.g. "u-1"), or null. */
  id: string | null;
  playing: boolean;
  /** Seconds. */
  currentTime: number;
  /** Seconds; 0 until metadata loads. */
  duration: number;
}

const INITIAL: VerseState = { id: null, playing: false, currentTime: 0, duration: 0 };

let state: VerseState = INITIAL;
let audio: HTMLAudioElement | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function setState(patch: Partial<VerseState>) {
  state = { ...state, ...patch };
  emit();
}

function ensureAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined" || typeof Audio === "undefined") return null;
  if (audio) return audio;
  audio = new Audio();
  audio.preload = "auto";
  audio.addEventListener("play", () => setState({ playing: true }));
  audio.addEventListener("pause", () => setState({ playing: false }));
  audio.addEventListener("ended", () => setState({ playing: false }));
  const syncDuration = () => {
    if (audio && Number.isFinite(audio.duration)) setState({ duration: audio.duration });
  };
  audio.addEventListener("loadedmetadata", syncDuration);
  audio.addEventListener("durationchange", syncDuration);
  audio.addEventListener("timeupdate", () => {
    if (audio) setState({ currentTime: audio.currentTime });
  });
  return audio;
}

/* ── Actions ────────────────────────────────────────────────────────────── */

/**
 * Toggle playback for one example's verse.
 *
 * - Same example + playing → pause
 * - Same example + paused → resume (restart if it had ended)
 * - Different example → load that verse and play from the start
 */
export function toggleExampleVerse(
  id: string,
  surah: number,
  ayah: number,
  reciterId = "ar.alafasy"
): void {
  const a = ensureAudio();
  if (!a) return;

  const url = verseAudioUrl(surah, ayah, reciterId);

  // Same example *and* same reciter → pause/resume in place.
  if (state.id === id && a.src === url) {
    if (a.paused) {
      if (a.duration && a.currentTime >= a.duration - 0.05) {
        a.currentTime = 0;
        setState({ currentTime: 0 });
      }
      a.play().catch(() => undefined);
    } else {
      a.pause();
    }
    return;
  }

  // New example, or the reciter changed → load the verse fresh from the start.
  a.pause();
  a.src = url;
  a.currentTime = 0;
  setState({ id, playing: false, currentTime: 0, duration: 0 });
  a.load();
  a.play().catch(() => undefined);
}

/** Seek the active example to a position (seconds). No-op if it isn't active. */
export function seekExampleVerse(id: string, seconds: number): void {
  if (!audio || state.id !== id) return;
  const dur = audio.duration || 0;
  const t = Math.max(0, Math.min(seconds, dur || seconds));
  audio.currentTime = t;
  setState({ currentTime: t });
}

/** Hard stop — used when cycling examples or when the guide unmounts. */
export function stopAllExampleVerses(): void {
  if (audio && !audio.paused) audio.pause();
  setState({ id: null, playing: false, currentTime: 0, duration: 0 });
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
export function useExampleVerseState(id: string): {
  playing: boolean;
  currentTime: number;
  duration: number;
  isActive: boolean;
} {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isThis = snap.id === id;
  return {
    playing: isThis && snap.playing,
    currentTime: isThis ? snap.currentTime : 0,
    duration: isThis ? snap.duration : 0,
    isActive: isThis,
  };
}
