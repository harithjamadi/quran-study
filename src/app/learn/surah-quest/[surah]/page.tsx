import { promises as fs } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { SurahQuestRunner } from "@/components/SurahQuestRunner";
import { getSurah } from "@/data/surahs";
import type { LemmaMeta } from "@/lib/learning";

interface Params {
  params: Promise<{ surah: string }>;
  searchParams: Promise<{ d?: string }>;
}

/**
 * For a surah, pick lemmas that are most *exclusive* to that surah.
 * Exclusivity score = (occurrences in this surah) / (total Quran occurrences).
 * A score of 1.0 means the word appears ONLY in this surah; a score near 0
 * means it's a common word shared across hundreds of surahs.
 * This ensures each quest teaches vocabulary that is characteristic of the
 * specific surah rather than generic high-frequency Arabic words.
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

    // First pass: track each lemma's first occurrence and count how many
    // times it appears in THIS surah.
    const firstByLemma = new Map<
      string,
      { ayah: number; word: { i: number; text: string; translit: string | null } }
    >();
    const surahCount = new Map<string, number>();
    for (const ayahKey of Object.keys(wordsBySurah)) {
      const ayah = Number(ayahKey);
      for (const w of wordsBySurah[ayahKey]) {
        if (!w.lemma) continue;
        surahCount.set(w.lemma, (surahCount.get(w.lemma) ?? 0) + 1);
        if (!firstByLemma.has(w.lemma)) {
          firstByLemma.set(w.lemma, { ayah, word: { i: w.i, text: w.text, translit: w.translit } });
        }
      }
    }

    // Build a fast lemma → meta lookup from the global frequency list.
    const freqByLemma = new Map<string, LemmaMeta>();
    for (const m of freq) freqByLemma.set(m.lemma, m);

    // Score each lemma by exclusivity = surahOccurrences / globalOccurrences.
    // High score → this word is characteristic of THIS surah.
    type Candidate = { meta: LemmaMeta; first: NonNullable<ReturnType<typeof firstByLemma.get>>; score: number };
    const candidates: Candidate[] = [];
    for (const [lemma, sc] of surahCount) {
      const m = freqByLemma.get(lemma);
      const first = firstByLemma.get(lemma);
      if (!m || !first) continue;
      if (!m.en && !m.ms) continue;
      // Skip pure grammatical particles (prepositions, conjunctions, pronouns
      // tagged P) — they have no stand-alone meaning worth memorising.
      if (m.pos === "P") continue;
      candidates.push({ meta: m, first, score: sc / m.count });
    }
    candidates.sort((a, b) => b.score - a.score);

    const ranked: LemmaMeta[] = candidates.slice(0, 5).map(({ meta: m, first }) => ({
      ...m,
      sampleSurah: surahNumber,
      sampleAyah: first.ayah,
      sampleWord: first.word.i,
      sampleText: first.word.text,
      translit: first.word.translit ?? m.translit,
    }));
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

export default async function SurahQuestPage({ params, searchParams }: Params) {
  const [{ surah: surahStr }, { d }] = await Promise.all([params, searchParams]);
  const surahNumber = Number(surahStr);
  if (!Number.isFinite(surahNumber) || surahNumber < 1 || surahNumber > 114) notFound();

  const difficulty = (Math.max(1, Math.min(3, Number(d) || 1))) as 1 | 2 | 3;

  const data = await loadSurahQuestData(surahNumber);
  if (!data) notFound();

  return (
    <SurahQuestRunner
      surahNumber={surahNumber}
      surahName={data.surahName}
      lemmas={data.lemmas}
      ayahWords={data.ayahWords}
      difficulty={difficulty}
    />
  );
}
