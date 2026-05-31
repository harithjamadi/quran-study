import { promises as fs } from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import type { LemmaMeta } from "@/lib/learning";

// WordPopover only needs one lemma's metadata (for its fallback gloss), but the
// full frequency dataset is ~1.1 MB. Shipping that to the browser on the first
// word tap is wasteful, so we read + index it once per server instance and
// serve single entries from here instead.

let indexPromise: Promise<Map<string, LemmaMeta>> | null = null;

function loadIndex(): Promise<Map<string, LemmaMeta>> {
  if (!indexPromise) {
    indexPromise = (async () => {
      const filepath = path.join(process.cwd(), "public", "data", "lemma-frequency.json");
      const raw = await fs.readFile(filepath, "utf-8");
      const list = JSON.parse(raw) as LemmaMeta[];
      const map = new Map<string, LemmaMeta>();
      for (const entry of list) map.set(entry.lemma, entry);
      return map;
    })().catch((err) => {
      // Reset so a transient read failure can be retried on the next request.
      indexPromise = null;
      throw err;
    });
  }
  return indexPromise;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ lemma: string }> }
) {
  const { lemma } = await ctx.params;

  try {
    const index = await loadIndex();
    const meta = index.get(lemma);
    if (!meta) {
      return new Response(JSON.stringify({ error: "lemma not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(meta), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "failed to load lemma data" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
