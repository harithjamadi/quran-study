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
  const { translation } = await searchParams;
  const surahNumber = Number(number);
  const meta = getSurah(surahNumber);
  if (!meta) notFound();

  const translationId = translation ?? "en.sahih";

  let editions;
  try {
    editions = await getSurahWithEditions(surahNumber, [ARABIC_EDITION, translationId]);
  } catch {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-xl font-semibold mb-2">Couldn’t load this surah</h1>
        <p className="text-sm text-[color:var(--muted)]">
          The Quran API is unreachable. Check your connection and try again.
        </p>
      </div>
    );
  }

  const arabic = editions.find((e) => e.edition?.identifier === ARABIC_EDITION) ?? editions[0];
  const trans = editions.find((e) => e.edition?.identifier === translationId);

  return (
    <SurahReader
      meta={meta}
      arabic={arabic}
      translation={trans}
      translationId={translationId}
    >
      <SurahPager current={surahNumber} translationId={translationId} />
    </SurahReader>
  );
}
