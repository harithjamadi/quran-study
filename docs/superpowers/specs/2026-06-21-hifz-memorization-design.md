# Hifz (Memorization) Track — Design Spec

**Date:** 2026-06-21
**Status:** Design (locked scope, ready for planning)
**Author:** Brainstorm session, Mubin
**Constraint:** No LLM API if avoidable. Offline-capable, private (recitation never leaves the device). No automatic speech grading in the core.

---

## 0. The Idea in One Sentence

A memorization track that helps a learner **acquire** an ayah (hear it, repeat it, recite it from a progressively-hidden page) and then **retain** it — by scheduling each memorized ayah for review with the FSRS engine Mubin already ships for vocabulary.

---

## 1. Why Mubin Is Unusually Well-Positioned for Hifz

The governing insight:

> The hard part of hifz is **not acquiring** an ayah — most people can repeat a short ayah after a few listens. The hard part is **retaining** it long-term and **joining** it to its neighbours. Retention is a spaced-repetition problem, and Mubin already runs a production FSRS scheduler (`ts-fsrs`) with persistence, streaks, XP, and migrations.

Most hifz apps are audio players or flashcard decks with no real retention model. Mubin can ship the retention loop on day one because it already exists for vocabulary — the Hifz track reuses the same scheduler against a different unit (ayat instead of lemmas).

Three existing assets map directly onto the three things a hifz tool must do:

| Hifz need | Existing Mubin asset |
|---|---|
| **Acquire** (hear → repeat → solo, "talqin") | Verse audio + qari selection, `AudioShadowing` (MediaRecorder listen/record/compare) |
| **Test recall** (recite from memory, check) | Pixel-accurate Mushaf renderer + Arabic typography for progressive reveal |
| **Retain** (schedule the next review) | `ts-fsrs`, `src/lib/learning.ts`, `src/store/learning.ts` (FSRS state, streaks, XP, badges) |

---

## 2. Locked Decisions (from brainstorming)

1. **Core scope = Approach A:** SRS-scheduled memorization with progressive reveal. Talqin audio is the acquisition step; FSRS is the retention engine.
2. **Grading = self-assessment.** The learner judges their own recall. No automatic speech recognition in the core (see §9). Reuse the **existing 3-grade scale** `again | good | easy` (`learning.ts:65`) rather than introducing a divergent fourth grade — consistency with vocabulary, and the FSRS wrapper is already wired for exactly these three ratings.
3. **Unit = ayah, page-aware.** The atomic memorization unit is the ayah, but progress is grouped and tracked by **Mushaf page** so it maps onto the real 15-line Madani layout the reader already renders.

**Deferred to later phases (explicitly out of core):**
- **Rabt** (ayah→ayah transition drills) — the highest-value differentiator after the core loop proves out.
- **Mutashabihat** (similar/confusable verses) — depends on a precomputed similarity index.
- **Page-anchored / photographic memorization** (memorize whole pages on the 15-line layout) — heaviest UI; revisit after the ayah loop ships.

---

## 3. The Memorization Model

Each ayah a learner is memorizing moves through a lifecycle that mirrors how the existing vocabulary FSRS states (`New → Learning → Review → Relearning`) already work — so we get the lifecycle for free.

```
   ┌──────────┐   acquire (talqin)   ┌───────────┐   self-grade recall   ┌──────────┐
   │  Queued  │ ───────────────────▶ │ Acquiring │ ────────────────────▶ │ Retaining│
   │ (chosen, │   listen→repeat→solo │ (Learning │   again/good/easy     │ (Review, │
   │  not yet)│                      │  state)   │                       │  FSRS due│
   └──────────┘                      └───────────┘                       └────┬─────┘
                                            ▲                                  │ due again
                                            └──────── lapse (again) ◀──────────┘
```

- **Queued** — the learner has picked this page/range to memorize; ayat not yet started.
- **Acquiring** — going through the talqin acquisition step, then early recall reps. Maps to FSRS `Learning`/`Relearning`.
- **Retaining** — committed; FSRS schedules spaced reviews. Maps to FSRS `Review`. Stability ≥ a threshold can surface a "strong"/"solid" status, reusing `statusOf` semantics.

A daily Hifz session = **(new ayat to acquire today) + (ayat due for review today)** — exactly the vocabulary session shape, applied to ayat.

---

## 4. Data Model

### 4.1 The corpus side (static, precomputed)

The Quran is a closed corpus (6,236 ayat). For Hifz we need, per ayah, data the app already has or can derive:
- Surah, ayah number, **Mushaf page** (already known — the reader renders pages), line position on the page.
- Uthmanic text (already rendered by the Mushaf).
- Verse audio URL per qari (already resolved by `verse-audio.ts`).
- Word boundaries for progressive reveal (already available via word-level data used by `InteractiveVerse` / `words.ts`).

No new corpus build is required for the core — it's a re-projection of data the reader and audio layers already use.

### 4.2 The learner side (new persisted state)

A **separate FSRS-backed store** for ayat, parallel to `learning.ts` lemmas — *not* merged into the lemma map (different unit, different lifecycle, cleaner migrations). Reuse the pure helpers (`applyGrade`, `freshLemmaState`, `statusOf`, `isDue`, `isConsecutiveDay`, `localDateKey`) unchanged — they're already side-effect-free and unit-tested by design.

```ts
// Keyed by "surah:ayah", e.g. "2:255"
interface AyahHifzState extends LemmaState {  // reuse the FSRS LemmaState shape
  // FSRS fields inherited: due, stability, difficulty, state, reps, lapses,
  // lastReview, scheduledDays, learningSteps
}

interface HifzStore {
  ayat: Record<string, AyahHifzState>;   // "surah:ayah" → FSRS state
  // page-aware grouping is derived (page → list of "surah:ayah"), not stored
  plan: { surah: number; fromAyah: number; toAyah: number } | null; // current memorization target
  dailyNewGoal: number;     // how many fresh ayat to acquire per day (separate from vocab dailyGoal)
  // streaks/XP: reuse the shared learning streak, or a hifz-specific one — see §8
}
```

**Why a separate store, not the lemma map:** ayat and lemmas have different keys, different review UIs, and different "what counts as done." Keeping them separate avoids polluting comprehension-% math (which is lemma-token based) and keeps the persist migration for each independent. Follow the existing `persist` + `createJSONStorage` + versioned `migrate` pattern from `store/learning.ts`; new storage key e.g. `mubin.hifz.v1`.

---

## 5. The Core Loop, UI/UX

Route: `/learn/hifz` (dashboard) + `/learn/hifz/session` (the daily session runner), matching the existing `/learn/*` structure (`learn/session`, `learn/vocabulary`, etc.).

### 5.1 Hifz dashboard (`/learn/hifz`)
- **Current plan** card: "Memorizing Surah Al-Mulk, ayat 1–10 — 4 acquired, 2 due today."
- **Page-aware progress**: a strip showing the target page(s) with each ayah tinted by status (queued / acquiring / retaining / solid), reusing `statusColor` semantics.
- **Start session** CTA → `/learn/hifz/session`.
- **Pick what to memorize**: choose a surah or a page range. Sensible defaults huffaz actually use (Juz Amma / short surahs first).

### 5.2 The session runner (`/learn/hifz/session`)
Mirrors `SessionRunner` / `SessionClient` structure. Two interleaved card types:

**Acquisition card (new ayah today):** the talqin step (§6). Ends by promoting the ayah into the FSRS schedule (first `good`/`easy`).

**Recall card (due ayah):** the progressive-reveal test (§7), ending in a self-grade `again / good / easy` that calls `applyGrade` and reschedules.

Session end: XP earned, streak bump, any badges, "next review in N days" summary — reusing the existing session-complete UI language.

---

## 6. Acquisition Step (Talqin)

Built entirely on existing audio + recorder assets. Three sub-steps for a fresh ayah, the classic teacher loop:

1. **Listen** — play the qari's recitation of the ayah (looped N times, count configurable). Text fully visible, optionally with word highlight synced to audio if timing data exists; otherwise plain.
2. **Repeat** — play again; learner recites along. Optional MediaRecorder capture (reuse `AudioShadowing`) so they can listen back and self-compare against the original. No grading — comparison is for the learner's own ear.
3. **Solo** — text hidden or dimmed; learner recites alone, then reveals to confirm. First real recall → first FSRS grade, moving the ayah from Queued → Acquiring/Retaining.

All offline-capable except the audio fetch (already how the reader's audio works).

---

## 7. Progressive Reveal (the recall mechanic)

The recall test for a due ayah. The ayah is shown with words **masked**, and the mask level adapts to how well the ayah is known (driven by FSRS stability / reps):

- **Light** (early): only the last word(s) of each phrase hidden — fill-in-the-blank.
- **Medium**: every other word, or the back half of the ayah hidden.
- **Heavy** (solid): only the first word shown as a prompt ("recite from here").
- **Full**: ayah number / first letter only — recite the whole thing.

Masked words render as styled placeholders preserving Arabic letter-width/RTL so the visual rhythm of the page is preserved (important for page-anchored memory later). Word boundaries come from existing word-level data (`words.ts` / `InteractiveVerse`).

Interaction: tap a masked word to peek (counts against the grade), then **reveal all** → self-grade `again / good / easy`. "Needed lots of peeks" nudges the learner toward `again`/`good`; clean recall → `easy`. (We surface guidance text, but the final grade is the learner's — consistent with the self-grade decision.)

---

## 8. Gamification & Streaks

Reuse the existing gamification vocabulary (badges, XP, streaks) — but **keep hifz milestones quiet and meaningful** per PRODUCT.md's "earn decoration / scholarship over gamification" principle. Candidate hifz badges (new `BadgeId`s in the badge system):

- `first_ayah_memorized` — first ayah reaches Retaining.
- `first_page` — a full Mushaf page memorized (all ayat on it Retaining) — ties into page-awareness.
- `juz_amma` — Juz 30 complete.
- `surah_complete_<n>` style or a generic "surah memorized" badge.
- Retention badges, e.g. an ayah held at high stability for 30+ days ("solid").

**Streak decision (open, low-stakes):** either fold hifz reviews into the existing shared `dayStreak` (one learning streak across vocab + tajweed + hifz — simplest, matches "come back daily") or a hifz-specific streak. Recommend **shared streak** to avoid streak-anxiety multiplication (PRODUCT.md anti-reference: no Duolingo streak pressure). Default to shared unless review says otherwise.

XP: reuse `XP_REWARDS` (`easy:15, good:10, again:0`); acquisition of a new ayah can grant a small one-time bonus.

---

## 9. No-LLM / Privacy Justification

| Step | Technique | LLM / cloud needed? |
|---|---|---|
| Acquire (talqin) | Existing qari audio playback + local MediaRecorder | No |
| Test recall | Progressive reveal over known text + self-grade | No |
| Schedule retention | FSRS (`ts-fsrs`), deterministic, local | No |
| Decide what's due today | `isDue` over local persisted state | No |

Recitation audio (the repeat step) stays **on-device** via MediaRecorder, never uploaded — fitting for a reverent product and avoiding the "confidently wrong" failure of auto-grading speech.

**Deferred ML milestone (not core):** on-device ASR to *assist* self-grading (compare recitation to known text, suggest a grade). Treat exactly like the Uthmanic-OCR milestone in the recognition spec — a later, optional, on-device model that augments but never replaces the learner's own judgement. Keep "self-grade" authoritative.

---

## 10. Bilingual (EN/MS)

All UI strings bilingual EN/MS per PRODUCT.md and the existing learn components. Hifz/Tajwid terminology in natural Malaysian Malay (consistent with the natural-Malay pass noted for the Tajweed features): e.g. "Hafazan" for memorization, "Murajaah" for review/revision (the term huffaz actually use), "Talqin" for the listen-repeat step. Reuse the bilingual `name/description/hint` badge shape already in `BADGES`.

---

## 11. Phased Roadmap

Ordered so each phase ships value and de-risks the next; the retention loop ships before the heavier UI.

- **P0 — Data projection & store.**
  - Derive the per-ayah projection (surah, ayah, page, word boundaries, audio URL) from existing reader/audio/word data — no new corpus build.
  - New `mubin.hifz.v1` FSRS-backed store (`ayat` map, `plan`, `dailyNewGoal`), reusing `learning.ts` helpers. Unit tests mirroring `learning.test.ts`.

- **P1 — Recall core, minimal acquisition (the retention win).**
  - `/learn/hifz` dashboard + `/learn/hifz/session` runner.
  - Progressive-reveal recall card + self-grade → FSRS reschedule. Plain "listen + show text" acquisition (defer the full talqin polish).
  - Page-aware progress strip. **This is the early win: real spaced-repetition hifz, end to end, no new infra.**

- **P2 — Full talqin acquisition.**
  - Listen→repeat→solo with looped audio and optional MediaRecorder self-compare (reuse `AudioShadowing`).
  - Adaptive mask levels tied to FSRS stability.

- **P3 — Gamification & polish.**
  - Hifz badges, dashboard integration into `LearnDashboard`, streak wiring, bilingual pass, accessibility (reduced-motion reveal, RTL/diacritic-safe masking, contrast).

- **P4 — Differentiators (was deferred scope).**
  - **Rabt** transition drills ("recite the ayah after this").
  - **Mutashabihat** confusable-verse disambiguation (needs a precomputed similarity index).

- **P5 — Page-anchored memorization & optional on-device ASR assist.**
  - Whole-page reveal drills on the 15-line layout; optional ASR grade-suggestion milestone.

---

## 12. Risks & Realities

- **Self-grading is subjective.** Learners may over- or under-rate recall, degrading FSRS scheduling. *Mitigation:* peek-count + reveal behaviour as honest signals nudging the suggested grade; clear guidance copy; learner stays authoritative.
- **Scope creep into ASR.** The temptation to auto-grade recitation is strong. *Mitigation:* hard line — ASR is a P5 *assist*, never core; self-grade ships first and remains authoritative.
- **Audio dependency.** Talqin needs network for audio (same as the reader today). *Mitigation:* allow recall-only sessions offline; cache audio where feasible.
- **Streak anxiety.** Adding a third streakable activity risks the Duolingo feeling PRODUCT.md rejects. *Mitigation:* shared single streak; quiet milestones.
- **Word-boundary masking on Uthmanic text.** Masking must preserve RTL flow and diacritic-heavy width. *Mitigation:* placeholder glyphs sized to the masked word; reuse existing word-level rendering; validate on real pages.
- **Page-awareness accuracy.** Ayah→page mapping must match the rendered 15-line Mushaf exactly. *Mitigation:* derive from the same page data the reader uses, not a separate source.

---

## 13. Existing Assets That De-Risk This

- **`ts-fsrs` + `learning.ts`/`learning.test.ts`** → retention engine and tested pure helpers, reused verbatim.
- **`store/learning.ts` persist/migrate pattern** → template for the hifz store.
- **Pixel-accurate 15-line Mushaf + word-level data** → progressive reveal and page-awareness.
- **Verse audio + qari (`verse-audio.ts`) + `AudioShadowing`** → the entire talqin acquisition step.
- **Badge/XP/streak system** → gamification with near-zero new infra.
- **Bilingual EN/MS discipline** → strings and badges fit existing i18n.

---

## 14. Bottom Line

- Mubin's **unfair advantage for hifz is retention**: a production FSRS scheduler already exists, so spaced-repetition memorization ships on day one by pointing the same engine at ayat instead of lemmas.
- The core is **acquire (talqin) → test (progressive reveal) → retain (FSRS)**, all built on assets already in the app, **no LLM and no cloud speech grading**.
- Scope is locked to **Approach A, self-grade (existing 3-grade scale), ayah-unit/page-aware**; rabt, mutashabihat, and page-memorization are sequenced as later phases.
- Phased so the **retention loop (P1) ships before** the heavier talqin and differentiator UI — proving the highest-value, lowest-risk piece first.
