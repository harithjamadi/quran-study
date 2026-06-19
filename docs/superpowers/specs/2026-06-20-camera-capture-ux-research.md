# Camera Capture UX — "Google Lens for Tajweed" Research

**Date:** 2026-06-20
**Status:** R&D / Research (decide-then-build)
**Context:** Follow-up to `2026-06-19-camera-ayah-tajweed-recognition-design.md`. The text-input retrieval core (`/recognize`) now works. This studies the *camera* path: how to let a user point a phone at a Mushaf and accurately select the ayah/segment they mean, without capturing the wrong one — and without an LLM.

---

## 0. The core reframe

The user's worry — *"I can't think of a way to accurately capture the ayah or segment"* — assumes accuracy must come from the camera guessing correctly. It doesn't. Every robust scanner (Google Lens included) solves this with **human-in-the-loop selection + confirmation**:

> **Detect candidates → let the user select → confirm the match before acting.**

Google Lens's own region selection is literally "tap the image and drag the corners of the box around your selection." Accuracy is a *UX* property (select + confirm), not a pure-CV property. Our "what ayah is this" step also stays **closed-corpus retrieval** (the existing engine), so even noisy OCR resolves to an exact verse.

Shared pipeline for all approaches:

```
freeze frame → detect text regions (boxes) → USER selects a word / span / candidate
            → OCR only the selection (noisy) → retrieve exact ayah from corpus
            → SHOW match + confirm → render full-ayah tajweed, selection highlighted
```

Two principles that hold across approaches:
- **Detection ≠ recognition.** Finding *where* text is (boxes) is a separate, lighter model than reading *what* it says. PP-OCR ships both as separate stages.
- **The ۝ ayah-end markers** are natural per-ayah segmentation anchors — detecting them carves the page into ayah regions.

---

## 1. Landscape findings (2026)

**On-device OCR in the browser is viable now.**
- **PaddleOCR.js / PP-OCRv5** runs in-browser through **ONNX Runtime Web + WASM** (WebGPU where available); supports Arabic among 100+ languages; ~99% char accuracy on clean receipts. SDKs like `ppu-paddle-ocr` run the PP-OCRv5 graphs through ONNX in any JS host.
- PP-OCR is a **two-stage pipeline**: **DBNet** (Differentiable Binarization) text **detection** → bounding boxes, then a CRNN-style **recognition** head. The detection stage is what we need for box-based selection; it runs independently of recognition.
- **Tesseract.js** exists but trails modern engines by ~5–15 character points and is weak on non-Latin scripts — usable only as a baseline.
- **OnnxTR** (docTR-on-ONNX) is an alternative detection+recognition pipeline with ONNX export.

**A Quranic OCR dataset already exists.**
- The **Mushaf Al-Madinah** Quranic OCR dataset: **604 pages, 8,927 line-text images**, with diacritic Uthmanic labels, built for deep-learning research. Prior academic work trained CRNN/LSTM/GRU recognizers on it for diacritic Quranic text.
- Implication: the OCR-model track (previously "P3, hard") has **both** a real labeled dataset **and** our renderer-based synthetic-data generator. Materially de-risked.

**Caveat for Arabic Uthmanic specifically.** PP-OCR's generic Arabic head is tuned for everyday print; the dense stacked diacritics and calligraphic Uthmanic font are harder than receipts. Expect to **fine-tune** on the Mushaf dataset + synthetic data for production accuracy. Retrieval tolerance covers the gap during early stages.

---

## 2. The four approaches — feasibility, perf, effort

| | Approach | Detection model needed | OCR scope | On-device feasibility | Effort | "Wrong ayah" resistance |
|---|---|---|---|---|---|---|
| **B** | Reticle / ROI crop | None (fixed crop box) | Just the cropped ROI | Easy — crop canvas region | **Low** | Medium (user aims; still one shot) |
| **D** | Recognize-all → pick | DBNet (whole frame) | Whole frame, then retrieve all | Medium — full-frame detect+recog | **Medium** | **High** (pick from confirmed list) |
| **C** | Line-tap | DBNet line boxes | Tapped line only | Medium — line detect + crop | Medium | High (per-line, plus confirm) |
| **A** | True Lens word-select | DBNet word boxes | Tapped word / dragged span | Higher — word boxes + overlay UX | **High** | **High** (precise + confirm) |

### B — Reticle / ROI crop
A QR-scanner-style frame (or a single-line guide). User aligns the word(s) inside, taps capture; we OCR only the crop. **No detection model** — pure canvas crop. Ships fastest, proves the camera→OCR→retrieve→tajweed loop end-to-end. Weakness: the user does all the aiming, and small/curved print is fiddly.

### D — Recognize-all → pick (recommended first build)
Freeze frame → DBNet detects all text regions → OCR each → retrieve **every** ayah found → present a short, tappable **list of matched ayat** (rendered text, with confidence). User taps the right one → tajweed. **Directly eliminates the "wrong ayah" fear** by turning capture into pick-from-a-list confirmation. Leans on the corpus-retrieval strength; tolerant of messy framing. No precise targeting required.

### C — Line-tap
Detect text **lines** (easier/more stable than words) → overlay tappable line strips → user taps a line → OCR that line → retrieve. Good fit since Mushaf is line-organized. Ayat can span lines, so tapping may return a partial ayah → resolve to the full ayah via retrieval offset (consistent with the "whole ayah + highlight" decision for text input).

### A — True Lens word-select
Detect every **word box** (DBNet word-level), overlay them, user taps a word or drags handles across a span (Lens-style). Best, most precise UX — and it's the natural home for "select a *segment* of the tajweed." Heaviest: needs reliable word-box detection on dense Arabic + the selection-overlay interaction + the fine-tuned recognition head. Build this **after** D/C prove the loop.

---

## 3. Accuracy & confirmation design (applies to all)

- **Always confirm before showing tajweed.** Render the retrieved ayah text and a "Yes, that's it / No, pick another" control. This is the real accuracy guarantee.
- **Confidence-gate.** Below threshold or ambiguous → show top-N candidates, never a silent single guess. (Repeated phrases like `بسم الله` legitimately match multiple ayat — surface them.)
- **Use ۝ anchors** to validate: a detected ayah number should agree with the retrieved verse key.
- **Freeze, don't stream, early on.** A still frame is far more reliable to detect/OCR than live video; add live overlay only in a later polish phase.
- **Segment selection ties to the text decision:** selecting a word shows that word's rule *in full-ayah context* (cross-word rules), with the word highlighted — same model as snippet highlighting for typed input.

---

## 4. Recommended sequencing

1. **Now (no camera CV):** ship the **"whole ayah + highlight matched snippet"** enhancement for text input. Tiny, high-value, zero CV risk. Also seeds the highlight/selection rendering reused later.
2. **Camera step 1 — Approach B (reticle):** prove camera → crop → OCR (PaddleOCR.js) → retrieve → tajweed end-to-end. Real working camera path, lowest effort.
3. **Camera step 2 — Approach D (recognize-all → pick):** add DBNet full-frame detection + candidate-list confirmation. This is the "won't grab the wrong ayah" experience.
4. **Camera step 3 — Approach A (word-select):** upgrade to Lens-style tap/drag once the OCR head is fine-tuned on the Mushaf dataset + synthetic data. Enables true *segment* selection.

Each step is independently shippable and reuses the prior step's plumbing. The OCR model improves underneath all of them via the existing dataset + renderer synthetic data.

---

## 5. Open questions for the decision

- **OCR engine:** start with **PaddleOCR.js (PP-OCRv5)** off-the-shelf, accepting lower Uthmanic accuracy early; or invest up front in fine-tuning on the Mushaf dataset?
- **Privacy/perf:** fully on-device (WASM/WebGPU, private, offline) vs a server inference endpoint for the prototype (your t3.micro is too small — would need a bigger box).
- **First camera target:** B (fastest working loop) or jump to D (best wrong-ayah resistance)?

---

## Decisions (2026-06-20)

- **Text input:** show the **whole ayah with the matched snippet highlighted** (chosen & implemented — gold highlight on matched words, full-ayah context preserved for correct cross-word rules).
- **Target camera approach:** **A — true Lens-style word-select** (tap a word / drag a span). This is the committed end goal, not B/C/D. B/C/D may still serve as internal stepping stones, but the product target is A.
- **OCR engine strategy:** **fine-tune an Uthmanic OCR head up front** on the Mushaf Al-Madinah dataset + renderer synthetic data, rather than shipping off-the-shelf PP-OCR first. This is a dedicated ML track (dataset prep → train → ONNX export → on-device via ONNX Runtime Web) and must be planned separately before the camera UI can recognize text.

**Implication:** the camera path is now an ML-heavy effort (fine-tuned recognition + DBNet word detection + Lens selection UX), to be planned as its own milestone. The working text-retrieval core and snippet highlight ship independently in the meantime.

## Sources
- [PaddleOCR (GitHub)](https://github.com/PaddlePaddle/PaddleOCR) · [PaddleOCR-VL on Hugging Face](https://huggingface.co/docs/transformers/en/model_doc/paddleocr_vl) · [PaddleOCR Text Detection module](https://www.paddleocr.ai/main/en/version3.x/module_usage/text_detection.html)
- [Deterministic OCR in JavaScript: PaddleOCR for browser (DEV)](https://dev.to/awalariansyah/deterministic-ocr-in-javascript-paddleocr-for-node-bun-deno-and-the-browser-2bgn) · [Browser-based AI OCR with multiple engines (DEV)](https://dev.to/linmingren/building-a-browser-based-ai-ocr-tool-with-multiple-engines-1oop)
- [PaddleOCR vs Tesseract vs EasyOCR 2026 (CodeSOTA)](https://www.codesota.com/ocr/paddleocr-vs-tesseract) · [Technical Analysis of Non-LLM OCR Engines (IntuitionLabs)](https://intuitionlabs.ai/articles/non-llm-ocr-technologies)
- [OnnxTR (GitHub)](https://github.com/felixdittrich92/OnnxTR) · [Run YOLO in the browser with ONNX/WASM/Next.js (PyImageSearch)](https://pyimagesearch.com/2025/07/28/run-yolo-model-in-the-browser-with-onnx-webassembly-and-next-js/)
- [A Quranic Dataset for Text Recognition (ResearchGate)](https://www.researchgate.net/publication/336416201_A_Quranic_Dataset_for_Text_Recognition) · [Quranic Optical Text Recognition Using Deep Learning Models](https://www.researchgate.net/publication/349823290_Quranic_Optical_Text_Recognition_Using_Deep_Learning_Models)
- [Region selection in Google Lens (Google Search Help)](https://support.google.com/websearch/answer/14516623)
