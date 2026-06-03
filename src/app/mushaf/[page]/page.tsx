import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MushafReader } from "@/components/MushafReader";
import { TOTAL_PAGES } from "@/lib/mushaf";

interface Params {
  params: Promise<{ page: string }>;
}

export function generateStaticParams() {
  return Array.from({ length: TOTAL_PAGES }, (_, i) => ({ page: String(i + 1) }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { page } = await params;
  const n = Number(page);
  return {
    title: `Mushaf — Page ${n}`,
    description: `Read the Quran in the Madani mushaf, page ${n} of ${TOTAL_PAGES}.`,
    alternates: { canonical: `/mushaf/${n}` },
  };
}

export default async function MushafPage({ params }: Params) {
  const { page } = await params;
  const n = Number(page);
  if (!Number.isInteger(n) || n < 1 || n > TOTAL_PAGES) notFound();
  return <MushafReader initialPage={n} />;
}
