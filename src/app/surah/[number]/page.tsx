import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SURAHS, getSurah } from "@/data/surahs";
import { getSurahWithEditions } from "@/lib/api";
import { ARABIC_EDITION } from "@/lib/editions";
import { SurahReader } from "@/components/SurahReader";
import { SurahPager } from "@/components/SurahPager";

interface Params {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ translation?: string }>;
}

export async function generateStaticParams() {
  return SURAHS.map((s) => ({ number: String(s.number) }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { number } = await params;
  const meta = getSurah(Number(number));
  if (!meta) return { title: "Surah not found" };
  return {
    title: `${meta.englishName} (${meta.englishNameTranslation})`,
    description: `Read Surah ${meta.englishName} — ${meta.numberOfAyahs} verses, ${meta.revelationType}.`,
    alternates: { canonical: `/surah/${meta.number}` },
  };
}

export default async function SurahPage({ params, searchParams }: Params) {
  const { number } = await params;
  const { translation: translationParam } = await searchParams;
  const surahNumber = Number(number);
  const meta = getSurah(surahNumber);
  if (!meta) notFound();

  return (
    <SurahReaderWrapper
      surahNumber={surahNumber}
      meta={meta}
      translationParam={translationParam}
    />
  );
}

// Client wrapper to read persisted settings
import { SurahReaderClient } from "./SurahReaderClient";

function SurahReaderWrapper({ 
  surahNumber, 
  meta, 
  translationParam 
}: { 
  surahNumber: number; 
  meta: any; 
  translationParam?: string;
}) {
  return (
    <SurahReaderClient 
      surahNumber={surahNumber}
      meta={meta}
      translationParam={translationParam}
    />
  );
}
