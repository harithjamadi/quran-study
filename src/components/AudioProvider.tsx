"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { audioUrlForAyah } from "@/lib/api";
import { useSettings } from "@/store/settings";

export interface PlayTarget {
  surahNumber: number;
  ayahNumber: number;
  globalAyahNumber: number;
  surahName: string;
}

interface AudioContextValue {
  current: PlayTarget | null;
  playing: boolean;
  loading: boolean;
  error: string | null;
  duration: number;
  position: number;
  playAyah: (t: PlayTarget) => void;
  toggle: () => void;
  stop: () => void;
  seek: (sec: number) => void;
  setQueue: (q: PlayTarget[]) => void;
  next: () => void;
  prev: () => void;
}

const Ctx = createContext<AudioContextValue | null>(null);

export function useAudio(): AudioContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAudio must be used within AudioProvider");
  return ctx;
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const reciterId = useSettings((s) => s.reciterId);
  const autoplayNext = useSettings((s) => s.autoplayNext);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<PlayTarget | null>(null);
  const [queue, setQueueState] = useState<PlayTarget[]>([]);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = new Audio();
    el.preload = "auto";
    audioRef.current = el;
    const onLoaded = () => {
      setDuration(el.duration || 0);
      setLoading(false);
    };
    const onTime = () => setPosition(el.currentTime || 0);
    const onEnd = () => {
      setPlaying(false);
      setPosition(0);
    };
    const onErr = () => {
      setLoading(false);
      setPlaying(false);
      setError("Could not load audio. Check your connection or try a different reciter.");
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnd);
    el.addEventListener("error", onErr);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("canplay", onCanPlay);

    return () => {
      el.pause();
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnd);
      el.removeEventListener("error", onErr);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("canplay", onCanPlay);
      audioRef.current = null;
    };
  }, []);

  const playAyah = useCallback(
    (t: PlayTarget) => {
      const el = audioRef.current;
      if (!el) return;
      setError(null);
      setLoading(true);
      setCurrent(t);
      el.src = audioUrlForAyah(t.globalAyahNumber, reciterId);
      el.currentTime = 0;
      const p = el.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          setLoading(false);
          setPlaying(false);
          setError("Tap play again — the browser blocked autoplay.");
        });
      }
    },
    [reciterId]
  );

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el || !current) return;
    if (el.paused) {
      void el.play().catch(() => undefined);
    } else {
      el.pause();
    }
  }, [current]);

  const stop = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    setCurrent(null);
    setQueueState([]);
    setPosition(0);
    setPlaying(false);
  }, []);

  const seek = useCallback((sec: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(sec, el.duration || sec));
  }, []);

  const setQueue = useCallback((q: PlayTarget[]) => {
    setQueueState(q);
  }, []);

  const findInQueue = useCallback(
    (offset: number): PlayTarget | null => {
      if (!current || queue.length === 0) return null;
      const idx = queue.findIndex(
        (q) =>
          q.surahNumber === current.surahNumber && q.ayahNumber === current.ayahNumber
      );
      if (idx === -1) return null;
      const target = queue[idx + offset];
      return target ?? null;
    },
    [current, queue]
  );

  const next = useCallback(() => {
    const t = findInQueue(1);
    if (t) playAyah(t);
  }, [findInQueue, playAyah]);

  const prev = useCallback(() => {
    const t = findInQueue(-1);
    if (t) playAyah(t);
  }, [findInQueue, playAyah]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onEnded = () => {
      if (!autoplayNext) return;
      const t = findInQueue(1);
      if (t) playAyah(t);
    };
    el.addEventListener("ended", onEnded);
    return () => el.removeEventListener("ended", onEnded);
  }, [autoplayNext, findInQueue, playAyah]);

  const value = useMemo<AudioContextValue>(
    () => ({
      current,
      playing,
      loading,
      error,
      duration,
      position,
      playAyah,
      toggle,
      stop,
      seek,
      setQueue,
      next,
      prev,
    }),
    [current, playing, loading, error, duration, position, playAyah, toggle, stop, seek, setQueue, next, prev]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
