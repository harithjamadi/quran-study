import { describe, it, expect } from "vitest";
import { buildAyahIndex, recognizeAyah, type AyahEntry } from "./ayah-recognition";
import { buildRetrieval } from "../../scripts/lib/retrieval-mirror.mjs";

/**
 * The validation scripts measure retrieval quality through
 * scripts/lib/retrieval-mirror.mjs, a hand-maintained JS copy of this
 * module's pipeline. This suite pins the two implementations to each other:
 * if either side changes without the other, these assertions fail — the
 * harness must never silently benchmark a different algorithm than the app
 * ships.
 */
const CORPUS: AyahEntry[] = [
  { key: "1:1", text: "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ" },
  { key: "1:2", text: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ" },
  { key: "94:5", text: "فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا" },
  { key: "94:6", text: "إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا" },
  { key: "112:1", text: "قُلْ هُوَ ٱللَّهُ أَحَدٌ" },
  {
    key: "2:255",
    text: "ٱللَّهُ لَآ إِلَـٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ ۚ لَا تَأْخُذُهُۥ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُۥ مَا فِى ٱلسَّمَـٰوَٰتِ وَمَا فِى ٱلْأَرْضِ ۗ مَن ذَا ٱلَّذِى يَشْفَعُ عِندَهُۥٓ إِلَّا بِإِذْنِهِۦ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَىْءٍ مِّنْ عِلْمِهِۦٓ إِلَّا بِمَا شَآءَ ۚ وَسِعَ كُرْسِيُّهُ ٱلسَّمَـٰوَٰتِ وَٱلْأَرْضَ ۖ وَلَا يَـُٔودُهُۥ حِفْظُهُمَا ۚ وَهُوَ ٱلْعَلِىُّ ٱلْعَظِيمُ",
  },
  { key: "0:0", text: "كُرْسِيُّهُ وَسِعَ سِنَةٌ تَأْخُذُهُ" },
];

// Exact, fuzzy (one-letter misread), merged-word, re-rank flip, and a miss.
const QUERIES = [
  "الحمد لله رب العالمين",
  "رب الغالمين",
  "الحمد لله ربالعالمين",
  "قل هو اللهاحد",
  "مع العسر يسرا",
  "تأخذه سنة وسع كرسيه",
  "لا تأخذه سنة ولا نوم",
];

describe("retrieval-mirror parity", () => {
  const index = buildAyahIndex(CORPUS);
  const mirror = buildRetrieval(CORPUS);

  it.each(QUERIES)("agrees with the app pipeline on %s", (query) => {
    const app = recognizeAyah(index, query);
    const mirrored = mirror.recognize(query);
    expect(mirrored.top?.id ?? null).toBe(app?.key ?? null);
    expect(mirrored.matchedRange ?? null).toEqual(app?.matchedRange ?? null);
  });
});
