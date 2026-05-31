import { promises as fs } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { TajweedQuestRunner } from "@/components/TajweedQuestRunner";
import { getSurah } from "@/data/surahs";

interface Params {
  params: Promise<{ surah: string }>;
  searchParams: Promise<{ d?: string }>;
}

async function loadTajweedSurah(
  surahNumber: number
): Promise<Record<string, string> | null> {
  const file = path.join(
    process.cwd(),
    "public",
    "data",
    "tajweed",
    `${surahNumber}.json`
  );
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as Record<string, string>;
  } catch (err) {
    console.error("[quest/tajweed] failed to load:", err);
    return null;
  }
}

export default async function TajweedQuestPage({ params, searchParams }: Params) {
  const [{ surah: surahStr }, { d }] = await Promise.all([params, searchParams]);
  const surahNumber = Number(surahStr);
  if (!Number.isFinite(surahNumber) || surahNumber < 1 || surahNumber > 114) notFound();

  const difficulty = Math.max(1, Math.min(3, Number(d) || 1)) as 1 | 2 | 3;
  const meta = getSurah(surahNumber);
  if (!meta) notFound();

  const tajweedSurah = await loadTajweedSurah(surahNumber);
  if (!tajweedSurah) notFound();

  return (
    <TajweedQuestRunner
      surahNumber={surahNumber}
      surahName={meta.englishName}
      tajweedSurah={tajweedSurah}
      difficulty={difficulty}
    />
  );
}
