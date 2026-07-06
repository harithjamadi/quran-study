// Server-side only: called from wirid page server components.
import { promises as fs } from "fs";
import path from "path";
import { getSurahWithEditions } from "@/lib/api";
import { ARABIC_EDITION } from "@/lib/editions";
import type { SurahEdition } from "@/lib/types";
import type { WiridItem } from "@/data/wirid";
import { uniqueSurahs } from "@/data/wirid";

/** One ayah of a wirid passage, with both app translations resolved. */
export interface WiridAyahPayload {
  numberInSurah: number;
  arabic: string;
  en: string;
  ms: string;
}

/** Ayahs keyed by passage id. A missing key means that surah failed to load
 *  (upstream API unreachable) — the client renders a retry hint instead. */
export type WiridPassages = Record<string, WiridAyahPayload[]>;

const WIRID_EDITIONS = [ARABIC_EDITION, "en.sahih", "ms.basmeih"];

/** Retry once — build-time prerendering fires many parallel requests and a
 *  transient upstream failure would otherwise freeze into the static page
 *  until the next revalidation. */
async function getSurahWithRetry(n: number): Promise<SurahEdition[]> {
  try {
    return await getSurahWithEditions(n, WIRID_EDITIONS);
  } catch {
    await new Promise((r) => setTimeout(r, 500));
    return getSurahWithEditions(n, WIRID_EDITIONS);
  }
}

/** The repo ships the full Uthmani corpus for ayah recognition — reuse it as
 *  an offline Arabic fallback so a wirid passage can never be missing its
 *  Quran text, even when the translation API is down at build time. */
let corpusPromise: Promise<Map<string, string> | null> | null = null;
function loadLocalCorpus(): Promise<Map<string, string> | null> {
  if (!corpusPromise) {
    corpusPromise = fs
      .readFile(path.join(process.cwd(), "public", "data", "corpus", "ayat.json"), "utf8")
      .then((raw) => {
        const entries = JSON.parse(raw) as { key: string; text: string }[];
        return new Map(entries.map((a) => [a.key, a.text]));
      })
      .catch(() => null);
  }
  return corpusPromise;
}

/**
 * Fetch every Quranic passage a routine needs in one batched pass: each
 * unique surah is requested once (cached 24h, shared with the surah reader)
 * and sliced into the routine's ayah ranges server-side, so the client only
 * ever receives the ayat it renders.
 */
export async function fetchWiridPassages(items: readonly WiridItem[]): Promise<WiridPassages> {
  const surahNumbers = uniqueSurahs(items);

  const surahs = new Map<number, SurahEdition[]>();
  await Promise.all(
    surahNumbers.map(async (n) => {
      try {
        surahs.set(n, await getSurahWithRetry(n));
      } catch {
        // Leave unset — these passages fall back to the local corpus below.
      }
    })
  );

  const passages: WiridPassages = {};
  let corpus: Map<string, string> | null | undefined;

  for (const item of items) {
    if (item.kind !== "quran") continue;
    const editions = surahs.get(item.surah);
    const arabic = editions?.find((e) => e.edition?.identifier === ARABIC_EDITION);
    const en = editions?.find((e) => e.edition?.identifier === "en.sahih");
    const ms = editions?.find((e) => e.edition?.identifier === "ms.basmeih");

    const ayahs: WiridAyahPayload[] = [];
    for (let n = item.from; n <= item.to; n++) {
      const a = arabic?.ayahs.find((x) => x.numberInSurah === n);
      let text = a?.text;
      if (!text) {
        if (corpus === undefined) corpus = await loadLocalCorpus();
        text = corpus?.get(`${item.surah}:${n}`);
      }
      if (!text) continue;
      ayahs.push({
        numberInSurah: n,
        arabic: text,
        en: en?.ayahs.find((x) => x.numberInSurah === n)?.text ?? "",
        ms: ms?.ayahs.find((x) => x.numberInSurah === n)?.text ?? "",
      });
    }
    if (ayahs.length > 0) passages[item.id] = ayahs;
  }
  return passages;
}
