import { notFound } from "next/navigation";
import { promises as fs } from "node:fs";
import path from "node:path";
import Link from "next/link";
import type { Metadata } from "next";
import { getSurah } from "@/data/surahs";
import type { RootOccurrence, RootIndex } from "@/lib/words";
import type { LemmaMeta } from "@/lib/learning";

interface Params {
  params: Promise<{ root: string }>;
  searchParams: Promise<{ lang?: string }>;
}

const DATA_DIR = path.join(process.cwd(), "public", "data");

function decodeParam(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function readRootData(root: string): Promise<RootOccurrence[] | null> {
  const filename = `${encodeURIComponent(root)}.json`;
  const file = path.join(DATA_DIR, "roots", filename);
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as RootOccurrence[];
  } catch {
    return null;
  }
}

async function readRootIndex(): Promise<RootIndex | null> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, "roots-index.json"), "utf-8");
    return JSON.parse(raw) as RootIndex;
  } catch {
    return null;
  }
}

async function readFrequency(): Promise<Map<string, LemmaMeta> | null> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, "lemma-frequency.json"), "utf-8");
    const list = JSON.parse(raw) as LemmaMeta[];
    return new Map(list.map(l => [l.lemma, l]));
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { root: rawRoot } = await params;
  const root = decodeParam(rawRoot);
  return {
    title: `Root ${root} — Quran word study`,
    description: `Every verse in the Quran where the Arabic root ${root} appears.`,
    alternates: { canonical: `/root/${encodeURIComponent(root)}` },
  };
}

export default async function RootPage({ params, searchParams }: Params) {
  const { root: rawRoot } = await params;
  const { lang = "en" } = await searchParams;
  const root = decodeParam(rawRoot);
  const [occurrences, index, freqMap] = await Promise.all([
    readRootData(root),
    readRootIndex(),
    readFrequency(),
  ]);
  if (!occurrences || occurrences.length === 0) notFound();

  const indexEntry = index?.[root];
  const lemmas = indexEntry?.lemmas ?? [];

  // Deduplicate by word form, keeping only the first occurrence of each unique text
  const seenForms = new Set<string>();
  const uniqueOccurrences: RootOccurrence[] = [];
  for (const o of occurrences) {
    if (!seenForms.has(o.text)) {
      seenForms.add(o.text);
      uniqueOccurrences.push(o);
    }
  }

  const bySurah = new Map<number, RootOccurrence[]>();
  for (const o of uniqueOccurrences) {
    if (!bySurah.has(o.s)) bySurah.set(o.s, []);
    bySurah.get(o.s)!.push(o);
  }
  const surahNumbers = Array.from(bySurah.keys()).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <header className="card p-6 sm:p-8 text-center">
        <p className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
          Arabic root
        </p>
        <h1
          className="arabic text-5xl sm:text-6xl mt-2 text-[color:var(--accent-strong)]"
          lang="ar"
          dir="rtl"
        >
          {root}
        </h1>
        <p className="text-sm text-[color:var(--muted)] mt-3">
          {occurrences.length} {occurrences.length === 1 ? "occurrence" : "occurrences"}
          {" · "}
          {uniqueOccurrences.length} unique {uniqueOccurrences.length === 1 ? "form" : "forms"}
        </p>
        {lemmas.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-[color:var(--muted)]">Forms:</span>
            {lemmas.slice(0, 12).map((l) => (
              <span
                key={l}
                className="arabic text-base rounded-full border border-[color:var(--border)] px-3 py-0.5"
                lang="ar"
                dir="rtl"
              >
                {l}
              </span>
            ))}
            {lemmas.length > 12 && (
              <span className="text-xs text-[color:var(--muted)]">
                +{lemmas.length - 12} more
              </span>
            )}
          </div>
        )}
      </header>

      <div className="space-y-5">
        {surahNumbers.map((s) => {
          const meta = getSurah(s);
          const items = bySurah.get(s)!;
          return (
            <section key={s} className="card p-5 sm:p-6">
              <header className="flex items-baseline justify-between gap-3 mb-3">
                <h2 className="text-sm font-semibold">
                  <Link
                    href={`/surah/${s}`}
                    className="hover:underline"
                  >
                    {s}. {meta?.englishName ?? `Surah ${s}`}
                  </Link>
                  {meta && (
                    <span className="ml-2 text-[color:var(--muted)] text-xs font-normal">
                      {meta.englishNameTranslation}
                    </span>
                  )}
                </h2>
                <span className="text-xs text-[color:var(--muted)]">
                  {items.length} {items.length === 1 ? "form" : "forms"}
                </span>
              </header>
              <ul className="divide-y divide-[color:var(--border)]">
                {items.map((o, idx) => {
                  const meta = o.lemma ? freqMap?.get(o.lemma) : null;
                  const gloss = lang === "ms"
                    ? (meta?.ms || o.glossMs || o.gloss)
                    : o.gloss;

                  return (
                    <li key={idx} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-baseline justify-between gap-3 mb-1">
                        <div className="flex items-baseline gap-2">
                          <Link
                            href={`/surah/${o.s}#v${o.a}`}
                            className="text-xs text-[color:var(--muted)] hover:text-[color:var(--foreground)] hover:underline"
                          >
                            {o.s}:{o.a}
                          </Link>
                          <span className="text-[10px] text-[color:var(--muted)]/60 italic">first occ.</span>
                        </div>
                        {o.lemma && (
                          <span
                            className="arabic text-[color:var(--muted)] text-sm"
                            lang="ar"
                            dir="rtl"
                          >
                            {o.lemma}
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline justify-between gap-4 flex-wrap">
                        <p
                          className="arabic text-2xl text-[color:var(--accent-strong)]"
                          lang="ar"
                          dir="rtl"
                        >
                          {o.text}
                        </p>
                        {gloss && (
                          <p className="text-sm text-[color:var(--foreground)]/85">
                            {gloss}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="text-center text-xs text-[color:var(--muted)]">
        Morphology data from the{" "}
        <a
          className="underline hover:text-[color:var(--foreground)]"
          href="http://corpus.quran.com"
          target="_blank"
          rel="noreferrer"
        >
          Quranic Arabic Corpus
        </a>
        .
      </p>
    </div>
  );
}
