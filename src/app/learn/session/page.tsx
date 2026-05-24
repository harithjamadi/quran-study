import { promises as fs } from "node:fs";
import path from "node:path";
import { SessionClient } from "@/components/SessionClient";
import type { LemmaMeta } from "@/lib/learning";

async function readFrequency(): Promise<LemmaMeta[] | null> {
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), "public", "data", "lemma-frequency.json"),
      "utf-8"
    );
    return JSON.parse(raw) as LemmaMeta[];
  } catch (err) {
    console.error("[learn/session] failed to read frequency list:", err);
    return null;
  }
}

export default async function SessionPage() {
  const freq = await readFrequency();
  if (!freq) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm font-medium text-[color:var(--danger)]">
          Couldn’t load the frequency list.
        </p>
        <p className="text-xs text-[color:var(--muted)] mt-2">
          Run <code>node scripts/build-frequency.mjs</code> to regenerate{" "}
          <code>public/data/lemma-frequency.json</code>.
        </p>
      </div>
    );
  }

  return (
    <SessionClient
      freq={freq}
    />
  );
}
