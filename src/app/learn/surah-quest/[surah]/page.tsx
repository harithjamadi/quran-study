import { promises as fs } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { SurahQuestRunner } from "@/components/SurahQuestRunner";
import { getSurah } from "@/data/surahs";
import type { LemmaMeta } from "@/lib/learning";

interface Params {
  params: Promise<{ surah: string }>;
}

/**
 * For a surah, pick the highest-frequency unique lemmas (by their global
 * count) that actually appear in that surah. Returns LemmaMeta entries
 * keyed against the surah's first occurrence of each lemma so the
 * sampleText we show comes from THIS surah's verses.
 */
async function loadSurahQuestData(surahNumber: number): Promise<{
  surahName: string;
  lemmas: LemmaMeta[];
  ayahWords: Record<string, string[]>;
} | null> {
  const meta = getSurah(surahNumber);
  if (!meta) return null;
  const root = path.join(process.cwd(), "public", "data");
  try {
    const [wordsRaw, freqRaw] = await Promise.all([
      fs.readFile(path.join(root, "words", `${surahNumber}.json`), "utf-8"),
      fs.readFile(path.join(root, "lemma-frequency.json"), "utf-8"),
    ]);
    const wordsBySurah = JSON.parse(wordsRaw) as Record<
      string,
      { i: number; text: string; translit: string | null; gloss: string | null; root: string | null; lemma: string | null; pos: string | null }[]
    >;
    const freq = JSON.parse(freqRaw) as LemmaMeta[];

    // Map of every unique lemma in this surah → its first occurrence.
    const firstByLemma = new Map<
      string,
      { ayah: number; word: { i: number; text: string; translit: string | null } }
    >();
    for (const ayahKey of Object.keys(wordsBySurah)) {
      const ayah = Number(ayahKey);
      for (const w of wordsBySurah[ayahKey]) {
        if (!w.lemma) continue;
        if (firstByLemma.has(w.lemma)) continue;
        firstByLemma.set(w.lemma, { ayah, word: { i: w.i, text: w.text, translit: w.translit } });
      }
    }

    // Sort by global frequency, take top 5 that have a Malay or English gloss.
    const ranked: LemmaMeta[] = [];
    for (const meta of freq) {
      const first = firstByLemma.get(meta.lemma);
      if (!first) continue;
      if (!meta.en && !meta.ms) continue;
      ranked.push({
        ...meta,
        sampleSurah: surahNumber,
        sampleAyah: first.ayah,
        sampleWord: first.word.i,
        sampleText: first.word.text,
        translit: first.word.translit ?? meta.translit,
      });
      if (ranked.length >= 5) break;
    }
    if (ranked.length < 4) return null;

    // Collect word arrays only for the ayahs the quest lemmas reference.
    const neededAyahs = new Set(ranked.map((l) => String(l.sampleAyah)));
    const ayahWords: Record<string, string[]> = {};
    for (const ayahKey of neededAyahs) {
      if (wordsBySurah[ayahKey]) {
        ayahWords[ayahKey] = wordsBySurah[ayahKey].map((w) => w.text);
      }
    }

    return { surahName: meta.englishName, lemmas: ranked, ayahWords };
  } catch (err) {
    console.error("[quest/surah] failed to load:", err);
    return null;
  }
}

export default async function SurahQuestPage({ params }: Params) {
  const { surah: surahStr } = await params;
  const surahNumber = Number(surahStr);
  if (!Number.isFinite(surahNumber) || surahNumber < 1 || surahNumber > 114) notFound();

  const data = await loadSurahQuestData(surahNumber);
  if (!data) notFound();

  return (
    <SurahQuestRunner
      surahNumber={surahNumber}
      surahName={data.surahName}
      lemmas={data.lemmas}
      ayahWords={data.ayahWords}
    />
  );
}
