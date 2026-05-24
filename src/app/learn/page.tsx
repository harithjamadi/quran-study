import { promises as fs } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { LearnDashboard } from "@/components/LearnDashboard";
import { LearnPageHeader } from "@/components/LearnPageHeader";
import type { CoverageData, LemmaMeta } from "@/lib/learning";

export const metadata: Metadata = {
  title: "Learn",
  description: "Memorise the most common words in the Quran.",
};

async function loadLearnData() {
  try {
    const [freqRaw, coverageRaw] = await Promise.all([
      fs.readFile(
        path.join(process.cwd(), "public", "data", "lemma-frequency.json"),
        "utf-8"
      ),
      fs.readFile(
        path.join(process.cwd(), "public", "data", "coverage.json"),
        "utf-8"
      ),
    ]);
    const freq = JSON.parse(freqRaw) as LemmaMeta[];
    const coverage = JSON.parse(coverageRaw) as CoverageData;
    return {
      preview: freq.slice(0, 500),
      coverage,
      totalLemmas: freq.length,
    };
  } catch (err) {
    console.error("[learn] failed to load data:", err);
    return null;
  }
}

export default async function LearnPage() {
  const data = await loadLearnData();

  return (
    <div className="space-y-6">
      <LearnPageHeader />
      {data ? (
        <LearnDashboard
          previewLemmas={data.preview}
          coverage={data.coverage}
        />
      ) : (
        <div className="card p-8 text-center">
          <p className="text-sm font-medium text-[color:var(--danger)]">
            Couldn’t load the learning dataset.
          </p>
          <p className="text-xs text-[color:var(--muted)] mt-2 leading-relaxed">
            Run <code>node scripts/build-frequency.mjs</code> to regenerate{" "}
            <code>public/data/lemma-frequency.json</code> and{" "}
            <code>public/data/coverage.json</code>, then reload.
          </p>
        </div>
      )}
    </div>
  );
}
