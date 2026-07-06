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
