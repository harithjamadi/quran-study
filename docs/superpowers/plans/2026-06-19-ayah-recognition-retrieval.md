# Ayah Recognition & Tajweed Lookup (Retrieval Core) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Given a chunk of Arabic Quranic text (typed, pasted, or — via a scaffolded seam — OCR'd from a camera), identify exactly which ayah it is from the closed 6,236-ayah corpus, then render the existing Tajweed breakdown for that ayah.

**Architecture:** A pure rasm-normalizer collapses Arabic spelling/diacritic variation so noisy input still matches. A retrieval engine builds a `minisearch` index over the rasm-normalized corpus (generated at build time from the existing `tajweed/*.json` files) and returns the best-matching verse key with a confidence score. A `/recognize` page wires text input → retrieval → the existing `TajweedText` renderer. A pluggable `OcrEngine` seam + camera-capture component scaffolds the future camera path without committing to a specific OCR model.

**Tech Stack:** TypeScript, Next.js 16 (App Router), React 19, `minisearch` v7, Zustand (existing `useLearning` store for `language`), Vitest + Testing Library, Tailwind v4.

## Global Constraints

- This is **NOT** the Next.js in your training data — before writing any App Router code, read the relevant guide in `node_modules/next/dist/docs/` (per `AGENTS.md`).
- Bilingual **EN/MS** throughout — every user-facing string needs `en` and `ms`; read `language` from `useLearning((s) => s.language)`.
- No LLM API. Retrieval is classical IR (`minisearch`) only.
- All new source under `src/`; tests co-located as `*.test.ts(x)`. Run tests with `npm run test`.
- Follow existing conventions: `@/...` import alias, named exports, JSDoc header comment per lib file (see `src/lib/search.ts`).
- Out of scope for this plan (separate future plans): the trained Arabic OCR model (Python/ML track, P3), real-time AR overlay polish (P4). This plan delivers the retrieval core (P0+P1) and the camera/OCR seam scaffold (P2 boundary only).

---

### Task 1: Arabic rasm normalizer

Collapses Quranic Arabic to a diacritic-free, variant-folded "rasm skeleton" so that noisy/partly-diacritized input matches the corpus. Pure function — the foundation everything else builds on.

**Files:**
- Create: `src/lib/arabic-normalize.ts`
- Test: `src/lib/arabic-normalize.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `toRasm(text: string): string` — lowercased-equivalent canonical Arabic. Strips harakat/tanwin/shadda/sukun/superscript-alif/small-high marks (U+0610–U+061A, U+064B–U+065F, U+0670, U+06D6–U+06ED), strips tatweel (U+0640), normalizes alif forms (أ إ آ ٱ ← ا), hamza seats (ؤ ← و, ئ ← ي), alif-maqsura (ى ← ي), ta-marbuta (ة ← ه), then collapses whitespace to single spaces and trims.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/arabic-normalize.test.ts
import { describe, it, expect } from "vitest";
import { toRasm } from "./arabic-normalize";

describe("toRasm", () => {
  it("strips harakat and tanwin", () => {
    expect(toRasm("بِسْمِ")).toBe("بسم");
    expect(toRasm("نَسْتَعِينُ")).toBe("نستعين");
  });

  it("strips shadda, sukun and superscript alif", () => {
    expect(toRasm("ٱلرَّحْمَـٰنِ")).toBe("الرحمن");
  });

  it("normalizes alif, hamza seats, alif-maqsura and ta-marbuta", () => {
    expect(toRasm("أُولَـٰئِكَ")).toBe("اوليك");
    expect(toRasm("عَلَىٰ")).toBe("علي");
    expect(toRasm("رَحْمَةٌ")).toBe("رحمه");
  });

  it("strips tatweel and collapses whitespace", () => {
    expect(toRasm("الـــرحمن   الرحيم")).toBe("الرحمن الرحيم");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/arabic-normalize.test.ts`
Expected: FAIL — `toRasm` is not defined / module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/arabic-normalize.ts
/**
 * Normalize Quranic Arabic to a "rasm skeleton" — the bare consonant outline
 * with diacritics removed and letter variants folded. Matching the closed Quran
 * corpus against this skeleton survives noisy OCR and inconsistent diacritization:
 * we only need enough signal to RETRIEVE the right ayah, not to transcribe it.
 */

// Combining marks to remove: Arabic diacritics + small high/low Quranic marks.
//   U+0610–U+061A  honorifics/quranic annotation signs
//   U+064B–U+065F  harakat, tanwin, shadda, sukun, etc.
//   U+0670         superscript (dagger) alif
//   U+06D6–U+06ED  small high marks, waqf signs, madda above, etc.
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
const TATWEEL = /ـ/g;

const LETTER_FOLDS: Array<[RegExp, string]> = [
  [/[آأإٱ]/g, "ا"], // آ أ إ ٱ → ا
  [/ؤ/g, "و"], // ؤ → و
  [/ئ/g, "ي"], // ئ → ي
  [/ى/g, "ي"], // ى → ي
  [/ة/g, "ه"], // ة → ه
];

export function toRasm(text: string): string {
  let out = text.normalize("NFC").replace(MARKS, "").replace(TATWEEL, "");
  for (const [re, to] of LETTER_FOLDS) out = out.replace(re, to);
  return out.replace(/\s+/g, " ").trim();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/arabic-normalize.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/arabic-normalize.ts src/lib/arabic-normalize.test.ts
git commit -m "feat(recognize): add Arabic rasm normalizer for ayah matching"
```

---

### Task 2: Strip Tajweed annotations to plain verse text

The corpus source is the existing `tajweed/*.json` (annotated strings). This helper turns one annotated string into plain Arabic, reusing the existing parser. Used by the build script in Task 3.

**Files:**
- Modify: `src/lib/tajweed-parser.ts` (append a function)
- Test: `src/lib/tajweed-parser.test.ts` (create)

**Interfaces:**
- Consumes: `parseTajweedVerse(raw: string): TajweedSegment[]` (existing, same file).
- Produces: `stripTajweedAnnotations(raw: string): string` — the verse with all `[code[text]` tags reduced to their inner text, concatenated.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/tajweed-parser.test.ts
import { describe, it, expect } from "vitest";
import { stripTajweedAnnotations } from "./tajweed-parser";

describe("stripTajweedAnnotations", () => {
  it("reduces [code[text] spans to their inner text", () => {
    const raw = "بِسْمِ [h:1[ٱ]للَّهِ [h:2[ٱ][l[ل]رَّحْمَ[n[ـٰ]نِ";
    expect(stripTajweedAnnotations(raw)).toBe("بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ");
  });

  it("returns plain text unchanged", () => {
    expect(stripTajweedAnnotations("ٱلْحَمْدُ لِلَّهِ")).toBe("ٱلْحَمْدُ لِلَّهِ");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/tajweed-parser.test.ts`
Expected: FAIL — `stripTajweedAnnotations` is not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/tajweed-parser.ts`:

```ts
/**
 * Reduce a tajweed-annotated verse string to plain Arabic by concatenating the
 * text of every segment (tagged or not). Used to build the recognition corpus.
 */
export function stripTajweedAnnotations(raw: string): string {
  return parseTajweedVerse(raw)
    .map((s) => s.text)
    .join("");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/tajweed-parser.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tajweed-parser.ts src/lib/tajweed-parser.test.ts
git commit -m "feat(recognize): add stripTajweedAnnotations corpus helper"
```

---

### Task 3: Build the recognition corpus file

A Node build script reads the 114 `public/data/tajweed/*.json` files, strips annotations to plain text, and writes one compact corpus file. Committed as generated data (like the existing `public/data/*` artifacts).

**Files:**
- Create: `scripts/build-corpus.mjs`
- Create (generated): `public/data/corpus/ayat.json`
- Modify: `package.json` (add a `build:corpus` script)

**Interfaces:**
- Consumes: `public/data/tajweed/{1..114}.json` — shape `{ [ayahNumber: string]: annotatedString }`.
- Produces: `public/data/corpus/ayat.json` — `Array<{ key: string; text: string }>` where `key` is `"surah:ayah"` and `text` is plain Arabic. Consumed by Task 5.

- [ ] **Step 1: Write the build script**

```js
// scripts/build-corpus.mjs
// Build public/data/corpus/ayat.json from the annotated tajweed edition.
// Run: node scripts/build-corpus.mjs
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TAJWEED_DIR = join(ROOT, "public/data/tajweed");
const OUT = join(ROOT, "public/data/corpus/ayat.json");

// Same reduction as stripTajweedAnnotations: drop [code[ openers and ] closers,
// keeping inner text. Build-time mirror of the runtime helper.
const TAG_OPEN = /\[[a-z][a-z0-9]*(?::[0-9]+)?\[/g;
function strip(raw) {
  return raw.replace(TAG_OPEN, "").replace(/\]/g, "");
}

const out = [];
for (let s = 1; s <= 114; s++) {
  const data = JSON.parse(await readFile(join(TAJWEED_DIR, `${s}.json`), "utf8"));
  for (const [ayah, raw] of Object.entries(data)) {
    out.push({ key: `${s}:${ayah}`, text: strip(raw).replace(/\s+/g, " ").trim() });
  }
}

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(out));
console.log(`Wrote ${out.length} ayat to ${OUT}`);
```

- [ ] **Step 2: Add the npm script**

In `package.json`, add to `"scripts"`:

```json
"build:corpus": "node scripts/build-corpus.mjs",
```

- [ ] **Step 3: Run the script and verify output**

Run: `npm run build:corpus`
Expected: prints `Wrote 6236 ayat to .../public/data/corpus/ayat.json`.

Verify the count and a sample:
Run: `node -e "const a=require('./public/data/corpus/ayat.json'); console.log(a.length, a[0])"`
Expected: `6236 { key: '1:1', text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ' }`

- [ ] **Step 4: Commit**

```bash
git add scripts/build-corpus.mjs package.json public/data/corpus/ayat.json
git commit -m "feat(recognize): generate closed-corpus ayat.json for retrieval"
```

---

### Task 4: Recognition engine (index + query)

The retrieval core. Builds a `minisearch` index over rasm-normalized corpus text and resolves a (possibly noisy) query to the best verse key with a confidence score.

**Files:**
- Create: `src/lib/ayah-recognition.ts`
- Test: `src/lib/ayah-recognition.test.ts`

**Interfaces:**
- Consumes: `toRasm(text: string): string` from `@/lib/arabic-normalize`.
- Produces:
  - `interface AyahEntry { key: string; text: string }`
  - `interface RecognitionResult { key: string; text: string; score: number; confidence: number; matchedTerms: number; queryTerms: number }`
  - `buildAyahIndex(corpus: AyahEntry[]): MiniSearch<AyahEntry & { rasm: string }>`
  - `recognizeAyah(index, query: string): RecognitionResult | null` — returns `null` when nothing matches. `confidence` = matchedTerms / queryTerms (0–1).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/ayah-recognition.test.ts
import { describe, it, expect } from "vitest";
import { buildAyahIndex, recognizeAyah, type AyahEntry } from "./ayah-recognition";

const CORPUS: AyahEntry[] = [
  { key: "1:1", text: "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ" },
  { key: "1:2", text: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ" },
  { key: "112:1", text: "قُلْ هُوَ ٱللَّهُ أَحَدٌ" },
];

describe("recognizeAyah", () => {
  const index = buildAyahIndex(CORPUS);

  it("matches an exact ayah regardless of diacritics", () => {
    const r = recognizeAyah(index, "الحمد لله رب العالمين");
    expect(r?.key).toBe("1:2");
    expect(r?.confidence).toBeGreaterThan(0.9);
  });

  it("matches from a partial, noisy fragment", () => {
    const r = recognizeAyah(index, "رب العلمين"); // missing alif in العالمين
    expect(r?.key).toBe("1:2");
  });

  it("returns null for non-Quranic gibberish", () => {
    expect(recognizeAyah(index, "xyzzy plugh")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/ayah-recognition.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/ayah-recognition.ts
/**
 * Closed-corpus ayah retrieval. The Quran is a fixed set of 6,236 ayat, so
 * identifying text is a RETRIEVAL problem, not transcription: normalize to a
 * rasm skeleton, then fuzzy-match against the corpus with minisearch. Noisy
 * input (OCR, partial diacritics) still resolves to the right verse.
 */
import MiniSearch from "minisearch";
import { toRasm } from "@/lib/arabic-normalize";

export interface AyahEntry {
  key: string;
  text: string;
}

export interface RecognitionResult {
  key: string;
  text: string;
  score: number;
  confidence: number;
  matchedTerms: number;
  queryTerms: number;
}

type IndexedAyah = AyahEntry & { rasm: string };

const tokenize = (s: string): string[] => s.split(/\s+/).filter(Boolean);

export function buildAyahIndex(corpus: AyahEntry[]): MiniSearch<IndexedAyah> {
  const index = new MiniSearch<IndexedAyah>({
    idField: "key",
    fields: ["rasm"],
    storeFields: ["key", "text"],
    tokenize,
    // text is pre-normalized; identity keeps query/term processing aligned.
    processTerm: (t) => t,
    searchOptions: { fuzzy: 0.2, prefix: true, combineWith: "OR" },
  });
  index.addAll(corpus.map((a) => ({ ...a, rasm: toRasm(a.text) })));
  return index;
}

export function recognizeAyah(
  index: MiniSearch<IndexedAyah>,
  query: string
): RecognitionResult | null {
  const rasm = toRasm(query);
  const queryTerms = tokenize(rasm).length;
  if (queryTerms === 0) return null;

  const hits = index.search(rasm);
  if (hits.length === 0) return null;

  const top = hits[0];
  const matchedTerms = Object.keys(top.match).length;
  return {
    key: top.id as string,
    text: top.text as string,
    score: top.score,
    confidence: Math.min(1, matchedTerms / queryTerms),
    matchedTerms,
    queryTerms,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/ayah-recognition.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ayah-recognition.ts src/lib/ayah-recognition.test.ts
git commit -m "feat(recognize): closed-corpus ayah retrieval engine (minisearch)"
```

---

### Task 5: Corpus loader (fetch + cache + lazy index)

Client-side loader that fetches the generated corpus once and returns a built, cached index — mirroring the lazy-cache pattern in `src/lib/mushaf.ts` / `tajweed-parser.ts`.

**Files:**
- Modify: `src/lib/ayah-recognition.ts` (append loader)
- Test: `src/lib/ayah-recognition.test.ts` (append loader test with mocked fetch)

**Interfaces:**
- Consumes: `buildAyahIndex` (same file); global `fetch`; `/data/corpus/ayat.json` (Task 3).
- Produces: `loadAyahIndex(): Promise<MiniSearch<IndexedAyah> | null>` (cached after first call); `_resetAyahIndexCache(): void` for tests.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/ayah-recognition.test.ts`:

```ts
import { afterEach, vi } from "vitest";
import { loadAyahIndex, _resetAyahIndexCache, recognizeAyah as recog } from "./ayah-recognition";

describe("loadAyahIndex", () => {
  afterEach(() => {
    _resetAyahIndexCache();
    vi.restoreAllMocks();
  });

  it("fetches the corpus once and builds a queryable index", async () => {
    const corpus = [{ key: "112:1", text: "قُلْ هُوَ ٱللَّهُ أَحَدٌ" }];
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(corpus)));

    const index = await loadAyahIndex();
    await loadAyahIndex(); // second call should not re-fetch

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(recog(index!, "قل هو الله احد")?.key).toBe("112:1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/ayah-recognition.test.ts`
Expected: FAIL — `loadAyahIndex` / `_resetAyahIndexCache` not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/ayah-recognition.ts`:

```ts
let indexPromise: Promise<MiniSearch<IndexedAyah> | null> | null = null;

export function loadAyahIndex(): Promise<MiniSearch<IndexedAyah> | null> {
  if (!indexPromise) {
    indexPromise = fetch("/data/corpus/ayat.json")
      .then((res) => (res.ok ? (res.json() as Promise<AyahEntry[]>) : null))
      .then((corpus) => (corpus ? buildAyahIndex(corpus) : null))
      .catch(() => null);
  }
  return indexPromise;
}

export function _resetAyahIndexCache(): void {
  indexPromise = null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/ayah-recognition.test.ts`
Expected: PASS (all tests in file).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ayah-recognition.ts src/lib/ayah-recognition.test.ts
git commit -m "feat(recognize): lazy corpus loader with cached index"
```

---

### Task 6: Recognize page (text input → ayah → Tajweed breakdown)

The user-facing P1 deliverable: paste/type Arabic, recognize the ayah, render the existing `TajweedText` breakdown. Bilingual.

**Files:**
- Create: `src/app/recognize/page.tsx` (server entry — metadata + renders client)
- Create: `src/app/recognize/RecognizeClient.tsx` (client component)
- Test: `src/app/recognize/RecognizeClient.test.tsx`

**Interfaces:**
- Consumes: `loadAyahIndex`, `recognizeAyah`, `RecognitionResult` from `@/lib/ayah-recognition`; `TajweedText` from `@/components/TajweedText`; `parseAyahRef` from `@/lib/format`; `useLearning` from `@/store/learning`.
- Produces: route `/recognize`. On submit, sets a `RecognitionResult | null`; renders surah:ayah + `TajweedText` when confidence ≥ 0.5, else a "couldn't read clearly" message.

- [ ] **Step 1: Read the Next.js App Router guide**

Per `AGENTS.md`, before writing the page, read the App Router page/metadata conventions for THIS version:
Run: `ls node_modules/next/dist/docs/` and read the routing/page guide referenced there.
Confirm: how `page.tsx` + `"use client"` child components and `export const metadata` work in this Next version. Adjust the code below if conventions differ.

- [ ] **Step 2: Write the failing test**

```tsx
// src/app/recognize/RecognizeClient.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RecognizeClient } from "./RecognizeClient";

vi.mock("@/lib/ayah-recognition", () => ({
  loadAyahIndex: vi.fn().mockResolvedValue({}),
  recognizeAyah: vi.fn().mockReturnValue({
    key: "1:2", text: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ",
    score: 5, confidence: 1, matchedTerms: 4, queryTerms: 4,
  }),
}));

// TajweedText fetches surah data + uses portals; stub it to a marker.
vi.mock("@/components/TajweedText", () => ({
  TajweedText: ({ surahNumber, ayahNumber }: { surahNumber: number; ayahNumber: number }) => (
    <div data-testid="tajweed">{`${surahNumber}:${ayahNumber}`}</div>
  ),
}));

describe("RecognizeClient", () => {
  beforeEach(() => vi.clearAllMocks());

  it("recognizes pasted text and renders the Tajweed breakdown", async () => {
    render(<RecognizeClient />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "الحمد لله رب العالمين" },
    });
    fireEvent.click(screen.getByRole("button", { name: /recognize|kenal pasti/i }));

    await waitFor(() => expect(screen.getByTestId("tajweed")).toHaveTextContent("1:2"));
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- src/app/recognize/RecognizeClient.test.tsx`
Expected: FAIL — module `./RecognizeClient` not found.

- [ ] **Step 4: Write the client component**

```tsx
// src/app/recognize/RecognizeClient.tsx
"use client";

import { useState } from "react";
import { loadAyahIndex, recognizeAyah, type RecognitionResult } from "@/lib/ayah-recognition";
import { parseAyahRef } from "@/lib/format";
import { TajweedText } from "@/components/TajweedText";
import { useLearning } from "@/store/learning";

const T = {
  title: { en: "Recognize an Ayah", ms: "Kenal Pasti Ayat" },
  hint: {
    en: "Paste or type Arabic from any Mushaf — we'll find the verse and show its Tajweed.",
    ms: "Tampal atau taip teks Arab dari mana-mana Mushaf — kami akan cari ayatnya dan tunjukkan Tajweednya.",
  },
  button: { en: "Recognize", ms: "Kenal Pasti" },
  notFound: {
    en: "Couldn't read that clearly. Try a longer or cleaner fragment.",
    ms: "Tidak dapat dibaca dengan jelas. Cuba petikan yang lebih panjang atau jelas.",
  },
} as const;

const MIN_CONFIDENCE = 0.5;

export function RecognizeClient() {
  const language = useLearning((s) => s.language);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleRecognize() {
    const index = await loadAyahIndex();
    setResult(index ? recognizeAyah(index, input) : null);
    setSearched(true);
  }

  const ref = result && result.confidence >= MIN_CONFIDENCE ? parseAyahRef(result.key) : null;

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-4">
      <h1 className="text-xl font-bold text-[color:var(--foreground)]">{T.title[language]}</h1>
      <p className="text-sm text-[color:var(--muted)]">{T.hint[language]}</p>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        dir="rtl"
        lang="ar"
        className="arabic w-full min-h-28 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-xl text-right"
      />
      <button
        onClick={handleRecognize}
        className="rounded-xl bg-[color:var(--accent-strong)] px-4 py-2 text-sm font-semibold text-white"
      >
        {T.button[language]}
      </button>

      {ref && (
        <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
          <p className="text-xs font-mono text-[color:var(--muted)] mb-2">{result!.key}</p>
          <TajweedText
            surahNumber={ref.surah}
            ayahNumber={ref.ayah}
            arabicFallback={result!.text}
            fontSize={32}
          />
        </section>
      )}

      {searched && !ref && (
        <p className="text-sm text-[color:var(--muted)]">{T.notFound[language]}</p>
      )}
    </main>
  );
}
```

- [ ] **Step 5: Write the page entry**

```tsx
// src/app/recognize/page.tsx
import type { Metadata } from "next";
import { RecognizeClient } from "./RecognizeClient";

export const metadata: Metadata = { title: "Recognize an Ayah · Mubin" };

export default function RecognizePage() {
  return <RecognizeClient />;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -- src/app/recognize/RecognizeClient.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 7: Typecheck and commit**

Run: `npm run typecheck`
Expected: no errors.

```bash
git add src/app/recognize/
git commit -m "feat(recognize): /recognize page — text input to Tajweed breakdown"
```

---

### Task 7: OCR seam + camera capture scaffold (P2 boundary)

Defines the pluggable OCR interface and a camera-capture component so the future model drops in without touching the page. Ships with a stub engine (returns empty text) — no real OCR model in this plan.

**Files:**
- Create: `src/lib/ocr.ts` (interface + stub)
- Test: `src/lib/ocr.test.ts`
- Create: `src/components/CameraCapture.tsx` (getUserMedia → still frame → `onCapture(imageData)`)
- Modify: `src/app/recognize/RecognizeClient.tsx` (add a "Use camera" toggle that runs the OCR engine and feeds its text into the same recognition flow)

**Interfaces:**
- Consumes: existing recognition flow in `RecognizeClient`.
- Produces:
  - `interface OcrEngine { recognize(image: ImageData): Promise<string> }`
  - `stubOcrEngine: OcrEngine` — resolves to `""` (placeholder until the P3 model lands).
  - `CameraCapture` React component with props `{ onCapture: (image: ImageData) => void; labelStart: string; labelCapture: string }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/ocr.test.ts
import { describe, it, expect } from "vitest";
import { stubOcrEngine } from "./ocr";

describe("stubOcrEngine", () => {
  it("conforms to the OcrEngine interface and returns empty text for now", async () => {
    const img = new ImageData(1, 1);
    await expect(stubOcrEngine.recognize(img)).resolves.toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/ocr.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the OCR seam**

```ts
// src/lib/ocr.ts
/**
 * OCR seam for the camera path. The real Arabic OCR model (a separate Python/ML
 * track, P3) will implement OcrEngine and run on-device via ONNX/WASM. Until
 * then, stubOcrEngine is a no-op placeholder so the camera UI and recognition
 * flow can be built and tested independently of the model.
 */
export interface OcrEngine {
  recognize(image: ImageData): Promise<string>;
}

export const stubOcrEngine: OcrEngine = {
  async recognize(): Promise<string> {
    return "";
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/ocr.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Write the camera capture component**

```tsx
// src/components/CameraCapture.tsx
"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onCapture: (image: ImageData) => void;
  labelStart: string;
  labelCapture: string;
}

/** Live camera preview with a single-shot capture that emits an ImageData frame. */
export function CameraCapture({ onCapture, labelStart, labelCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streaming, setStreaming] = useState(false);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStreaming(true);
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    onCapture(ctx.getImageData(0, 0, canvas.width, canvas.height));
  }

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      const stream = video?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="space-y-2">
      <video ref={videoRef} className="w-full rounded-xl bg-black" playsInline muted />
      {!streaming ? (
        <button onClick={start} className="rounded-xl bg-[color:var(--accent-strong)] px-4 py-2 text-sm font-semibold text-white">
          {labelStart}
        </button>
      ) : (
        <button onClick={capture} className="rounded-xl bg-[color:var(--accent-strong)] px-4 py-2 text-sm font-semibold text-white">
          {labelCapture}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Wire the camera into RecognizeClient**

In `src/app/recognize/RecognizeClient.tsx`:

Add imports near the top:

```tsx
import { CameraCapture } from "@/components/CameraCapture";
import { stubOcrEngine } from "@/lib/ocr";
```

Add to the `T` strings object:

```tsx
  camera: { en: "Use camera", ms: "Guna kamera" },
  startCamera: { en: "Start camera", ms: "Mula kamera" },
  capture: { en: "Capture", ms: "Tangkap" },
  ocrPending: {
    en: "Camera text recognition isn't available yet — type or paste for now.",
    ms: "Pengecaman teks kamera belum tersedia — taip atau tampal buat masa ini.",
  },
```

Add state inside the component (after the existing `useState` calls):

```tsx
  const [cameraMode, setCameraMode] = useState(false);

  async function handleCapture(image: ImageData) {
    const text = await stubOcrEngine.recognize(image);
    setInput(text);
    const index = await loadAyahIndex();
    setResult(index && text ? recognizeAyah(index, text) : null);
    setSearched(true);
  }
```

Add the camera toggle + capture UI immediately after the `<button>` that triggers `handleRecognize`:

```tsx
      <button
        onClick={() => setCameraMode((v) => !v)}
        className="ml-2 rounded-xl border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)]"
      >
        {T.camera[language]}
      </button>

      {cameraMode && (
        <div className="space-y-2">
          <CameraCapture
            onCapture={handleCapture}
            labelStart={T.startCamera[language]}
            labelCapture={T.capture[language]}
          />
          <p className="text-xs text-[color:var(--muted)]">{T.ocrPending[language]}</p>
        </div>
      )}
```

- [ ] **Step 7: Verify existing tests still pass + typecheck**

Run: `npm run test -- src/app/recognize/RecognizeClient.test.tsx src/lib/ocr.test.ts`
Expected: PASS.
Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/ocr.ts src/lib/ocr.test.ts src/components/CameraCapture.tsx src/app/recognize/RecognizeClient.tsx
git commit -m "feat(recognize): camera capture + pluggable OCR seam (stub) scaffold"
```

---

## Self-Review

**Spec coverage** (against the feasibility doc):
- §2/§3 "recognize roughly, retrieve exactly" + rasm normalization → Tasks 1, 4. ✅
- §3 corpus + Tajweed lookup overlay → Tasks 2, 3 (corpus), 6 (reuses existing `TajweedText` for the breakdown). ✅
- §5 retrieval algorithm (index + fuzzy + confidence) → Task 4. ✅
- §3 capture stage + §6 Approach A OCR seam → Task 7 (scaffold + interface boundary; real model is P3, out of scope). ✅
- §7 no-LLM → entire plan uses `minisearch` only. ✅
- Deferred by design: layout analysis / ۝-anchor detection, dewarp/preprocess, the trained OCR model (P3), AR overlay (P4). These belong to follow-up plans — noted in Global Constraints.

**Placeholder scan:** No TBD/TODO; every code step is complete. The OCR *stub* is an intentional, documented seam (returns `""`), not a placeholder gap — the surrounding flow and tests are real.

**Type consistency:** `AyahEntry`, `RecognitionResult`, `IndexedAyah`, `buildAyahIndex`, `recognizeAyah`, `loadAyahIndex`, `_resetAyahIndexCache`, `OcrEngine`, `stubOcrEngine`, `CameraCapture` props — names/signatures are consistent across Tasks 4–7. `parseAyahRef` and `TajweedText`'s props (`surahNumber`, `ayahNumber`, `arabicFallback`, `fontSize`) match the existing source read during planning.

**Scope:** Single coherent subsystem (retrieval core + camera seam). OCR-model and AR phases are explicitly separate future plans.
