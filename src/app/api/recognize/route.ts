import { generateText } from "ai";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Server-side ayah recognition. The client posts a single captured/uploaded
 * frame as raw image bytes (Content-Type: image/*); a vision model transcribes
 * the Arabic, and the client then resolves that text to a verse against the
 * closed corpus. The image is processed in memory and never stored or logged.
 *
 * The route is public and each call costs money, so it is guarded: image-only
 * content type, a hard byte cap, and a per-client rate limit (see rate-limit.ts
 * for its per-instance best-effort caveat). This runs on the Node runtime
 * (the default) — it needs Buffer-sized request bodies, not the edge.
 */

/** Hard upload cap. A JPEG of a mushaf page is well under 1 MB; the ceiling
 *  guards model spend and server memory against pathological posts. */
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/** Gateway model string (Vercel AI Gateway is the default provider). Haiku is
 *  the cheap, fast vision default; override to a stronger model via env if
 *  Uthmani accuracy needs it. */
const MODEL = process.env.RECOGNIZE_VISION_MODEL ?? "anthropic/claude-haiku-4.5";

const SYSTEM = [
  "You are an OCR engine for Qur'anic Arabic in the Uthmani (mushaf) script.",
  "Transcribe ONLY the Arabic Qur'an text visible in the image, exactly as written, with its diacritics.",
  "Do not translate, transliterate, explain, or add verse numbers, surah headers, or any other words.",
  "If the image has no readable Arabic Qur'an text, reply with an empty response.",
].join(" ");

/** Coarse per-client key from x-forwarded-for. NOTE: the left-most entry is
 *  client-supplied and therefore spoofable — an attacker rotating the header
 *  bypasses per-key limiting. This is a first line of defence only; the real
 *  billing guard is the provider spend cap plus the hard image-size ceiling.
 *  A deployment behind a trusted proxy should key on the proxy-verified client
 *  IP instead (configure via infra, not this header). */
function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "anonymous";
}

/**
 * Read the request body while enforcing a hard byte ceiling, so a body sent
 * without a truthful Content-Length can't force us to buffer it all before the
 * size check. Returns null once the stream exceeds `max`.
 */
async function readCapped(req: Request, max: number): Promise<Uint8Array | null> {
  const reader = req.body?.getReader();
  if (!reader) {
    const buf = new Uint8Array(await req.arrayBuffer());
    return buf.byteLength > max ? null : buf;
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return Response.json({ error: "bad-image" }, { status: 415 });
  }

  // Reject an oversized upload from its declared length before buffering it.
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) {
    return Response.json({ error: "too-large" }, { status: 413 });
  }

  const limit = rateLimit(clientKey(req));
  if (!limit.ok) {
    return Response.json(
      { error: "rate-limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  // Enforce the real size while reading — a missing/untruthful Content-Length
  // must not let us buffer an unbounded body first.
  const bytes = await readCapped(req, MAX_IMAGE_BYTES);
  if (bytes === null) {
    return Response.json({ error: "too-large" }, { status: 413 });
  }
  if (bytes.byteLength === 0) {
    // Zero bytes is a malformed post, not an empty page.
    return Response.json({ error: "bad-image" }, { status: 415 });
  }

  try {
    const { text } = await generateText({
      model: MODEL,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe the Arabic Qur'an text in this image." },
            { type: "file", mediaType: contentType, data: bytes },
          ],
        },
      ],
    });
    return Response.json({ text: text.trim() });
  } catch (err) {
    // Log the failure reason only — never the image bytes.
    console.error("recognize: vision model failed:", err instanceof Error ? err.message : err);
    return Response.json({ error: "server" }, { status: 502 });
  }
}
