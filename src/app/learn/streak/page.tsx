import { promises as fs } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { getSurah } from "@/data/surahs";
import { StreakRunner } from "@/components/StreakRunner";

export const metadata: Metadata = {
  title: "Rule Streak",
  description: "Cross-surah tajweed chain challenge — don't break the streak.",
};

// Surahs with good rule density across different categories.
const STREAK_SURAHS = [2, 18, 36, 67, 78, 112, 113, 114];

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

export default async function StreakPage() {
  const surahs = (
    await Promise.all(
      STREAK_SURAHS.map(async (n) => {
        const meta = getSurah(n);
        const tajweedSurah = await loadTajweedSurah(n);
        if (!meta || !tajweedSurah) return null;
        return { surahNumber: n, surahName: meta.englishName, tajweedSurah };
      })
    )
  ).filter((s): s is NonNullable<typeof s> => s !== null);

  return (
    <div className="max-w-lg mx-auto">
      <StreakRunner surahs={surahs} />
    </div>
  );
}
