// Loader for the static lemma-frequency dataset built by scripts/build-frequency.mjs.

import type { CoverageData, LemmaMeta } from "@/lib/learning";

const FETCH_TIMEOUT_MS = 15_000;

// Cached promises only for SUCCESSFUL loads. A null result clears the cache
// so the next attempt actually retries instead of returning the failed null.
let lemmaPromise: Promise<LemmaMeta[] | null> | null = null;
let coveragePromise: Promise<CoverageData | null> | null = null;

async function fetchJson<T>(url: string): Promise<T | null> {
  const t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
  console.info(`[frequency] fetching ${url}`);
  try {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS) : null;
    const res = await fetch(url, ctrl ? { signal: ctrl.signal } : undefined);
    if (timer) clearTimeout(timer);
    if (!res.ok) {
      console.warn(`[frequency] ${url} → HTTP ${res.status}`);
      return null;
    }
    const json = (await res.json()) as T;
    const dt = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
    console.info(`[frequency] ${url} loaded in ${dt.toFixed(0)} ms`);
    return json;
  } catch (err) {
    console.warn(`[frequency] ${url} failed`, err);
    return null;
  }
}

export function loadLemmaFrequency(): Promise<LemmaMeta[] | null> {
  if (lemmaPromise) return lemmaPromise;
  const p = fetchJson<LemmaMeta[]>("/data/lemma-frequency.json").then((v) => {
    if (v === null) lemmaPromise = null; // allow retry
    return v;
  });
  lemmaPromise = p;
  return p;
}

export function loadCoverage(): Promise<CoverageData | null> {
  if (coveragePromise) return coveragePromise;
  const p = fetchJson<CoverageData>("/data/coverage.json").then((v) => {
    if (v === null) coveragePromise = null;
    return v;
  });
  coveragePromise = p;
  return p;
}

export interface RootOccurrence {
  s: number;
  a: number;
  i: number;
  text: string;
  lemma: string;
  gloss: string;
}

export function loadRootOccurrences(root: string): Promise<RootOccurrence[] | null> {
  const encoded = encodeURIComponent(root);
  return fetchJson<RootOccurrence[]>(`/data/roots/${encoded}.json`);
}

export function _resetFrequencyCaches() {
  lemmaPromise = null;
  coveragePromise = null;
}

/** Build the audio URL Quran.com serves for a single Quranic word. */
export function lemmaAudioUrl(surah: number, ayah: number, wordIndex: number): string {
  const pad = (n: number) => String(n).padStart(3, "0");
  return `https://audio.qurancdn.com/wbw/${pad(surah)}_${pad(ayah)}_${pad(wordIndex)}.mp3`;
}
