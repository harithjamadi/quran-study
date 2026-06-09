/**
 * Question-generation engine for the Tajweed Quest track.
 *
 * Reads the same /public/data/tajweed/{surah}.json that TajweedText renders,
 * parses each verse into segments, and turns those segments into typed quest
 * questions: rule-picker, condition-match, mistake-finder, count-rules, etc.
 *
 * Pure helpers — no React, no DOM. Safe to import from server and client.
 */

import { parseTajweedVerse, type TajweedSegment } from "@/lib/tajweed-parser";
import {
  TAJWEED_RULES,
  getTajweedRule,
  type TajweedRule,
  type TajweedCategory,
} from "@/lib/tajweed";

/** A single rule-bearing segment lifted from a parsed verse. */
export interface RuleHit {
  /** 1-indexed ayah number within the surah. */
  ayah: number;
  /** The Arabic substring annotated with this rule. */
  text: string;
  /** Base rule code (numeric suffix stripped — "h:1" → "h"). */
  code: string;
  rule: TajweedRule;
  /** Full parsed segments for this ayah (in original order). */
  ayahSegments: TajweedSegment[];
  /** Index of this segment within ayahSegments. */
  segmentIdx: number;
}

/** Reconstructed plain-Arabic verse: segments stripped of their codes. */
export interface VerseView {
  ayah: number;
  segments: TajweedSegment[];
}

/**
 * All rule-coded segments across the surah, in ayah order.
 * Used as the universe for every quest type.
 */
export function collectRuleHits(
  tajweedSurah: Record<string, string>
): RuleHit[] {
  const hits: RuleHit[] = [];
  const ayahKeys = Object.keys(tajweedSurah)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  for (const ayahNum of ayahKeys) {
    const raw = tajweedSurah[String(ayahNum)];
    if (!raw) continue;
    const segments = parseTajweedVerse(raw);
    segments.forEach((seg, segmentIdx) => {
      if (!seg.code) return;
      const rule = getTajweedRule(seg.code);
      if (!rule) return;
      const base = seg.code.split(":")[0];
      hits.push({
        ayah: ayahNum,
        text: seg.text,
        code: base,
        rule,
        ayahSegments: segments,
        segmentIdx,
      });
    });
  }
  return hits;
}

/** Distinct rule codes present in the surah, ordered by first appearance. */
export function getSurahRules(
  tajweedSurah: Record<string, string>
): TajweedRule[] {
  const hits = collectRuleHits(tajweedSurah);
  const seen = new Set<string>();
  const list: TajweedRule[] = [];
  for (const h of hits) {
    if (seen.has(h.code)) continue;
    seen.add(h.code);
    list.push(h.rule);
  }
  return list;
}

/** All ayahs reconstructed as parsed segments (for in-context rendering). */
export function getVerseViews(
  tajweedSurah: Record<string, string>
): VerseView[] {
  return Object.keys(tajweedSurah)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)
    .map((ayah) => ({
      ayah,
      segments: parseTajweedVerse(tajweedSurah[String(ayah)] ?? ""),
    }));
}

/* ── Seeded RNG ─────────────────────────────────────────────────────────── */

export function seededRng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1_000_000) / 1_000_000;
  };
}

export function shuffleSeeded<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickN<T>(arr: T[], n: number, rng: () => number): T[] {
  return shuffleSeeded(arr, rng).slice(0, n);
}

/* ── Distractor selection ───────────────────────────────────────────────── */

/**
 * Build N-1 distractor rules to accompany a correct rule. Prefer same-category
 * rules first (they are the realistic confusion set — e.g. Ikhfa vs Idgham),
 * then fall back to any other rule so we always reach `total` options.
 */
export function buildRuleOptions(
  correct: TajweedRule,
  total: number,
  rng: () => number,
  surahRules?: TajweedRule[]
): TajweedRule[] {
  const all = Object.values(TAJWEED_RULES);
  const sameCat = all.filter(
    (r) => r.code !== correct.code && r.category === correct.category
  );
  const otherCat = all.filter(
    (r) => r.code !== correct.code && r.category !== correct.category
  );
  // Prefer rules that actually appear in the surah for the "other cat" pool
  // — keeps options thematic for short surahs.
  if (surahRules && surahRules.length > 0) {
    const inSurah = new Set(surahRules.map((r) => r.code));
    otherCat.sort((a, b) => {
      const ai = inSurah.has(a.code) ? 0 : 1;
      const bi = inSurah.has(b.code) ? 0 : 1;
      return ai - bi;
    });
  }
  const picks: TajweedRule[] = [];
  const needed = total - 1;
  for (const r of shuffleSeeded(sameCat, rng)) {
    if (picks.length >= needed) break;
    picks.push(r);
  }
  for (const r of otherCat) {
    if (picks.length >= needed) break;
    picks.push(r);
  }
  return shuffleSeeded([correct, ...picks], rng);
}

/* ── Quest stages ───────────────────────────────────────────────────────── */

export type TajweedStage =
  | { kind: "memorize"; rules: TajweedRule[] }
  | { kind: "complete" }
  // 1★ Recognize
  | {
      kind: "rule-picker";
      hit: RuleHit;
      options: TajweedRule[];
      monochrome: false;
    }
  | {
      kind: "color-match";
      ayah: number;
      segments: TajweedSegment[];
      // Pairs to match: each segment idx ↔ rule code
      pairs: { segmentIdx: number; rule: TajweedRule }[];
    }
  | {
      kind: "letter-identify";
      rule: TajweedRule;
      // Highlighted Arabic letter the user must identify as belonging to this rule's family
      correctLetter: string;
      options: string[];
    }
  // 1★ Recognize – audio-only rule identification
  | {
      kind: "hear-the-rule";
      hit: RuleHit;
      surahNumber: number;
      options: TajweedRule[];
    }
  // 2★ Understand
  | {
      kind: "condition-match";
      rule: TajweedRule;
      options: TajweedRule[]; // user picks the rule whose condition matches the prompt
    }
  | {
      kind: "rule-picker-monochrome";
      hit: RuleHit;
      options: TajweedRule[];
      monochrome: true;
    }
  | {
      kind: "rule-sort";
      ayah: number;
      segments: TajweedSegment[];
      // Each rule-bearing segment must be dropped in the bucket of its category
      buckets: TajweedCategory[];
      items: { segmentIdx: number; category: TajweedCategory }[];
    }
  // 2★ Understand – fill-in-blank distinguishing confused rule pairs
  | {
      kind: "confused-pairs";
      pairA: TajweedRule;
      pairB: TajweedRule;
      /** Two distractor rules for the word bank */
      distractors: [TajweedRule, TajweedRule];
    }
  // 3★ Apply
  | {
      kind: "mistake-finder";
      ayah: number;
      segments: TajweedSegment[];
      // The segment whose label is wrong — user must tap it
      wrongSegmentIdx: number;
      shownRuleCode: string; // the (incorrect) rule color shown on that segment
      actualRuleCode: string; // the correct rule code (segment.code)
    }
  | {
      kind: "count-rules";
      ayah: number;
      segments: TajweedSegment[];
      targetRule: TajweedRule;
      correctCount: number;
      options: number[]; // multiple-choice counts
    }
  | {
      kind: "audio-tap";
      ayah: number;
      surahNumber: number;
      segments: TajweedSegment[];
      targetRule: TajweedRule;
      // For scoring: indexes that bear the target rule (correct taps).
      targetSegmentIdxs: number[];
    }
  // 3★ Apply – audio-based rule sorting
  | {
      kind: "sound-sorter";
      surahNumber: number;
      /** 3-4 items from distinct ayahs for the user to classify */
      items: {
        ayah: number;
        segmentIdx: number;
        segments: TajweedSegment[];
        correctRule: TajweedRule;
      }[];
      /** The rule buckets the user sorts into */
      buckets: TajweedRule[];
    }
  // 3★ Apply – full-ayah progressive reveal (tap each segment, pick rule, color reveals)
  | {
      kind: "rule-whisperer";
      ayah: number;
      surahNumber: number;
      segments: TajweedSegment[];
      /** Every rule-bearing segment with its correct rule and 4 MCQ options */
      ruleSegments: Array<{
        segmentIdx: number;
        rule: TajweedRule;
        options: TajweedRule[];
      }>;
    };

export interface TajweedQuest {
  difficulty: 1 | 2 | 3;
  surahNumber: number;
  stages: TajweedStage[];
  /** Distinct rules featured in the memorize/intro stage. */
  featuredRules: TajweedRule[];
}

/* ── Confused pairs ─────────────────────────────────────────────────────── */

/**
 * Pairs of rules beginners routinely confuse. Each pair is injected as a
 * "confused-pairs" stage at difficulty 2 when both codes are present in the surah.
 */
export const CONFUSED_PAIRS: Array<{ codeA: string; codeB: string }> = [
  { codeA: "a", codeB: "u" },  // Idgham bil Ghunna vs Idgham bila Ghunna
  { codeA: "f", codeB: "a" },  // Ikhfa vs Idgham bil Ghunna
  { codeA: "f", codeB: "i" },  // Ikhfa vs Iqlab
  { codeA: "c", codeB: "w" },  // Ikhfa Shafawi vs Idgham Shafawi
  { codeA: "n", codeB: "o" },  // Madd Tabee'i vs Madd Muttasil/Munfasil
  { codeA: "n", codeB: "m" },  // Madd Tabee'i vs Madd Lazim
];

/* ── Quest generator ────────────────────────────────────────────────────── */

/**
 * Build a full quest for one surah at one difficulty.
 *
 * Returns null only if the surah has too few rule-bearing segments to play —
 * the caller can fall back to a "not enough material" empty state.
 *
 * `seedSalt` lets the caller introduce variety across retries (e.g. a
 * per-mount counter) without sacrificing determinism within a single play.
 */
export function generateTajweedQuest(
  surahNumber: number,
  tajweedSurah: Record<string, string>,
  difficulty: 1 | 2 | 3,
  seedSalt: string = ""
): TajweedQuest | null {
  const allHits = collectRuleHits(tajweedSurah);
  if (allHits.length < 3) return null;

  const surahRules = getSurahRules(tajweedSurah);
  const verseViews = getVerseViews(tajweedSurah);

  const rng = seededRng(`tajweed-${surahNumber}-d${difficulty}-${seedSalt}`);

  // Memorize stage shows up to 6 distinct rules the user will be tested on.
  const featuredRules = surahRules.slice(0, Math.min(6, surahRules.length));
  const stages: TajweedStage[] = [{ kind: "memorize", rules: featuredRules }];

  if (difficulty === 1) {
    /* ── 1★ Recognize ── */
    // 2× rule-picker (verse shown, target colored, pick rule name).
    const pickerHits = pickN(allHits, 2, rng);
    for (const hit of pickerHits) {
      stages.push({
        kind: "rule-picker",
        hit,
        options: buildRuleOptions(hit.rule, 4, rng, surahRules),
        monochrome: false,
      });
    }
    // 1× hear-the-rule: audio plays, text hidden, user names the rule.
    const hearHits = allHits.filter((h) => !pickerHits.some((p) => p.ayah === h.ayah));
    const hearHit = shuffleSeeded(hearHits, rng)[0] ?? pickerHits[0];
    if (hearHit) {
      stages.push({
        kind: "hear-the-rule",
        hit: hearHit,
        surahNumber,
        options: buildRuleOptions(hearHit.rule, 4, rng, surahRules),
      });
    }
    // 1× color-match across an ayah that has at least 2 distinct rule-segments.
    const richVerse = findVerseWithSegments(verseViews, 2);
    if (richVerse) {
      const ruleSegs = richVerse.segments
        .map((seg, idx) => ({ seg, idx }))
        .filter(
          (x) => x.seg.code && getTajweedRule(x.seg.code) !== undefined
        )
        .slice(0, 4);
      stages.push({
        kind: "color-match",
        ayah: richVerse.ayah,
        segments: richVerse.segments,
        pairs: ruleSegs.map((x) => ({
          segmentIdx: x.idx,
          rule: getTajweedRule(x.seg.code!)!,
        })),
      });
    }
    // 2× letter-identify for rules that publish a letters list (Qalqalah, Ikhfa…)
    const ruleableHits = allHits.filter(
      (h) => h.rule.letters && h.rule.letters.trim().length > 0
    );
    const letterHits = pickN(ruleableHits, 2, rng);
    for (const hit of letterHits) {
      const letters = (hit.rule.letters ?? "")
        .split(/\s+/)
        .filter((s) => s.length > 0);
      if (letters.length === 0) continue;
      // Correct letter: pick one that actually appears in this hit's text where possible
      const correct =
        letters.find((l) => hit.text.includes(l)) ??
        shuffleSeeded(letters, rng)[0];
      // Distractors: letters NOT in this rule's family
      const distractorPool = ARABIC_LETTER_BANK.filter(
        (l) => !letters.includes(l)
      );
      const distractors = pickN(distractorPool, 3, rng);
      stages.push({
        kind: "letter-identify",
        rule: hit.rule,
        correctLetter: correct,
        options: shuffleSeeded([correct, ...distractors], rng),
      });
    }
  } else if (difficulty === 2) {
    /* ── 2★ Understand ── */
    // 3× condition-match: prompt is the rule's condition; user picks the rule.
    const condRules = pickN(surahRules, Math.min(3, surahRules.length), rng);
    for (const rule of condRules) {
      stages.push({
        kind: "condition-match",
        rule,
        options: buildRuleOptions(rule, 4, rng, surahRules),
      });
    }
    // 3× rule-picker monochrome: text shown WITHOUT colors. User must spot rule from form.
    const monoHits = pickN(allHits, 3, rng);
    for (const hit of monoHits) {
      stages.push({
        kind: "rule-picker-monochrome",
        hit,
        options: buildRuleOptions(hit.rule, 4, rng, surahRules),
        monochrome: true,
      });
    }
    // 1× confused-pairs: pick the first pair where both codes appear in this surah.
    const surahCodes = new Set(allHits.map((h) => h.code));
    const pair = CONFUSED_PAIRS.find(
      (p) => surahCodes.has(p.codeA) && surahCodes.has(p.codeB)
    );
    if (pair) {
      const ruleA = TAJWEED_RULES[pair.codeA];
      const ruleB = TAJWEED_RULES[pair.codeB];
      if (ruleA && ruleB) {
        // Pick 2 distractors not from this pair
        const dPool = Object.values(TAJWEED_RULES).filter(
          (r) => r.code !== pair.codeA && r.code !== pair.codeB
        );
        const [d1, d2] = pickN(dPool, 2, rng) as [TajweedRule, TajweedRule];
        if (d1 && d2) {
          stages.push({ kind: "confused-pairs", pairA: ruleA, pairB: ruleB, distractors: [d1, d2] });
        }
      }
    }
    // 1× rule-sort across an ayah with multiple categories
    const sortVerse = findVerseWithCategories(verseViews, 2);
    if (sortVerse) {
      const items = sortVerse.segments
        .map((seg, idx) => {
          const code = seg.code;
          if (!code) return null;
          const rule = getTajweedRule(code);
          if (!rule) return null;
          return { segmentIdx: idx, category: rule.category };
        })
        .filter((x): x is { segmentIdx: number; category: TajweedCategory } => x !== null)
        .slice(0, 6);
      const buckets = Array.from(new Set(items.map((i) => i.category)));
      stages.push({
        kind: "rule-sort",
        ayah: sortVerse.ayah,
        segments: sortVerse.segments,
        buckets,
        items,
      });
    }
  } else {
    /* ── 3★ Apply ── */
    // 2× mistake-finder: an ayah with one segment color swapped
    const mistakeVerses = pickN(
      verseViews.filter((v) => countRuleSegments(v) >= 2),
      2,
      rng
    );
    for (const v of mistakeVerses) {
      const segIdxs = v.segments
        .map((seg, idx) => ({ seg, idx }))
        .filter((x) => x.seg.code && getTajweedRule(x.seg.code));
      if (segIdxs.length < 2) continue;
      const wrong = shuffleSeeded(segIdxs, rng)[0];
      const actualCode = getTajweedRule(wrong.seg.code!)!.code;
      // Choose a "fake" rule the user might believe — same-category preferred.
      const fakeOptions = buildRuleOptions(
        getTajweedRule(actualCode)!,
        4,
        rng,
        surahRules
      ).filter((r) => r.code !== actualCode);
      const shownRule = fakeOptions[0];
      if (!shownRule) continue;
      stages.push({
        kind: "mistake-finder",
        ayah: v.ayah,
        segments: v.segments,
        wrongSegmentIdx: wrong.idx,
        shownRuleCode: shownRule.code,
        actualRuleCode: actualCode,
      });
    }
    // 2× count-rules: pick a rule that appears ≥2× in a single ayah
    const countCandidates: {
      ayah: number;
      segments: TajweedSegment[];
      rule: TajweedRule;
      count: number;
    }[] = [];
    for (const v of verseViews) {
      const byCode = new Map<string, number>();
      for (const seg of v.segments) {
        if (!seg.code) continue;
        const r = getTajweedRule(seg.code);
        if (!r) continue;
        byCode.set(r.code, (byCode.get(r.code) ?? 0) + 1);
      }
      for (const [code, n] of byCode) {
        if (n >= 2) {
          countCandidates.push({
            ayah: v.ayah,
            segments: v.segments,
            rule: TAJWEED_RULES[code],
            count: n,
          });
        }
      }
    }
    for (const c of pickN(countCandidates, 2, rng)) {
      const choices = new Set<number>([c.count]);
      while (choices.size < 4) {
        const delta = Math.floor(rng() * 4) + 1;
        const candidate = Math.max(1, c.count + (rng() > 0.5 ? delta : -delta));
        choices.add(candidate);
      }
      stages.push({
        kind: "count-rules",
        ayah: c.ayah,
        segments: c.segments,
        targetRule: c.rule,
        correctCount: c.count,
        options: shuffleSeeded(Array.from(choices), rng),
      });
    }
    // 1× sound-sorter: hear each segment's verse, sort it into the right rule bucket
    {
      // Pick up to 4 hits from distinct ayahs so each item plays a different verse
      const ayahsSeen = new Set<number>();
      const sortHits: RuleHit[] = [];
      for (const h of shuffleSeeded(allHits, rng)) {
        if (sortHits.length >= 4) break;
        if (ayahsSeen.has(h.ayah)) continue;
        ayahsSeen.add(h.ayah);
        sortHits.push(h);
      }
      // Need at least 2 items with ≥2 distinct rules to make a sorting challenge
      const distinctRules = new Map<string, TajweedRule>();
      for (const h of sortHits) distinctRules.set(h.code, h.rule);
      if (sortHits.length >= 2 && distinctRules.size >= 2) {
        stages.push({
          kind: "sound-sorter",
          surahNumber,
          items: sortHits.map((h) => ({
            ayah: h.ayah,
            segmentIdx: h.segmentIdx,
            segments: h.ayahSegments,
            correctRule: h.rule,
          })),
          buckets: Array.from(distinctRules.values()),
        });
      }
    }
    // 1× rule-whisperer: full ayah monochrome, tap each segment and name its rule.
    const whispererVerse = verseViews
      .filter((v) => countRuleSegments(v) >= 3)
      .sort((a, b) => countRuleSegments(b) - countRuleSegments(a))[0]
      ?? findVerseWithSegments(verseViews, 2);
    if (whispererVerse) {
      const ruleSegs = whispererVerse.segments
        .map((seg, idx) => {
          if (!seg.code) return null;
          const rule = getTajweedRule(seg.code);
          if (!rule) return null;
          return { segmentIdx: idx, rule };
        })
        .filter((x): x is { segmentIdx: number; rule: TajweedRule } => x !== null)
        .slice(0, 6);
      if (ruleSegs.length >= 2) {
        stages.push({
          kind: "rule-whisperer",
          ayah: whispererVerse.ayah,
          surahNumber,
          segments: whispererVerse.segments,
          ruleSegments: ruleSegs.map((s) => ({
            ...s,
            options: buildRuleOptions(s.rule, 4, rng, surahRules),
          })),
        });
      }
    }
    // 1× audio-tap: hear the verse, tap when target rule occurs
    const audioVerse = findVerseWithSegments(verseViews, 2);
    if (audioVerse) {
      const ruleSegs = audioVerse.segments
        .map((seg, idx) => ({ seg, idx }))
        .filter((x) => x.seg.code && getTajweedRule(x.seg.code));
      if (ruleSegs.length > 0) {
        // Pick the rule that appears most frequently in this ayah as the target.
        const byCode = new Map<string, number[]>();
        for (const { seg, idx } of ruleSegs) {
          const base = getTajweedRule(seg.code!)!.code;
          const list = byCode.get(base) ?? [];
          list.push(idx);
          byCode.set(base, list);
        }
        let bestCode = "";
        let bestList: number[] = [];
        for (const [code, idxs] of byCode) {
          if (idxs.length > bestList.length) {
            bestCode = code;
            bestList = idxs;
          }
        }
        if (bestCode && bestList.length > 0) {
          stages.push({
            kind: "audio-tap",
            ayah: audioVerse.ayah,
            surahNumber,
            segments: audioVerse.segments,
            targetRule: TAJWEED_RULES[bestCode],
            targetSegmentIdxs: bestList,
          });
        }
      }
    }
  }

  // Need at least one playable stage besides the bookends.
  if (stages.length <= 1) return null;
  stages.push({ kind: "complete" });

  return { difficulty, surahNumber, stages, featuredRules };
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

function findVerseWithSegments(
  verses: VerseView[],
  minRuleSegments: number
): VerseView | null {
  for (const v of verses) {
    if (countRuleSegments(v) >= minRuleSegments) return v;
  }
  return null;
}

function findVerseWithCategories(
  verses: VerseView[],
  minCategories: number
): VerseView | null {
  for (const v of verses) {
    const cats = new Set<string>();
    for (const seg of v.segments) {
      if (!seg.code) continue;
      const r = getTajweedRule(seg.code);
      if (r) cats.add(r.category);
    }
    if (cats.size >= minCategories) return v;
  }
  return null;
}

function countRuleSegments(v: VerseView): number {
  return v.segments.reduce(
    (n, s) => n + (s.code && getTajweedRule(s.code) ? 1 : 0),
    0
  );
}

/** Bank of distractor letters for letter-identify. Stripped of obvious overlap. */
const ARABIC_LETTER_BANK = [
  "ا", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ", "ر",
  "ز", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف",
  "ق", "ك", "ل", "م", "ن", "ه", "و", "ي",
];
