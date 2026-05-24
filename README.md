# Mubin — Making the Quran Clear

> _Mubin_ (**مُبِين**) — "clear, evident". From _kitābun mubīn_, a clear Book.

A free, open Quran study tool that teaches you the Arabic of the Quran word by
word. Built on the empirical observation that **just 500 Arabic lemmas cover
80% of all Quran tokens** — memorise them in the right order and you can
understand most of what you read.

## What you can do

- **Word Quest** — daily 15-minute flashcard sessions ordered by frequency.
  Spaced-repetition scheduler tracks every word as `new → weak → good → strong`.
  Hear the word, pick the meaning, grade your recall.
- **Read with annotations** — tap any Arabic word in any of the 114 surahs to
  reveal its meaning, transliteration, three-letter root, and every other verse
  in the Quran where that root appears.
- **Root explorer** — `/root/[root]` lists every occurrence of a triliteral
  root across the whole Quran, grouped by surah.
- **Bilingual** — English and Bahasa Melayu UI. Word glosses fall back through
  curated MS → Indonesian (per-word, ~95% intelligible) → English with badge.
- **Yours forever** — bookmarks, mastered words, day streak, settings — all
  in `localStorage`. No account, no cloud, no tracking, no ads.

## Tech

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack), React 19,
  TypeScript, Tailwind v4
- [Zustand](https://github.com/pmndrs/zustand) with `persist` for client state
- [Vitest](https://vitest.dev/) + Testing Library for unit tests

## Data sources

- **Quran text + verse translations**: [api.alquran.cloud](https://alquran.cloud/api)
- **Audio**: [islamic.network](https://islamic.network/) CDN
- **Per-word transliteration + English gloss**: [Quran.com API v4](https://api.quran.com)
- **Morphology + roots + lemmas**: [Quranic Arabic Corpus](http://corpus.quran.com)
  via [mustafa0x/quran-morphology](https://github.com/mustafa0x/quran-morphology) (GPL)
- **Per-word Indonesian gloss (Malay fallback)**:
  [ekoheri/Al_Quran_Terjemahan_per_kata_per_ayat](https://github.com/ekoheri/Al_Quran_Terjemahan_per_kata_per_ayat)
- **Curated Malay dictionary**: top ~308 lemmas hand-translated, see
  `scripts/build-frequency.mjs`

## Running locally

```bash
npm install
npm run dev          # http://localhost:3000
```

### Regenerating the static datasets

The repository ships with pre-built data under `public/data/`. To rebuild:

```bash
node scripts/build-word-data.mjs       # ~5 min, hits Quran.com 114×
node scripts/build-frequency.mjs       # ~30s, includes Indonesian WBW fetch
```

### Scripts

```bash
npm run dev          # dev server
npm run build        # production build
npm run start        # serve production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # vitest run
npm run test:watch   # vitest --watch
```

## License

Source code: MIT. Quran morphology data: GPL (Quranic Arabic Corpus).
Audio + translations served via the respective upstream APIs under their own
terms.
