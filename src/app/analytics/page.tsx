import { promises as fs } from "node:fs";
import path from "node:path";
import { AnalyticsClient } from "@/components/AnalyticsClient";
import type { LemmaMeta } from "@/lib/learning";

export default async function AnalyticsPage() {
  let freq: LemmaMeta[];
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), "public", "data", "lemma-frequency.json"),
      "utf-8"
    );
    freq = JSON.parse(raw) as LemmaMeta[];
  } catch {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm font-medium text-[color:var(--danger)]">
          Could not load analytics data.
        </p>
      </div>
    );
  }

  return <AnalyticsClient freq={freq} />;
}
