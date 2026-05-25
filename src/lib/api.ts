import type {
  SurahEdition,
  AyahEdition,
  SearchResult,
  EditionInfo,
  QuranComVerseResponse,
} from "@/lib/types";
import { ARABIC_EDITION } from "@/lib/editions";

const API_BASE = "https://api.alquran.cloud/v1";
const QURAN_COM_API = "https://api.quran.com/api/v4";
const AUDIO_CDN = "https://cdn.islamic.network/quran/audio";
const AUDIO_BITRATE = 128;

interface ApiEnvelope<T> {
  code: number;
  status: string;
  data: T;
}

class QuranApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "QuranApiError";
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    next: { revalidate: 86400, ...(init as { next?: { revalidate?: number } })?.next },
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
  });

  if (!res.ok) {
    throw new QuranApiError(
      `Quran API request failed (${res.status}) for ${path}`,
      res.status
    );
  }

  const envelope = (await res.json()) as ApiEnvelope<T>;
  if (envelope.code !== 200) {
    throw new QuranApiError(
      `Quran API returned non-200 status (${envelope.code}) for ${path}: ${envelope.status}`,
      envelope.code
    );
  }
  return envelope.data;
}

export async function getSurahWithEditions(
  surahNumber: number,
  editions: string[] = [ARABIC_EDITION, "en.sahih"]
): Promise<SurahEdition[]> {
  if (surahNumber < 1 || surahNumber > 114) {
    throw new QuranApiError(`Invalid surah number ${surahNumber}`, 400);
  }
  const ids = editions.join(",");
  const data = await fetchJson<SurahEdition[] | SurahEdition>(
    `/surah/${surahNumber}/editions/${encodeURIComponent(ids)}`
  );
  return Array.isArray(data) ? data : [data];
}

export async function getAyahWithEditions(
  reference: string,
  editions: string[] = [ARABIC_EDITION, "en.sahih"]
): Promise<AyahEdition[]> {
  const ids = editions.join(",");
  const data = await fetchJson<AyahEdition[] | AyahEdition>(
    `/ayah/${encodeURIComponent(reference)}/editions/${encodeURIComponent(ids)}`
  );
  return Array.isArray(data) ? data : [data];
}

export async function searchQuran(
  query: string,
  edition = "en.sahih",
  surah: number | "all" = "all"
): Promise<SearchResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { count: 0, matches: [] };
  }
  const path = `/search/${encodeURIComponent(trimmed)}/${surah}/${encodeURIComponent(edition)}`;
  try {
    return await fetchJson<SearchResult>(path);
  } catch (err) {
    if (err instanceof QuranApiError && (err.status === 404 || err.status === 400)) {
      return { count: 0, matches: [] };
    }
    throw err;
  }
}

export async function listEditions(): Promise<EditionInfo[]> {
  return fetchJson<EditionInfo[]>("/edition");
}

/** 
 * Fetches accurate Word-by-Word data from Quran.com v4.
 * verseKey: "1:1", "2:255", etc.
 * lang: "ms" for Malay, "en" for English.
 */
export async function getAyahWbw(verseKey: string, lang = "en"): Promise<QuranComVerseResponse> {
  const url = `${QURAN_COM_API}/verses/by_key/${verseKey}?words=true&word_translation_language=${lang}`;
  const res = await fetch(url, {
    next: { revalidate: 86400 },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new QuranApiError(`Quran.com API request failed (${res.status}) for ${verseKey}`, res.status);
  }

  return (await res.json()) as QuranComVerseResponse;
}

export function audioUrlForAyah(globalAyahNumber: number, reciterId = "ar.alafasy"): string {
  return `${AUDIO_CDN}/${AUDIO_BITRATE}/${reciterId}/${globalAyahNumber}.mp3`;
}

export function audioUrlForSurah(surahNumber: number, reciterId = "ar.alafasy"): string {
  return `${AUDIO_CDN}-surah/${AUDIO_BITRATE}/${reciterId}/${surahNumber}.mp3`;
}

export { QuranApiError };
