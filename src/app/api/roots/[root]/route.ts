import { promises as fs } from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";

// Files in public/data/roots/ are named with URL-encoded Arabic (e.g.
// `%D9%82%D9%88%D9%84.json` for قول). Next 16's static asset layer rejects
// percent-encoded paths from the browser, so we proxy reads through this
// route handler. Dynamic route params come in URL-decoded, and we re-encode
// to match the on-disk filename.

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ root: string }> }
) {
  const { root } = await ctx.params;
  const filename = encodeURIComponent(root) + ".json";
  const filepath = path.join(process.cwd(), "public", "data", "roots", filename);

  try {
    const data = await fs.readFile(filepath, "utf-8");
    return new Response(data, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "root not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}
