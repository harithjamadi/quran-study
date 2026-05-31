import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SURAHS, getSurah } from "@/data/surahs";
import { getSurahWithEditions } from "@/lib/api";
import { ARABIC_EDITION } from "@/lib/editions";
import type { SurahEdition } from "@/lib/types";
import { SurahReaderClient } from "./SurahReaderClient";

// The default translation rendered on the server. Most visitors read English;
// those on another translation get the Arabic instantly and a quick swap.
const DEFAULT_TRANSLATION = "en.sahih";

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

  // Prefetch on the server so the reader paints immediately. This fetch is
  // cached (revalidate 86400) and statically generated for the default
  // translation, so the common path needs no client round-trip at all. If the
  // upstream API is unreachable, fall back to client-side loading.
  const initialTranslationId = translationParam || DEFAULT_TRANSLATION;
  let initialArabic: SurahEdition | null = null;
  let initialTrans: SurahEdition | null = null;
  try {
    const editions = await getSurahWithEditions(surahNumber, [
      ARABIC_EDITION,
      initialTranslationId,
    ]);
    initialArabic =
      editions.find((e) => e.edition?.identifier === ARABIC_EDITION) ?? editions[0] ?? null;
    initialTrans =
      editions.find((e) => e.edition?.identifier === initialTranslationId) ?? null;
  } catch {
    // Leave initial data null — the client will load it.
  }

  return (
    <SurahReaderClient
      surahNumber={surahNumber}
      meta={meta}
      translationParam={translationParam}
      initialArabic={initialArabic}
      initialTrans={initialTrans}
      initialTranslationId={initialTranslationId}
    />
  );
}
