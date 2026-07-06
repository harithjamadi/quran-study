# Camera-Based Ayah & Tajweed Recognition — Feasibility / R&D Study

**Date:** 2026-06-19
**Status:** R&D / Feasibility (not a build commitment)
**Author:** Brainstorm session, Mubin
**Constraint:** No LLM API if avoidable. Offline-capable preferred.

---

## 0. The Idea in One Sentence

Point a phone camera at *any* printed Quran page, have the app identify exactly which ayah(s) are in frame, and overlay an accurate, detailed, well-explained Tajweed breakdown of that text — without using an LLM API.

This document reverse-engineers how the existing "Quran pen" works, explains why that approach **cannot** be copied to a plain camera, and lays out the genuinely viable path: **computer vision OCR + closed-corpus retrieval + a precomputed Tajweed table.**

---

## 1. Reverse-Engineering the "Quran Pen" (and why it doesn't transfer)

### 1.1 What the pen actually does

The digital Quran reading pen (Read Pen / M9 / "talking pen" family) feels like magic — touch any word on the page and it recites. People assume it "reads" or "recognizes" the Arabic. **It does not.** It uses **OID (Optical Identification) microdot technology**, the same family as Anoto digital paper.

How it works, layer by layer:

1. **Special paper.** The Mushaf sold with the pen is overprinted with a near-invisible grid of tiny dots (carbon/IR-absorbing ink) at high density (~hundreds of DPI). To the eye it looks like a faint grey tint or nothing at all. Each small patch of dots encodes a unique **position code** (think of it as invisible coordinates printed everywhere on the page).
2. **The pen tip.** Inside is an **infrared LED + a small IR camera (CMOS sensor)** sampling at a high frame rate. The IR illuminates the dot pattern; the normal printed ink is invisible in IR, but the special dots absorb/reflect distinctly, so the sensor sees *only the dot grid*.
3. **Decode → lookup.** An onboard chip decodes the local dot patch into a numeric code (a page/region/word ID or coordinate). That code is an index into an **audio file** stored on the pen's internal flash / microSD.
4. **Play.** The matching recitation audio plays. Done.

### 1.2 The crucial insight

**The pen is a position-keyed lookup table printed onto special media. It performs zero text recognition and zero Tajweed analysis.** It does not know what a word *means* or *how it's pronounced* — it knows *where your pen is on a page it was manufactured to understand*, and plays the file that was assigned to that location at print time.

### 1.3 Why this cannot be copied to a phone camera on a normal Mushaf

- A normal printed Quran (the "any printed Quran" target) has **no dot grid**. There is nothing positional to decode.
- A phone's camera has no IR illumination tuned to the dot ink, and the dots aren't there anyway.
- Therefore the pen's entire mechanism is unavailable. The phone has to do the thing the pen never does: **actually understand the visible Arabic text via computer vision.**

### 1.4 The one place the pen's idea *is* reusable (Approach C, later)

If you were willing to **distribute your own printed (or PDF) Mushaf with visible QR codes / fiducial markers** per page or per line, a phone camera could read those markers and do the same position→content lookup — cheaply replicating the pen with off-the-shelf tech. This is reliable but breaks the "any printed Quran" goal. Kept as a pragmatic fallback in §6.

---

## 2. Problem Reframing: This Is a Retrieval Problem, Not an OCR Problem

The single most important design realization:

> **The Quran is a closed, fixed, finite corpus** — exactly 6,236 ayat (in the standard counting), ~77,400 words, and the text never changes across editions. Letter-for-letter, every Mushaf prints the same words.

This changes everything. You are **never** doing open-ended transcription. You are **matching a camera image to one of a known, fixed set of strings.** That is dramatically more tractable and more accurate than general OCR, and it survives a noisy camera and imperfect recognition.

The governing principle of the whole system:

> **"Recognize roughly, retrieve exactly."**
> OCR only has to be good enough to *retrieve* the right ayah from 6,236 candidates — not good enough to transcribe perfectly. A noisy reading of 3–4 reasonably distinctive Quranic words is usually enough to pin the exact ayah with high confidence.

This is also what keeps the **no-LLM** constraint realistic: the hard "understanding" step collapses into a classical information-retrieval lookup.

---

## 3. Core Architecture / Pipeline

```
┌─────────────┐   ┌──────────────┐   ┌──────────────────┐   ┌──────────────┐
│  Camera     │ → │ Preprocess   │ → │ Layout Analysis  │ → │ Arabic OCR   │
│  frame      │   │ deskew/      │   │ line segment +   │   │ (noisy text) │
│  (getUser-  │   │ dewarp/      │   │ ۝ ayah-marker    │   │              │
│   Media)    │   │ binarize     │   │ detection        │   │              │
└─────────────┘   └──────────────┘   └──────────────────┘   └──────┬───────┘
                                                                    │
        ┌───────────────────────────────────────────────────────── ┘
        ▼
┌──────────────────┐   ┌────────────────────────┐   ┌───────────────────────────┐
│ Normalize to     │ → │ Fuzzy retrieval against│ → │ Tajweed lookup (precomputed│
│ "rasm" skeleton  │   │ closed 6,236-ayah index│   │ per-letter rules) + aligned│
│ (strip/normalize │   │ → exact ayah + offset  │   │ overlay + bilingual detail │
│  diacritics etc) │   │ + confidence           │   │ panel (EN/MS)              │
└──────────────────┘   └────────────────────────┘   └───────────────────────────┘
```

### 3.1 Stage-by-stage

**A. Capture.** Browser `getUserMedia` video stream; grab frames. Provide a framing guide overlay ("hold the page flat, fill the box"). Optionally capture a still on tap for a high-res single-shot mode (more reliable than live video early on).

**B. Preprocess.**
- Page/quad detection (find the page rectangle), perspective correction (homography) to flatten.
- **Dewarp** for page curl near the spine (cylindrical unwarp) — books don't lie flat.
- Denoise, adaptive binarization (Sauvola/Otsu), contrast normalization, glare reduction.

**C. Layout analysis (RTL-aware).**
- Line segmentation (projection profiles / connected-component grouping), right-to-left order.
- **Detect ۝ ayah-end markers** — the decorative circle enclosing the ayah number. These are *visually distinctive* and a **gold anchor**: detecting even one ayah number massively constrains the search and lets you cross-check the OCR-based match.
- Optional word segmentation for finer alignment of the overlay.

**D. Arabic OCR (recognition).** Produces noisy text per line/word. Model options in §4.

**E. Normalization to "rasm".** Map OCR output and the corpus into the same canonical form before matching:
- Strip or normalize diacritics (harakat, sukun, shadda, tanwin).
- Unify letter variants: alif forms (ا أ إ آ), hamza seats, ya / alif maqsura (ي ى), ta marbuta / ha (ة ه), etc.
- This "rasm skeleton" is far more robust to OCR errors than raw diacritized text.

**F. Fuzzy retrieval (the heart).** Match normalized OCR text to the corpus index → return ayah ID, in-ayah offset, and a confidence score. Algorithm in §5. Cross-validate with any detected ayah-number markers.

**G. Tajweed lookup & overlay.** Once the ayah is known, fetch its **precomputed per-letter Tajweed annotations** (the rules don't depend on the camera — they're deterministic for fixed text). Render:
- A live overlay aligning colored rule highlights to the detected words on screen.
- A detail panel: rule name (bilingual EN/MS), what it is, *why* it applies here, *how* to pronounce it (link into existing Foundations / Makhraj Explorer content), the count/duration (e.g., madd length in harakat).

---

## 4. The OCR Engine — Options & The Data Unlock

Arabic OCR on the **Uthmanic script** with full diacritics and varied fonts is the genuinely hard part of this project. Honest assessment of options:

| Option | Pros | Cons |
|---|---|---|
| **Tesseract (`ara`)** | Off-the-shelf, free, runs anywhere incl. WASM | Weak on dense diacritics & Uthmanic fonts; baseline only |
| **Kraken / Calamari (trained model)** | Built for historical/script OCR; trainable | Needs training data & pipeline work |
| **Custom CRNN + CTC** | Tunable to exactly our fonts; small & fast; on-device friendly | Must train; engineering effort |
| **TrOCR-style transformer (fine-tuned)** | Highest accuracy ceiling | Heavy; harder on-device; borderline "is it an LLM?" (it's a vision-seq model, not a chat LLM — still acceptable under the constraint, but heavier) |

**Recommended:** start with **Tesseract as a baseline** to validate the *retrieval* half cheaply, then move to a **custom-trained CRNN+CTC** (or Calamari) tuned to Quranic fonts for production accuracy. Keep it a CV model, not a chat LLM — fully consistent with the no-LLM constraint.

### 4.1 The data unlock (this is the big one)

Arabic Quranic OCR normally fails for lack of **labeled training data**. Mubin sidesteps this entirely:

> **The app already has a pixel-accurate Mushaf renderer and the exact, known text.** That means you can *synthesize unlimited perfectly-labeled training pairs* — `(rendered line image, known ground-truth text)` — across:
> - many Arabic/Quranic **fonts** (to generalize to "any printed Quran"),
> - sizes, weights, line spacings,
> - augmentations that mimic camera reality: blur, JPEG noise, rotation/skew, perspective warp, page-curl warp, glare/shadow gradients, paper texture, low light.

This converts the project's biggest blocker (data) into a deterministic data-generation script. It's the strongest argument that "any printed Quran" is achievable. (You'll still want a smaller set of *real* photographed pages for a held-out validation set, since synthetic never fully matches reality.)

---

## 5. The Retrieval / Matching Algorithm

Goal: given noisy normalized text, return the correct ayah from 6,236 candidates, robustly.

**Index build (offline, once):**
- For every ayah, produce its rasm-normalized word sequence.
- Build an **inverted index** over normalized words and over **character n-grams** (e.g., 3–4 grams) so partial/garbled words still hit.
- Also index **sliding word-windows** (e.g., every 4–6 consecutive words) so a mid-ayah camera crop still retrieves, with the in-ayah offset.

**Query time:**
1. Normalize OCR output to rasm.
2. Candidate generation: char-n-gram / word inverted-index lookup → top-K candidate ayat (fast, cheap).
3. Re-rank candidates with a **sequence-aware fuzzy score**: weighted token edit distance / longest-common-subsequence over the word sequence (handles insertions, deletions, swapped letters from OCR).
4. **Cross-check** with detected ۝ ayah-number(s): if an ayah number was read, it should agree with the matched ayah's surah:ayah — a strong confidence boost or a tie-breaker.
5. Return `(surah, ayah, in-ayah offset, confidence)`. Below a confidence threshold → "couldn't read clearly, try again" UX rather than a confident wrong answer.

All of this is classical IR — **no LLM, fully offline, milliseconds.** The whole corpus + index is small enough to ship to the client.

---

## 6. Approaches Considered (with recommendation)

### ⭐ Approach A — OCR + closed-corpus fuzzy retrieval *(recommended core)*
- Generalizes to **any edition** (the stated goal).
- Hard part is OCR; mitigated by (i) retrieval tolerance, (ii) ۝ anchors, (iii) the synthetic-data unlock for training.
- No LLM, offline-capable, accurate Tajweed via precomputed table.

### Approach B — Visual word-spotting / glyph-template matching (no text recognition)
- Match image patches against templates of rendered glyphs/words.
- Reliable **only for a known font/edition**; does **not** generalize to "any printed Quran" (every font breaks it).
- Would have fit the single-standard-Mushaf path (rejected). Useful internally as a fast proving ground in Phase 2.

### Approach C — Marker-assisted (replicate the pen with QR/fiducials)
- Distribute your own Mushaf (print or PDF) with visible QR/fiducial markers per page/line.
- Phone reads marker → position → content lookup. **Near-perfect reliability, trivial to build.**
- Breaks "any printed Quran," but is a legitimate **fallback product** (a "Mubin Mushaf") and a great way to ship value fast while the OCR path matures.

**Recommendation:** Build **A** as the real answer, use **B** as an internal stepping stone in Phase 2, and keep **C** in the back pocket as a low-risk product that delivers the pen experience immediately if the general-OCR path stalls.

---

## 7. No-LLM Justification

Every "smart" step has a non-LLM home:

| Step | Technique | LLM needed? |
|---|---|---|
| Understand the image | CV OCR model (CRNN/Calamari/Tesseract), self-hosted or on-device | No |
| Figure out which ayah | Classical IR (inverted index + fuzzy re-rank) | No |
| Tajweed rules | Deterministic rule engine over fixed text, **precomputed once** | No |
| Explanations ("why/how") | A **finite, authored** bilingual content set per rule (you already have Foundations content) | No |

The only place an LLM is *tempting* is generating explanation prose — but because there's a small fixed set of Tajweed rules, you author those explanations once. No runtime LLM, no per-request cost, fully offline, and more *accurate* (authored by a qualified reviewer) than generated text.

---

## 8. Where the Computation Runs

- **Constraint:** current deploy is a single AWS **t3.micro (~1 GB RAM, 2 burstable vCPU)** — too small to host a heavy OCR model under load.
- **On-device (recommended direction):** run OCR via **ONNX Runtime Web / TensorFlow.js / WASM** in the browser. Pros: private (camera frames never leave the phone — fitting for a reverent product), offline, zero per-inference server cost, scales infinitely. Cons: model size and phone CPU/GPU limits; needs a compact model (favors CRNN over big transformers).
- **Server-side (prototype path):** a dedicated inference box (bigger instance, or serverless GPU) for early experiments where iteration speed matters more than scaling. Move on-device for production.
- The **corpus + retrieval index + Tajweed table** are small — ship to client regardless.

---

## 9. Phased Roadmap

> Ordered so each phase delivers value and de-risks the next. Earlier phases need **no camera and no OCR**, so they ship fast and prove the UX + Tajweed accuracy independently of the hardest component.

- **P0 — Data foundation.**
  - Assemble the closed corpus (text + surah/ayah/word indices).
  - Build the **per-letter Tajweed annotation table** for the whole Quran (reuse existing Tajweed coloring engine).
  - Build the **synthetic training-data generator** from the existing Mushaf renderer (multi-font + augmentation).

- **P1 — Retrieval core, no camera.**
  - Given typed/pasted/picked Arabic text → return ayah + the full Tajweed overlay and bilingual breakdown panel.
  - Proves the lookup + the entire Tajweed-display UX cheaply, end to end. **Big early win, zero CV risk.**

- **P2 — Single-edition camera (proving ground).**
  - Get camera → ayah working on the **standard Madinah 15-line Mushaf** using ۝-anchor + template/word-spotting (Approach B).
  - Validates the capture → preprocess → layout → retrieval → overlay loop on one known edition before fighting font generalization.

- **P3 — General OCR ("any printed Quran").**
  - Train the Arabic OCR model on synthetic data; wire OCR → normalization → retrieval.
  - Validate against a held-out set of **real photographed** pages across editions, lighting, devices.

- **P4 — Live AR overlay + on-device optimization.**
  - Real-time highlighting on the live video, on-device WASM model, performance/battery tuning, graceful low-confidence UX.

---

## 10. Risks & Accuracy Realities (read before committing)

- **Uthmanic OCR is hard.** Dense stacked diacritics and ornate fonts cause recognition errors. *Mitigation:* "recognize roughly, retrieve exactly" + rasm normalization + ۝ anchors + synthetic multi-font training. The retrieval layer is what makes imperfect OCR usable.
- **Camera conditions.** Glare, shadow, page curl, low light, motion blur, tiny print, decorative borders. *Mitigation:* dewarp/deglare preprocessing, framing guide, still-shot mode before live mode, confidence-gated "try again" UX.
- **Synthetic-to-real gap.** Models trained only on rendered text underperform on real photos. *Mitigation:* aggressive augmentation + a real-photo validation/fine-tune set.
- **On-device performance.** Big models won't run smoothly on mid-range phones. *Mitigation:* compact CRNN, quantization, frame throttling, optional server fallback.
- **Tajweed correctness is independent of the camera** — it depends on the rule engine over fixed text. Get a qualified reviewer to validate the rule table; this is where "very accurate, detailed, well-explained" is actually won. The camera just *finds* the ayah; the scholarship lives in the precomputed table and authored explanations.
- **Confident-wrong is the worst failure** for a reverent product. Always prefer "I couldn't read that clearly" over a wrong ayah. Threshold on retrieval confidence and require ۝-anchor agreement for high-stakes display.

---

## 11. Existing Assets That De-Risk This

- **Pixel-accurate Mushaf renderer** → synthetic OCR training data + Approach B templates.
- **Existing Tajweed coloring/rule system** → the precomputed Tajweed table (P0) is mostly already built.
- **Foundations track + Makhraj Explorer** → ready-made "how to pronounce" destinations for the detail panel.
- **Bilingual EN/MS content discipline** → explanation set fits existing i18n.

---

## 12. Bottom Line

- The pen is **microdots on special paper**, not vision — its method does not transfer, but understanding it clarifies what you actually have to build.
- "Any printed Quran" is **feasible without an LLM**, because the Quran is a **closed corpus** and the job is *retrieval*, not transcription.
- The **single hardest piece is Arabic OCR**, and Mubin is unusually well-positioned to crack it via **synthetic training data from its own renderer.**
- Recommended path: **Approach A core**, **B as a proving ground**, **C as a fast fallback product**, delivered in a phased roadmap where the UX and Tajweed accuracy ship *before* the camera does.
```

