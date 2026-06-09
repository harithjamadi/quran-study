import { promises as fs } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { getSurah } from "@/data/surahs";
import { BlitzRunner } from "@/components/BlitzRunner";

interface Params {
  params: Promise<{ surah: string }>;
}

async function loadTajweedSurah(n: number): Promise<Record<string, string> | null> {
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), "public", "data", "tajweed", `${n}.json`),
      "utf-8"
    );
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return null;
  }
}

export default async function BlitzSurahPage({ params }: Params) {
  const { surah: surahStr } = await params;
  const surahNumber = Number(surahStr);
  if (!Number.isFinite(surahNumber) || surahNumber < 1 || surahNumber > 114) notFound();

  const meta = getSurah(surahNumber);
  if (!meta) notFound();

  const tajweedSurah = await loadTajweedSurah(surahNumber);
  if (!tajweedSurah) notFound();

  return (
    <div className="max-w-lg mx-auto">
      <BlitzRunner
        surahNumber={surahNumber}
        surahName={meta.englishName}
        tajweedSurah={tajweedSurah}
      />
    </div>
  );
}
