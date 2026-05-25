/**
 * Tajweed rule metadata library.
 *
 * Codes come from the quran-tajweed edition served by alquran.cloud,
 * which embeds annotations as [code[text] spans inside the Arabic verse string.
 */

export type TajweedCategory =
  | "madd"
  | "noon_tanween"
  | "meem"
  | "qalqalah"
  | "ghunna"
  | "hamza_lam"
  | "waqf";

export interface TajweedRule {
  code: string;
  name: { ar: string; en: string; ms: string };
  /** CSS hex color for light mode */
  color: string;
  /** CSS hex color for dark mode (slightly brighter/more saturated) */
  colorDark: string;
  category: TajweedCategory;
  letters?: string;
  condition: { en: string; ms: string };
  howToRead: { en: string; ms: string };
}

export const TAJWEED_RULES: Record<string, TajweedRule> = {
  // ── Hamza & Lam ─────────────────────────────────────────────────────────────
  h: {
    code: "h",
    name: { ar: "همزة الوصل", en: "Hamzat Wasl", ms: "Hamzat Wasl" },
    color: "#9CA3AF",
    colorDark: "#6B7280",
    category: "hamza_lam",
    condition: {
      en: "A connecting hamzah (ٱ) that is not pronounced when preceded by another word in continuous recitation.",
      ms: "Hamzah penghubung (ٱ) yang tidak disebut apabila didahului oleh perkataan lain dalam bacaan berterusan.",
    },
    howToRead: {
      en: "Skip the opening hamzah entirely and continue from the following letter. It is only pronounced when starting fresh from this word.",
      ms: "Langkau hamzah pembuka dan teruskan ke huruf berikutnya. Hanya disebut apabila memulakan bacaan dari perkataan ini.",
    },
  },
  l: {
    code: "l",
    name: { ar: "اللام الشمسية", en: "Lam Shamsiyya", ms: "Lam Syamsiyyah" },
    color: "#9CA3AF",
    colorDark: "#6B7280",
    category: "hamza_lam",
    letters: "ت ث د ذ ر ز س ش ص ض ط ظ ل ن",
    condition: {
      en: "The lam (ل) of the definite article ال when followed by a 'sun letter' (حروف شمسية). There are 14 sun letters.",
      ms: "Lam (ل) dalam artikel penentu ال apabila diikuti oleh 'huruf syamsiyyah'. Terdapat 14 huruf syamsiyyah.",
    },
    howToRead: {
      en: "Merge the lam silently into the following sun letter — the sun letter receives a shadda (doubling). Do not pronounce lam separately.",
      ms: "Gabungkan lam secara senyap ke dalam huruf syamsiyyah berikutnya — huruf tersebut mendapat syaddah (penggandaan). Jangan sebut lam secara berasingan.",
    },
  },

  // ── Madd (Prolongation) ─────────────────────────────────────────────────────
  n: {
    code: "n",
    name: { ar: "المد", en: "Madd (Superscript Alif)", ms: "Mad (Alif Berdiri)" },
    color: "#60A5FA",
    colorDark: "#93C5FD",
    category: "madd",
    condition: {
      en: "A superscript alif (ـٰ or ٰ) indicates a prolonged alif sound that is written above the letter rather than after it.",
      ms: "Alif berdiri (ـٰ atau ٰ) menunjukkan bunyi alif yang dipanjangkan yang ditulis di atas huruf.",
    },
    howToRead: {
      en: "Extend the vowel sound for 2 counts (harakat). The superscript alif is a writing convention — pronounce it as a full long alif.",
      ms: "Panjangkan bunyi vokal selama 2 harakat. Alif berdiri adalah konvensyen penulisan — sebut sebagai alif panjang penuh.",
    },
  },
  p: {
    code: "p",
    name: { ar: "المد الطبيعي", en: "Madd Tabee'i", ms: "Mad Tabii" },
    color: "#38BDF8",
    colorDark: "#7DD3FC",
    category: "madd",
    letters: "ا و ي",
    condition: {
      en: "A natural (tabee'i) madd occurs when a madd letter (ا و ي) follows its matching vowel: alif after fatha, waw after damma, ya after kasra — with no hamza or sukun following.",
      ms: "Mad tabii berlaku apabila huruf mad (ا و ي) mengikuti vokal sepadan: alif selepas fathah, waw selepas dhammah, ya selepas kasrah — tanpa hamzah atau sukun berikutnya.",
    },
    howToRead: {
      en: "Extend the sound for exactly 2 counts (harakat). This is the baseline madd — no more, no less.",
      ms: "Panjangkan bunyi tepat 2 harakat. Ini adalah mad asas — tidak lebih, tidak kurang.",
    },
  },
  o: {
    code: "o",
    name: { ar: "المد المنفصل", en: "Madd Munfasil", ms: "Mad Munfasil" },
    color: "#3B82F6",
    colorDark: "#60A5FA",
    category: "madd",
    condition: {
      en: "A separated madd occurs when a madd letter at the end of one word is followed by a hamzah at the start of the next word.",
      ms: "Mad munfasil berlaku apabila huruf mad di akhir sesuatu perkataan diikuti oleh hamzah di awal perkataan berikutnya.",
    },
    howToRead: {
      en: "Extend for 4–5 counts (harakat). The exact count depends on the recitation style (Hafs: typically 4 or 5).",
      ms: "Panjangkan selama 4–5 harakat. Bilangan tepat bergantung pada gaya bacaan (Hafs: lazimnya 4 atau 5).",
    },
  },
  m: {
    code: "m",
    name: { ar: "المد اللازم الحرفي", en: "Madd Lazim Harfi", ms: "Mad Lazim Harfi" },
    color: "#2563EB",
    colorDark: "#93C5FD",
    category: "madd",
    condition: {
      en: "An obligatory letter madd found in the disjointed letters (حروف مقطعة) that open certain surahs, such as الم, الر, طه, يس.",
      ms: "Mad lazim harfi yang terdapat pada huruf muqatta'at yang membuka beberapa surah, seperti الم, الر, طه, يس.",
    },
    howToRead: {
      en: "Extend for exactly 6 counts (harakat). This is mandatory (lazim) — there is no variation allowed.",
      ms: "Panjangkan tepat 6 harakat. Ini adalah wajib (lazim) — tiada variasi dibenarkan.",
    },
  },
  s: {
    code: "s",
    name: { ar: "المد الصلة", en: "Madd Silah", ms: "Mad Silah" },
    color: "#7DD3FC",
    colorDark: "#BAE6FD",
    category: "madd",
    condition: {
      en: "A connection madd that appears in certain written letters (like the waw in الصلاة) that have a prolonged sound in Uthmani script convention.",
      ms: "Mad silah yang muncul pada huruf tertentu (seperti waw dalam الصلاة) yang mempunyai bunyi panjang dalam konvensyen skrip Uthmani.",
    },
    howToRead: {
      en: "Extend lightly for 2 counts, connecting the sound smoothly to the next syllable.",
      ms: "Panjangkan ringan selama 2 harakat, menghubungkan bunyi dengan lancar ke suku kata berikutnya.",
    },
  },

  // ── Qalqalah ────────────────────────────────────────────────────────────────
  q: {
    code: "q",
    name: { ar: "قلقلة", en: "Qalqalah", ms: "Qalqalah" },
    color: "#EF4444",
    colorDark: "#FCA5A5",
    category: "qalqalah",
    letters: "ق ط ب ج د",
    condition: {
      en: "Occurs on one of the five Qalqalah letters (ق ط ب ج د) when it carries a sukun (resting state) — either in the middle of a word or at a pause.",
      ms: "Berlaku pada salah satu daripada lima huruf Qalqalah (ق ط ب ج د) apabila ia membawa sukun — sama ada di tengah perkataan atau ketika berhenti.",
    },
    howToRead: {
      en: "Produce a slight echo or bounce after the letter. The airflow is briefly stopped then released with a subtle vibration. At a pause (waqf), the echo is stronger.",
      ms: "Hasilkan sedikit gema atau lantunan selepas huruf tersebut. Aliran udara berhenti sebentar kemudian dilepaskan dengan getaran halus. Ketika berhenti (waqf), gemanya lebih kuat.",
    },
  },

  // ── Ghunna ──────────────────────────────────────────────────────────────────
  g: {
    code: "g",
    name: { ar: "الغنة", en: "Ghunna", ms: "Ghunnah" },
    color: "#22C55E",
    colorDark: "#86EFAC",
    category: "ghunna",
    letters: "ن م",
    condition: {
      en: "Occurs when noon (ن) or meem (م) carries a shadda (ّ), indicating it is doubled with nasalization.",
      ms: "Berlaku apabila nun (ن) atau mim (م) membawa syaddah (ّ), menunjukkan ia digandakan dengan nasalisasi.",
    },
    howToRead: {
      en: "Allow the nasal sound to resonate through the nose for 2 counts. The nasal cavity is the primary resonator — do not close it.",
      ms: "Biarkan bunyi nasal bergema melalui hidung selama 2 harakat. Rongga hidung adalah resonator utama — jangan tutupnya.",
    },
  },

  // ── Idgham (Assimilation) ────────────────────────────────────────────────────
  u: {
    code: "u",
    name: { ar: "إدغام بلا غنة", en: "Idgham bila Ghunna", ms: "Idgham Bila Ghunnah" },
    color: "#A855F7",
    colorDark: "#D8B4FE",
    category: "noon_tanween",
    letters: "ل ر",
    condition: {
      en: "Occurs when a noon saakin or tanween is followed by lam (ل) or ra (ر) — the two Idgham bila Ghunna letters.",
      ms: "Berlaku apabila nun saakin atau tanwin diikuti oleh lam (ل) atau ra (ر) — dua huruf Idgham Bila Ghunnah.",
    },
    howToRead: {
      en: "Merge the noon/tanween completely into the following letter, which doubles. No nasal sound (ghunna) — the assimilation is clean and silent.",
      ms: "Gabungkan nun/tanwin sepenuhnya ke dalam huruf berikutnya yang berganda. Tiada bunyi nasal (ghunnah) — asimilasi bersih dan senyap.",
    },
  },
  a: {
    code: "a",
    name: { ar: "إدغام بغنة", en: "Idgham bil Ghunna", ms: "Idgham Bil Ghunnah" },
    color: "#14B8A6",
    colorDark: "#5EEAD4",
    category: "noon_tanween",
    letters: "ي ن م و",
    condition: {
      en: "Occurs when a noon saakin or tanween is followed by one of four letters: ya (ي), noon (ن), meem (م), or waw (و).",
      ms: "Berlaku apabila nun saakin atau tanwin diikuti oleh salah satu daripada empat huruf: ya (ي), nun (ن), mim (م), atau waw (و).",
    },
    howToRead: {
      en: "Merge the noon/tanween into the following letter with a clear nasal sound (ghunna) for 2 counts. The two letters blend into one doubled letter with a nasal hum.",
      ms: "Gabungkan nun/tanwin ke dalam huruf berikutnya dengan bunyi nasal (ghunnah) yang jelas selama 2 harakat. Kedua-dua huruf bergabung menjadi satu huruf berganda dengan dengung nasal.",
    },
  },

  // ── Ikhfa (Concealment) ──────────────────────────────────────────────────────
  f: {
    code: "f",
    name: { ar: "الإخفاء", en: "Ikhfa", ms: "Ikhfa'" },
    color: "#F59E0B",
    colorDark: "#FCD34D",
    category: "noon_tanween",
    letters: "ت ث ج د ذ ز س ش ص ض ط ظ ف ق ك",
    condition: {
      en: "Occurs when a noon saakin or tanween is followed by any of the 15 Ikhfa letters (all letters not covered by Izhar, Idgham, or Iqlab).",
      ms: "Berlaku apabila nun saakin atau tanwin diikuti oleh salah satu daripada 15 huruf Ikhfa (semua huruf yang tidak diliputi oleh Izhar, Idgham, atau Iqlab).",
    },
    howToRead: {
      en: "Conceal the noon/tanween between full pronunciation and complete assimilation. The tongue approaches but does not touch its articulation point. Hold a nasal sound for 2 counts.",
      ms: "Sembunyikan nun/tanwin antara sebutan penuh dan asimilasi lengkap. Lidah mendekati tetapi tidak menyentuh titik sebutan. Tahan bunyi nasal selama 2 harakat.",
    },
  },

  // ── Meem rules ──────────────────────────────────────────────────────────────
  c: {
    code: "c",
    name: { ar: "الإخفاء الشفوي", en: "Ikhfa Shafawi", ms: "Ikhfa' Syafawi" },
    color: "#FB923C",
    colorDark: "#FDBA74",
    category: "meem",
    letters: "ب",
    condition: {
      en: "Occurs when a meem saakin (مْ) is followed by a ba (ب).",
      ms: "Berlaku apabila mim saakin (مْ) diikuti oleh ba (ب).",
    },
    howToRead: {
      en: "Conceal the meem between the lips without fully closing them. Hold a nasal sound for 2 counts before pronouncing the ba.",
      ms: "Sembunyikan mim antara bibir tanpa menutupnya sepenuhnya. Tahan bunyi nasal selama 2 harakat sebelum menyebut ba.",
    },
  },
  w: {
    code: "w",
    name: { ar: "الإدغام الشفوي", en: "Idgham Shafawi", ms: "Idgham Syafawi" },
    color: "#C084FC",
    colorDark: "#E9D5FF",
    category: "meem",
    letters: "م",
    condition: {
      en: "Occurs when a meem saakin (مْ) is followed by another meem (م).",
      ms: "Berlaku apabila mim saakin (مْ) diikuti oleh mim (م) yang lain.",
    },
    howToRead: {
      en: "Merge the two meems into one doubled meem with a clear nasal sound for 2 counts.",
      ms: "Gabungkan dua mim menjadi satu mim berganda dengan bunyi nasal yang jelas selama 2 harakat.",
    },
  },
};

/**
 * Waqf (stop sign) characters and their meanings.
 *
 * `char` is the conventional shorthand letter used in tajweed textbooks
 * (e.g. م for Waqf Lazim) — shown in the educational guide.
 *
 * `mushafChars` are the actual Unicode codepoints embedded in the Mushaf
 * text — used to detect occurrences in verse text. These are the small
 * high marks in the U+06D6–U+06DC range (plus U+06E9 for Sajdah), not the
 * full-size base letters that appear throughout normal Arabic text.
 */
export interface WaqfSign {
  char: string;
  mushafChars: string[];
  name: { ar: string; en: string; ms: string };
  instruction: { en: string; ms: string };
}

export const WAQF_SIGNS: WaqfSign[] = [
  {
    char: "م",
    mushafChars: ["ۘ"], // ۘ ARABIC SMALL HIGH MEEM INITIAL FORM
    name: { ar: "وقف لازم", en: "Waqf Lazim", ms: "Waqf Lazim" },
    instruction: {
      en: "Must stop here. Continuing without stopping would change the meaning.",
      ms: "Mesti berhenti di sini. Meneruskan tanpa berhenti akan mengubah makna.",
    },
  },
  {
    char: "ط",
    mushafChars: [],
    name: { ar: "وقف مطلق", en: "Waqf Mutlaq", ms: "Waqf Mutlaq" },
    instruction: {
      en: "Preferred to stop. Stopping is better than continuing.",
      ms: "Lebih baik berhenti. Berhenti lebih baik daripada meneruskan.",
    },
  },
  {
    char: "ج",
    mushafChars: ["ۚ"], // ۚ ARABIC SMALL HIGH JEEM
    name: { ar: "وقف جائز", en: "Waqf Ja'iz", ms: "Waqf Ja'iz" },
    instruction: {
      en: "Permissible to stop. Both stopping and continuing are acceptable.",
      ms: "Dibenarkan berhenti. Kedua-dua berhenti dan meneruskan adalah boleh diterima.",
    },
  },
  {
    char: "ز",
    mushafChars: [],
    name: { ar: "وقف مجوّز", en: "Waqf Mujawwaz", ms: "Waqf Mujawwaz" },
    instruction: {
      en: "Permissible to stop, though continuing is slightly preferred.",
      ms: "Dibenarkan berhenti, walaupun meneruskan sedikit lebih diutamakan.",
    },
  },
  {
    char: "ص",
    mushafChars: [],
    name: { ar: "وقف مرخّص", en: "Waqf Murakhkhas", ms: "Waqf Murakhkhas" },
    instruction: {
      en: "Permissible to stop only due to the length of the verse — stopping here is a concession, not ideal.",
      ms: "Dibenarkan berhenti hanya kerana panjang ayat — berhenti di sini adalah kelonggaran, bukan ideal.",
    },
  },
  {
    char: "قلی",
    mushafChars: ["ۗ"], // ۗ ARABIC SMALL HIGH LIGATURE QAF WITH LAM WITH ALEF MAKSURA
    name: { ar: "الوقف أولى", en: "Stop Preferred", ms: "Berhenti Lebih Utama" },
    instruction: {
      en: "Stopping is preferred (al-waqf awla).",
      ms: "Berhenti lebih diutamakan (al-waqf awla).",
    },
  },
  {
    char: "صلی",
    mushafChars: ["ۖ"], // ۖ ARABIC SMALL HIGH LIGATURE SAD WITH LAM WITH ALEF MAKSURA
    name: { ar: "الوصل أولى", en: "Continue Preferred", ms: "Teruskan Lebih Utama" },
    instruction: {
      en: "Continuing without stopping is preferred (al-wasl awla).",
      ms: "Meneruskan tanpa berhenti lebih diutamakan (al-wasl awla).",
    },
  },
  {
    char: "لا",
    mushafChars: ["ۙ"], // ۙ ARABIC SMALL HIGH LAM ALEF
    name: { ar: "لا تقف", en: "No Stop", ms: "Jangan Berhenti" },
    instruction: {
      en: "Do not stop here. Stopping would distort the meaning.",
      ms: "Jangan berhenti di sini. Berhenti akan memesongkan makna.",
    },
  },
  {
    char: "س",
    mushafChars: ["ۜ"], // ۜ ARABIC SMALL HIGH SEEN
    name: { ar: "السكتة", en: "Saktah", ms: "Saktah" },
    instruction: {
      en: "A brief silent pause — stop the sound without taking a new breath, then continue.",
      ms: "Berhenti seketika tanpa bunyi — hentikan bacaan tanpa mengambil nafas baharu, kemudian sambung.",
    },
  },
  {
    char: "ۛ",
    mushafChars: ["ۛ"], // ۛ ARABIC SMALL HIGH THREE DOTS
    name: { ar: "وقف المعانقة", en: "Waqf Mu'anaqah", ms: "Waqf Mu'anaqah" },
    instruction: {
      en: "This stop comes in pairs — stop at one ۛ or the other, but not both.",
      ms: "Tanda berhenti ini datang berpasangan — berhenti pada satu ۛ atau yang lain, tetapi tidak kedua-duanya.",
    },
  },
  {
    char: "۩",
    mushafChars: ["۩"], // ۩ ARABIC PLACE OF SAJDAH
    name: { ar: "سجدة التلاوة", en: "Sajdah Tilawah", ms: "Sujud Tilawah" },
    instruction: {
      en: "Perform a prostration of recitation (Sujud Tilawah). The supplication to recite in sujud is shown below.",
      ms: "Lakukan sujud tilawah. Bacaan sujud ditunjukkan di bawah.",
    },
  },
];

/** Return the rule definition for a raw code (strips numeric suffix like h:1 → h). */
export function getTajweedRule(rawCode: string): TajweedRule | undefined {
  const code = rawCode.split(":")[0];
  return TAJWEED_RULES[code];
}

/** CSS color string for a rule in the current color scheme. */
export function ruleColor(rawCode: string, dark = false): string {
  const rule = getTajweedRule(rawCode);
  if (!rule) return "";
  return dark ? rule.colorDark : rule.color;
}

/** Human-readable category label. */
export function categoryLabel(
  cat: TajweedCategory,
  lang: "en" | "ms"
): string {
  const labels: Record<TajweedCategory, { en: string; ms: string }> = {
    madd: { en: "Madd (Prolongation)", ms: "Mad (Pemanjangan)" },
    noon_tanween: { en: "Noon Saakin & Tanween", ms: "Nun Sakin & Tanwin" },
    meem: { en: "Meem Saakin", ms: "Mim Sakin" },
    qalqalah: { en: "Qalqalah (Echoing)", ms: "Qalqalah (Lantunan)" },
    ghunna: { en: "Ghunna (Nasalization)", ms: "Ghunnah (Dengung)" },
    hamza_lam: { en: "Hamza & Lam", ms: "Hamzah & Lam" },
    waqf: { en: "Stop Signs (Waqf)", ms: "Tanda Berhenti (Waqf)" },
  };
  return labels[cat][lang];
}
