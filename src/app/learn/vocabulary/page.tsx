import { promises as fs } from "node:fs";
import path from "node:path";
import { VocabularyClient } from "@/components/VocabularyClient";
import type { LemmaMeta } from "@/lib/learning";

async function readFrequency(): Promise<LemmaMeta[] | null> {
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), "public", "data", "lemma-frequency.json"),
      "utf-8"
    );
    return JSON.parse(raw) as LemmaMeta[];
  } catch (err) {
    console.error("[learn/vocabulary] failed to read frequency list:", err);
    return null;
  }
}

export default async function VocabularyPage() {
  const freq = await readFrequency();
  if (!freq) {
    return (
      <div className="card p-8 text-center text-[color:var(--danger)]">
        Could not load frequency data.
      </div>
    );
  }

  return <VocabularyClient freq={freq} />;
}
