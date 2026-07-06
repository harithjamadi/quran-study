/**
 * Tajweed rule metadata library.
 *
 * Codes come from the quran-tajweed edition served by alquran.cloud,
 * which embeds annotations as [code[text] spans inside the Arabic verse string.
 * Authoritative legend: https://alquran.cloud/tajweed-guide
 *
 * The rule names, conditions, and "how to read" guidance below were corrected
 * against the alquran.cloud / cpfair legend and verified against real verses.
 * Code→meaning mappings (verified):
 *   n = normal/natural madd (2)      p = madd ʿaariḍ lil-sukoon / leen (2/4/6)
 *   o = muttasil & munfasil (4–5)    m = madd laazim (6)        s = SILENT letter
 *   i = iqlab   a/u = idgham ±ghunna   f/c = ikhfa(/shafawi)   w = idgham shafawi
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
  /** Traditional memory aid for this rule's letters, where a well-known one
   *  exists. Either the first letter of each word, or the word's own letters,
   *  spell out the rule's set of letters. */
  acronym?: {
    ar: string;
    translit: string;
    note: { en: string; ms: string };
  };
  condition: { en: string; ms: string };
  howToRead: { en: string; ms: string };
  /** Worked examples: each is an Arabic word/phrase, how it reads, and (where
   *  confident) a surah:ayah reference. The first is the primary example; the
   *  rest let the learner cycle through more. Where a `ref` is present, the
   *  guide can play that verse's recitation. */
  examples: TajweedExample[];
}

export interface TajweedExample {
  arabic: string;
  /** Romanization of the example — language-neutral. */
  translit: string;
  /** Short explanation of what the rule does here, in each UI language. */
  note: { en: string; ms: string };
  /** "surah:ayah" — present only where the reference is verified. When set,
   *  the guide shows the whole verse (from {@link EXAMPLE_VERSES}) with the
   *  highlighted words coloured, and plays the verse recitation. */
  ref?: string;
  /** 1-based inclusive word range within EXAMPLE_VERSES[ref] to colour — the
   *  word(s) the rule applies to. Present wherever `ref` is. */
  highlight?: [number, number];
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
    examples: [
      { arabic: "بِسْمِ ٱللَّه", translit: "bismi-llāh", note: { en: "the ٱ is dropped", ms: "huruf ٱ digugurkan" }, ref: "1:1", highlight: [1, 2] },
      { arabic: "رَبِّ ٱلْعَٰلَمِين", translit: "rabbi-l-'ālamīn", note: { en: "the ٱ of ٱلعالمين is dropped", ms: "huruf ٱ pada ٱلعالمين digugurkan" }, ref: "1:2", highlight: [3, 4] },
    ],
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
      ms: "Lam (ل) dalam alif lam (ال) apabila diikuti oleh 'huruf syamsiyyah'. Terdapat 14 huruf syamsiyyah.",
    },
    howToRead: {
      en: "Merge the lam silently into the following sun letter — the sun letter receives a shadda (doubling). Do not pronounce lam separately.",
      ms: "Gabungkan lam secara senyap ke dalam huruf syamsiyyah berikutnya — huruf tersebut mendapat syaddah (penggandaan). Jangan sebut lam secara berasingan.",
    },
    examples: [
      { arabic: "ٱلشَّمْس", translit: "ash-shams", note: { en: "lam merges into ش", ms: "lam digabung ke dalam ش" }, ref: "91:1", highlight: [1, 1] },
      { arabic: "ٱلصِّرَٰط", translit: "aṣ-ṣirāṭ", note: { en: "lam merges into ص", ms: "lam digabung ke dalam ص" }, ref: "1:6", highlight: [2, 2] },
    ],
  },

  // ── Madd (Prolongation) ─────────────────────────────────────────────────────
  n: {
    code: "n",
    name: { ar: "المد الطبيعي", en: "Madd Tabee'i (Natural)", ms: "Mad Tabii (Asli)" },
    color: "#60A5FA",
    colorDark: "#93C5FD",
    category: "madd",
    condition: {
      en: "The basic natural prolongation — a long vowel with no hamzah or sukun causing extra length. Includes the superscript/dagger alif (ـٰ) and the small connecting waw/ya (madd silah sughra), e.g. رَّحْمَٰن, لَهُۥ.",
      ms: "Pemanjangan asli yang asas — bunyi vokal panjang tanpa hamzah atau sukun yang menambah panjang. Termasuk alif berdiri (ـٰ) dan waw/ya penghubung kecil (mad silah sughra), contohnya رَّحْمَٰن, لَهُۥ.",
    },
    howToRead: {
      en: "Extend for exactly 2 counts (harakat) — no more, no less. This is the baseline length all other madd rules build on.",
      ms: "Panjangkan tepat 2 harakat — tidak lebih, tidak kurang. Ini panjang asas yang menjadi dasar semua hukum mad lain.",
    },
    examples: [
      { arabic: "ٱلرَّحْمَٰن", translit: "ar-raḥmān", note: { en: "2 counts on the ـٰ", ms: "2 harakat pada ـٰ" }, ref: "1:3", highlight: [1, 1] },
      { arabic: "مَٰلِكِ", translit: "māliki", note: { en: "2 counts on the dagger alif", ms: "2 harakat pada alif khanjari" }, ref: "1:4", highlight: [1, 1] },
    ],
  },
  p: {
    code: "p",
    name: { ar: "المد العارض للسكون", en: "Madd 'Aarid lil-Sukoon", ms: "Mad 'Aridh lis-Sukun" },
    color: "#38BDF8",
    colorDark: "#7DD3FC",
    category: "madd",
    letters: "ا و ي",
    condition: {
      en: "A natural madd letter (ا و ي) followed by a letter that becomes silent only because of stopping (waqf) — typically the last word before a pause or verse-end. Also covers the leen madd (و / ي after a fatha at a stop, e.g. خَوْف).",
      ms: "Huruf mad asli (ا و ي) diikuti oleh huruf yang menjadi sakin hanya kerana berhenti (waqf) — biasanya perkataan terakhir sebelum berhenti atau hujung ayat. Turut merangkumi mad leen (و / ي selepas fathah ketika berhenti, contohnya خَوْف).",
    },
    howToRead: {
      en: "When you pause here, prolong for 2, 4, or 6 counts — pick one length and keep it consistent throughout your recitation. If you continue without stopping, it reverts to a normal 2-count madd.",
      ms: "Apabila berhenti di sini, panjangkan selama 2, 4, atau 6 harakat — pilih satu kadar dan kekalkannya sepanjang bacaan. Jika diteruskan tanpa berhenti, ia kembali menjadi mad 2 harakat biasa.",
    },
    examples: [
      { arabic: "نَسْتَعِينُ", translit: "nasta'īn", note: { en: "lengthened at the stop", ms: "dipanjangkan ketika berhenti" }, ref: "1:5", highlight: [4, 4] },
      { arabic: "ٱلرَّحِيم", translit: "ar-raḥīm", note: { en: "prolonged at the pause", ms: "dipanjangkan ketika berhenti" }, ref: "1:3", highlight: [2, 2] },
    ],
  },
  o: {
    code: "o",
    name: { ar: "المد المتصل والمنفصل", en: "Madd Muttasil / Munfasil", ms: "Mad Muttasil / Munfasil" },
    color: "#3B82F6",
    colorDark: "#60A5FA",
    category: "madd",
    condition: {
      en: "A madd letter followed by a hamzah (ء). If the hamzah is in the same word it is Muttasil (مُتَّصِل, obligatory) — e.g. سَوَآء, أُو۟لَٰٓئِك; if it begins the next word it is Munfasil (مُنْفَصِل) — e.g. بِمَآ أُنزِل, وَمَآ.",
      ms: "Huruf mad diikuti oleh hamzah (ء). Jika hamzah dalam perkataan yang sama, ia Muttasil (مُتَّصِل, wajib) — contohnya سَوَآء, أُو۟لَٰٓئِك; jika ia memulakan perkataan berikutnya, ia Munfasil (مُنْفَصِل) — contohnya بِمَآ أُنزِل, وَمَآ.",
    },
    howToRead: {
      en: "Extend for 4–5 counts (harakat) in Hafs. Muttasil must always be lengthened; for Munfasil keep your chosen length consistent across the whole recitation.",
      ms: "Panjangkan selama 4–5 harakat dalam riwayat Hafs. Muttasil mesti sentiasa dipanjangkan; bagi Munfasil, kekalkan kadar pilihan anda sepanjang bacaan.",
    },
    examples: [
      { arabic: "ٱلسَّمَآء", translit: "as-samā'", note: { en: "muttasil — madd then hamza, 4–5 counts", ms: "muttasil — mad kemudian hamzah, 4–5 harakat" } },
      { arabic: "بِمَآ أُنزِلَ", translit: "bimā unzila", note: { en: "munfasil — madd, then hamza in the next word", ms: "munfasil — mad, kemudian hamzah pada perkataan berikutnya" }, ref: "2:4", highlight: [3, 4] },
    ],
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
    examples: [
      { arabic: "الٓمٓ", translit: "alif lāām mīīm", note: { en: "mīm held 6 counts", ms: "mim ditahan 6 harakat" }, ref: "2:1", highlight: [1, 1] },
      { arabic: "الٓر", translit: "alif lāām rā", note: { en: "lām held 6 counts", ms: "lam ditahan 6 harakat" }, ref: "10:1", highlight: [1, 1] },
    ],
  },
  s: {
    code: "s",
    name: { ar: "ألف فارقة", en: "Silent Alif (Alif al-Fāriqah)", ms: "Alif Senyap (Alif Al-Fariqah)" },
    color: "#9CA3AF",
    colorDark: "#6B7280",
    category: "hamza_lam",
    condition: {
      en: "An alif that comes after the plural waw (the waw meaning \"they / many\"), as in كَفَرُوا۟. In today's Mushaf it is marked with a small circle above it (the round zero, sifir mustadir: ۟). The same silent treatment applies to other written-but-unpronounced letters.",
      ms: "Huruf Alif yang terletak selepas Waw Jamak (waw yang menunjukkan maksud \"mereka/ramai\"), seperti dalam كَفَرُوا۟. Dalam mushaf al-Quran hari ini, alif ini ditandakan dengan bulatan kecil di atasnya (sifir mustadir: ۟). Hukum senyap yang sama turut berlaku pada huruf lain yang ditulis tetapi tidak disebut.",
    },
    howToRead: {
      en: "This alif is not pronounced at all — whether you continue (wasl) or stop (waqf). The sound ends on the waw's madd, so كَفَرُوا۟ is read \"kafaruu\".",
      ms: "Alif ini tidak dibunyikan langsung — sama ada ketika bacaan bersambung (wasal) atau ketika berhenti (waqaf). Bunyi berakhir pada mad Waw sahaja, jadi كَفَرُوا۟ dibaca \"Kafaruu\".",
    },
    examples: [
      { arabic: "كَفَرُوا۟", translit: "kafaruu", note: { en: "the final alif is silent", ms: "alif terakhir tidak disebut" }, ref: "2:6", highlight: [3, 3] },
      { arabic: "ءَامَنُوا۟", translit: "āmanū", note: { en: "the alif after the plural waw is silent", ms: "alif selepas waw jamak tidak disebut" }, ref: "2:25", highlight: [3, 3] },
    ],
  },

  // ── Qalqalah ────────────────────────────────────────────────────────────────
  q: {
    code: "q",
    name: { ar: "قلقلة", en: "Qalqalah", ms: "Qalqalah" },
    color: "#EF4444",
    colorDark: "#FCA5A5",
    category: "qalqalah",
    letters: "ق ط ب ج د",
    acronym: {
      ar: "قُطْبُ جَدٍّ",
      translit: "quṭbu jadd",
      note: {
        en: "The five qalqalah letters are gathered in the phrase قُطْبُ جَدٍّ (quṭbu jadd).",
        ms: "Lima huruf qalqalah terkumpul dalam frasa قُطْبُ جَدٍّ (qutbu jadd).",
      },
    },
    condition: {
      en: "Occurs on one of the five Qalqalah letters (ق ط ب ج د) when it carries a sukun (resting state) — either in the middle of a word or at a pause.",
      ms: "Berlaku pada salah satu daripada lima huruf Qalqalah (ق ط ب ج د) apabila ia membawa sukun — sama ada di tengah perkataan atau ketika berhenti.",
    },
    howToRead: {
      en: "Produce a slight echo or bounce after the letter. The airflow is briefly stopped then released with a subtle vibration. At a pause (waqf), the echo is stronger.",
      ms: "Hasilkan sedikit gema atau lantunan selepas huruf tersebut. Aliran udara berhenti sebentar kemudian dilepaskan dengan getaran halus. Ketika berhenti (waqf), gemanya lebih kuat.",
    },
    examples: [
      { arabic: "لَمْ يَلِدْ", translit: "lam yalid", note: { en: "qalqalah on the د", ms: "qalqalah pada د" }, ref: "112:3", highlight: [1, 2] },
      { arabic: "ٱلْفَلَق", translit: "al-falaq", note: { en: "stronger qalqalah on ق at the stop", ms: "qalqalah lebih kuat pada ق ketika berhenti" }, ref: "113:1", highlight: [4, 4] },
    ],
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
      ms: "Berlaku apabila nun (ن) atau mim (م) membawa syaddah (ّ), menandakan ia digandakan dengan dengung.",
    },
    howToRead: {
      en: "Allow the nasal sound to resonate through the nose for 2 counts. The nasal cavity is the primary resonator — do not close it.",
      ms: "Biarkan bunyi dengung mengalir melalui hidung selama 2 harakat. Rongga hidung adalah resonator utama — jangan tutupnya.",
    },
    examples: [
      { arabic: "إِنَّ", translit: "inna", note: { en: "ghunna held 2 counts on نّ", ms: "ghunnah ditahan 2 harakat pada نّ" }, ref: "2:6", highlight: [1, 1] },
      { arabic: "ٱلنَّاس", translit: "an-nās", note: { en: "ghunna on the doubled نّ", ms: "ghunnah pada نّ yang digandakan" }, ref: "114:1", highlight: [4, 4] },
    ],
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
      ms: "Berlaku apabila nun sakinah atau tanwin diikuti oleh lam (ل) atau ra (ر) — dua huruf Idgham Bila Ghunnah.",
    },
    howToRead: {
      en: "Merge the noon/tanween completely into the following letter, which doubles. No nasal sound (ghunna) — the assimilation is clean and silent.",
      ms: "Gabungkan nun/tanwin sepenuhnya ke dalam huruf berikutnya yang berganda. Tiada dengung (ghunnah) — penggabungan bersih dan senyap.",
    },
    examples: [
      { arabic: "مِن رَّبِّهِمْ", translit: "mir-rabbihim", note: { en: "noon merges into ر", ms: "nun digabung ke dalam ر" }, ref: "2:5", highlight: [4, 5] },
      { arabic: "وَيْلٌ لِّلْمُطَفِّفِين", translit: "waylul-lil-muṭaffifīn", note: { en: "tanween merges into ل", ms: "tanwin digabung ke dalam ل" }, ref: "83:1", highlight: [1, 2] },
    ],
  },
  a: {
    code: "a",
    name: { ar: "إدغام بغنة", en: "Idgham bil Ghunna", ms: "Idgham Bil Ghunnah" },
    color: "#14B8A6",
    colorDark: "#5EEAD4",
    category: "noon_tanween",
    letters: "ي ن م و",
    acronym: {
      ar: "يَنْمُو",
      translit: "yanmū",
      note: {
        en: "The four letters spell the word يَنْمُو (yanmū, \"it grows\").",
        ms: "Empat huruf membentuk perkataan يَنْمُو (yanmu, \"ia tumbuh\").",
      },
    },
    condition: {
      en: "Occurs when a noon saakin or tanween is followed by one of four letters: ya (ي), noon (ن), meem (م), or waw (و).",
      ms: "Berlaku apabila nun sakinah atau tanwin diikuti oleh salah satu daripada empat huruf: ya (ي), nun (ن), mim (م), atau waw (و).",
    },
    howToRead: {
      en: "Merge the noon/tanween into the following letter with a clear nasal sound (ghunna) for 2 counts. The two letters blend into one doubled letter with a nasal hum.",
      ms: "Gabungkan nun/tanwin ke dalam huruf berikutnya dengan dengung (ghunnah) yang jelas selama 2 harakat. Kedua-dua huruf bergabung menjadi satu huruf berganda dengan dengung.",
    },
    examples: [
      { arabic: "مَن يَقُولُ", translit: "may-yaqūl", note: { en: "noon merges into ي with ghunna", ms: "nun digabung ke dalam ي dengan ghunnah" }, ref: "2:8", highlight: [3, 4] },
      { arabic: "خَيْرًا يَرَهُ", translit: "khayran yarah", note: { en: "tanween merges into ي with ghunna", ms: "tanwin digabung ke dalam ي dengan ghunnah" }, ref: "99:7", highlight: [5, 6] },
    ],
  },

  // ── Ikhfa (Concealment) ──────────────────────────────────────────────────────
  f: {
    code: "f",
    name: { ar: "الإخفاء", en: "Ikhfa", ms: "Ikhfa'" },
    color: "#F59E0B",
    colorDark: "#FCD34D",
    category: "noon_tanween",
    letters: "ت ث ج د ذ ز س ش ص ض ط ظ ف ق ك",
    acronym: {
      ar: "صِفْ ذَا ثَنَا كَمْ جَادَ شَخْصٌ قَدْ سَمَا · دُمْ طَيِّبًا زِدْ فِي تُقًى ضَعْ ظَالِمَا",
      translit: "ṣif dhā thanā kam jāda shakhṣun qad samā · dum ṭayyiban zid fī tuqan ḍaʿ ẓālimā",
      note: {
        en: "A classic couplet — the first letter of each of its 15 words is one of the ikhfa letters.",
        ms: "Bait klasik — huruf pertama setiap 15 perkataannya ialah salah satu huruf ikhfa.",
      },
    },
    condition: {
      en: "Occurs when a noon saakin or tanween is followed by any of the 15 Ikhfa letters (all letters not covered by Izhar, Idgham, or Iqlab).",
      ms: "Berlaku apabila nun sakinah atau tanwin diikuti oleh salah satu daripada 15 huruf Ikhfa (semua huruf yang tidak diliputi oleh Izhar, Idgham, atau Iqlab).",
    },
    howToRead: {
      en: "Conceal the noon/tanween between full pronunciation and complete assimilation. The tongue approaches but does not touch its articulation point. Hold a nasal sound for 2 counts.",
      ms: "Sembunyikan nun/tanwin antara sebutan jelas (izhar) dan penggabungan penuh (idgham). Lidah mendekati tetapi tidak menyentuh titik sebutan. Tahan dengung selama 2 harakat.",
    },
    examples: [
      { arabic: "مِن قَبْلِكَ", translit: "min qablika", note: { en: "noon concealed before ق", ms: "nun disembunyikan sebelum ق" }, ref: "2:4", highlight: [8, 9] },
      { arabic: "أَنفُسَهُمْ", translit: "anfusahum", note: { en: "noon concealed before ف", ms: "nun disembunyikan sebelum ف" }, ref: "2:9", highlight: [8, 8] },
    ],
  },

  // ── Iqlab ───────────────────────────────────────────────────────────────────
  i: {
    code: "i",
    name: { ar: "الإقلاب", en: "Iqlab", ms: "Iqlab" },
    color: "#06B6D4",
    colorDark: "#67E8F9",
    category: "noon_tanween",
    letters: "ب",
    condition: {
      en: "Occurs when a noon saakin (نْ) or tanween is followed by the single letter ba (ب) — e.g. مِنۢ بَعْد, أَلِيمٌۢ بِ. A small meem (ۢ) is written above to mark it.",
      ms: "Berlaku apabila nun sakinah (نْ) atau tanwin diikuti oleh satu huruf sahaja, iaitu ba (ب) — contohnya مِنۢ بَعْد, أَلِيمٌۢ بِ. Mim kecil (ۢ) ditulis di atas sebagai tanda.",
    },
    howToRead: {
      en: "Convert the noon/tanween into a hidden meem (م) sound with a nasal hum (ghunna) held for 2 counts, then pronounce the ba. The lips come together lightly for the meem without fully closing.",
      ms: "Tukarkan bunyi nun/tanwin kepada bunyi mim (م) tersembunyi dengan dengung (ghunnah) selama 2 harakat, kemudian sebut ba. Bibir bertemu ringan untuk mim tanpa menutup sepenuhnya.",
    },
    examples: [
      { arabic: "مِنۢ بَعْدِ", translit: "mim-ba'di", note: { en: "noon becomes a hidden م before ب", ms: "nun menjadi mim tersembunyi sebelum ب" }, ref: "2:27", highlight: [5, 6] },
      { arabic: "أَنۢبِئْهُم", translit: "ambi'hum", note: { en: "noon becomes a hidden م before ب", ms: "nun menjadi mim tersembunyi sebelum ب" }, ref: "2:33", highlight: [3, 3] },
    ],
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
      ms: "Berlaku apabila mim sakinah (مْ) diikuti oleh ba (ب).",
    },
    howToRead: {
      en: "Conceal the meem between the lips without fully closing them. Hold a nasal sound for 2 counts before pronouncing the ba.",
      ms: "Sembunyikan mim antara bibir tanpa menutupnya sepenuhnya. Tahan dengung selama 2 harakat sebelum menyebut ba.",
    },
    examples: [
      { arabic: "تَرْمِيهِم بِحِجَارَةٍ", translit: "tarmīhim bi-ḥijāra", note: { en: "meem concealed before ب", ms: "mim disembunyikan sebelum ب" }, ref: "105:4", highlight: [1, 2] },
      { arabic: "هُم بِمُؤْمِنِين", translit: "hum bimu'minīn", note: { en: "meem concealed before ب", ms: "mim disembunyikan sebelum ب" }, ref: "2:8", highlight: [10, 11] },
    ],
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
      ms: "Berlaku apabila mim sakinah (مْ) diikuti oleh mim (م) yang lain.",
    },
    howToRead: {
      en: "Merge the two meems into one doubled meem with a clear nasal sound for 2 counts.",
      ms: "Gabungkan dua mim menjadi satu mim berganda dengan dengung yang jelas selama 2 harakat.",
    },
    examples: [
      { arabic: "أَطْعَمَهُم مِّن", translit: "aṭ'amahum-min", note: { en: "two meems merge with ghunna", ms: "dua mim bergabung dengan ghunnah" }, ref: "106:4", highlight: [2, 3] },
      { arabic: "لَهُم مَّا", translit: "lahum-mā", note: { en: "two meems merge with ghunna", ms: "dua mim bergabung dengan ghunnah" } },
    ],
  },
};

/**
 * Full verse text for every example that carries a `ref`, tokenised into words
 * (Uthmani script, from the Quran.com word API). The guide renders the whole
 * verse and colours the word(s) named by the example's `highlight` range.
 *
 * Word order matches the 1-based positions used by `highlight`.
 */
export const EXAMPLE_VERSES: Record<string, string[]> = {
  "1:1": ["بِسْمِ", "ٱللَّهِ", "ٱلرَّحْمَـٰنِ", "ٱلرَّحِيمِ"],
  "1:2": ["ٱلْحَمْدُ", "لِلَّهِ", "رَبِّ", "ٱلْعَـٰلَمِينَ"],
  "91:1": ["وَٱلشَّمْسِ", "وَضُحَىٰهَا"],
  "1:6": ["ٱهْدِنَا", "ٱلصِّرَٰطَ", "ٱلْمُسْتَقِيمَ"],
  "1:3": ["ٱلرَّحْمَـٰنِ", "ٱلرَّحِيمِ"],
  "1:4": ["مَـٰلِكِ", "يَوْمِ", "ٱلدِّينِ"],
  "1:5": ["إِيَّاكَ", "نَعْبُدُ", "وَإِيَّاكَ", "نَسْتَعِينُ"],
  "2:4": ["وَٱلَّذِينَ", "يُؤْمِنُونَ", "بِمَآ", "أُنزِلَ", "إِلَيْكَ", "وَمَآ", "أُنزِلَ", "مِن", "قَبْلِكَ", "وَبِٱلْـَٔاخِرَةِ", "هُمْ", "يُوقِنُونَ"],
  "2:1": ["الٓمٓ"],
  "10:1": ["الٓر ۚ", "تِلْكَ", "ءَايَـٰتُ", "ٱلْكِتَـٰبِ", "ٱلْحَكِيمِ"],
  "2:6": ["إِنَّ", "ٱلَّذِينَ", "كَفَرُوا۟", "سَوَآءٌ", "عَلَيْهِمْ", "ءَأَنذَرْتَهُمْ", "أَمْ", "لَمْ", "تُنذِرْهُمْ", "لَا", "يُؤْمِنُونَ"],
  "2:25": ["وَبَشِّرِ", "ٱلَّذِينَ", "ءَامَنُوا۟", "وَعَمِلُوا۟", "ٱلصَّـٰلِحَـٰتِ", "أَنَّ", "لَهُمْ", "جَنَّـٰتٍۢ", "تَجْرِى", "مِن", "تَحْتِهَا", "ٱلْأَنْهَـٰرُ ۖ", "كُلَّمَا", "رُزِقُوا۟", "مِنْهَا", "مِن", "ثَمَرَةٍۢ", "رِّزْقًۭا ۙ", "قَالُوا۟", "هَـٰذَا", "ٱلَّذِى", "رُزِقْنَا", "مِن", "قَبْلُ ۖ", "وَأُتُوا۟", "بِهِۦ", "مُتَشَـٰبِهًۭا ۖ", "وَلَهُمْ", "فِيهَآ", "أَزْوَٰجٌۭ", "مُّطَهَّرَةٌۭ ۖ", "وَهُمْ", "فِيهَا", "خَـٰلِدُونَ"],
  "112:3": ["لَمْ", "يَلِدْ", "وَلَمْ", "يُولَدْ"],
  "113:1": ["قُلْ", "أَعُوذُ", "بِرَبِّ", "ٱلْفَلَقِ"],
  "114:1": ["قُلْ", "أَعُوذُ", "بِرَبِّ", "ٱلنَّاسِ"],
  "2:5": ["أُو۟لَـٰٓئِكَ", "عَلَىٰ", "هُدًۭى", "مِّن", "رَّبِّهِمْ ۖ", "وَأُو۟لَـٰٓئِكَ", "هُمُ", "ٱلْمُفْلِحُونَ"],
  "83:1": ["وَيْلٌۭ", "لِّلْمُطَفِّفِينَ"],
  "2:8": ["وَمِنَ", "ٱلنَّاسِ", "مَن", "يَقُولُ", "ءَامَنَّا", "بِٱللَّهِ", "وَبِٱلْيَوْمِ", "ٱلْـَٔاخِرِ", "وَمَا", "هُم", "بِمُؤْمِنِينَ"],
  "99:7": ["فَمَن", "يَعْمَلْ", "مِثْقَالَ", "ذَرَّةٍ", "خَيْرًۭا", "يَرَهُۥ"],
  "2:9": ["يُخَـٰدِعُونَ", "ٱللَّهَ", "وَٱلَّذِينَ", "ءَامَنُوا۟", "وَمَا", "يَخْدَعُونَ", "إِلَّآ", "أَنفُسَهُمْ", "وَمَا", "يَشْعُرُونَ"],
  "2:27": ["ٱلَّذِينَ", "يَنقُضُونَ", "عَهْدَ", "ٱللَّهِ", "مِنۢ", "بَعْدِ", "مِيثَـٰقِهِۦ", "وَيَقْطَعُونَ", "مَآ", "أَمَرَ", "ٱللَّهُ", "بِهِۦٓ", "أَن", "يُوصَلَ", "وَيُفْسِدُونَ", "فِى", "ٱلْأَرْضِ ۚ", "أُو۟لَـٰٓئِكَ", "هُمُ", "ٱلْخَـٰسِرُونَ"],
  "2:33": ["قَالَ", "يَـٰٓـَٔادَمُ", "أَنۢبِئْهُم", "بِأَسْمَآئِهِمْ ۖ", "فَلَمَّآ", "أَنۢبَأَهُم", "بِأَسْمَآئِهِمْ", "قَالَ", "أَلَمْ", "أَقُل", "لَّكُمْ", "إِنِّىٓ", "أَعْلَمُ", "غَيْبَ", "ٱلسَّمَـٰوَٰتِ", "وَٱلْأَرْضِ", "وَأَعْلَمُ", "مَا", "تُبْدُونَ", "وَمَا", "كُنتُمْ", "تَكْتُمُونَ"],
  "105:4": ["تَرْمِيهِم", "بِحِجَارَةٍۢ", "مِّن", "سِجِّيلٍۢ"],
  "106:4": ["ٱلَّذِىٓ", "أَطْعَمَهُم", "مِّن", "جُوعٍۢ", "وَءَامَنَهُم", "مِّنْ", "خَوْفٍۭ"],
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
    name: { ar: "وقف لازم", en: "Waqf Lazim", ms: "Waqaf Lazim" },
    instruction: {
      en: "Must stop here. Continuing without stopping would change the meaning.",
      ms: "Wajib berhenti — jika disambung, maknanya berubah.",
    },
  },
  {
    char: "ط",
    mushafChars: [],
    name: { ar: "وقف مطلق", en: "Waqf Mutlaq", ms: "Waqaf Mutlaq" },
    instruction: {
      en: "Preferred to stop. Stopping is better than continuing.",
      ms: "Elok berhenti di sini.",
    },
  },
  {
    char: "ج",
    mushafChars: ["ۚ"], // ۚ ARABIC SMALL HIGH JEEM
    name: { ar: "وقف جائز", en: "Waqf Ja'iz", ms: "Waqaf Ja'iz" },
    instruction: {
      en: "Permissible to stop. Both stopping and continuing are acceptable.",
      ms: "Boleh berhenti atau sambung — kedua-duanya betul.",
    },
  },
  {
    char: "ز",
    mushafChars: [],
    name: { ar: "وقف مجوّز", en: "Waqf Mujawwaz", ms: "Waqaf Mujawwaz" },
    instruction: {
      en: "Permissible to stop, though continuing is slightly preferred.",
      ms: "Boleh berhenti, tetapi lebih baik sambung.",
    },
  },
  {
    char: "ص",
    mushafChars: [],
    name: { ar: "وقف مرخّص", en: "Waqf Murakhkhas", ms: "Waqaf Murakhkhas" },
    instruction: {
      en: "Permissible to stop only due to the length of the verse — stopping here is a concession, not ideal.",
      ms: "Boleh berhenti kerana ayatnya panjang — sekadar kelonggaran.",
    },
  },
  {
    char: "قلی",
    mushafChars: ["ۗ"], // ۗ ARABIC SMALL HIGH LIGATURE QAF WITH LAM WITH ALEF MAKSURA
    name: { ar: "الوقف أولى", en: "Al-Waqf al-Awla (Stop Preferred)", ms: "Berhenti Lebih Utama (Al-Waqaf Awla)" },
    instruction: {
      en: "Stopping is preferred over continuing.",
      ms: "Lebih baik berhenti.",
    },
  },
  {
    char: "صلی",
    mushafChars: ["ۖ"], // ۖ ARABIC SMALL HIGH LIGATURE SAD WITH LAM WITH ALEF MAKSURA
    name: { ar: "الوصل أولى", en: "Al-Wasl al-Awla (Continue Preferred)", ms: "Teruskan Lebih Utama (Al-Wasl Awla)" },
    instruction: {
      en: "Continuing without stopping is preferred.",
      ms: "Lebih baik sambung terus.",
    },
  },
  {
    char: "لا",
    mushafChars: ["ۙ"], // ۙ ARABIC SMALL HIGH LAM ALEF
    name: { ar: "لا تقف", en: "Lā Taqif (Do Not Stop)", ms: "Jangan Berhenti (La Taqif / Waqaf Mamnu')" },
    instruction: {
      en: "Do not stop here. Stopping will distort the meaning of the verse.",
      ms: "Jangan berhenti — maknanya akan lari.",
    },
  },
  {
    char: "س",
    mushafChars: ["ۜ"], // ۜ ARABIC SMALL HIGH SEEN
    name: { ar: "السكتة", en: "Saktah", ms: "Saktah" },
    instruction: {
      en: "A brief silent pause — stop the sound without taking a new breath, then continue.",
      ms: "Henti bunyi seketika, tahan nafas, kemudian sambung.",
    },
  },
  {
    char: "ۛ",
    mushafChars: ["ۛ"], // ۛ ARABIC SMALL HIGH THREE DOTS
    name: { ar: "وقف المعانقة", en: "Waqf Mu'anaqah", ms: "Waqaf Mu'anaqah" },
    instruction: {
      en: "This stop comes in pairs — stop at one ۛ or the other, but not both.",
      ms: "Datang berpasangan — berhenti pada salah satu sahaja, bukan kedua-duanya.",
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
    noon_tanween: { en: "Noon Saakin & Tanween", ms: "Nun Sakinah & Tanwin" },
    meem: { en: "Meem Saakin", ms: "Mim Sakinah" },
    qalqalah: { en: "Qalqalah (Echoing)", ms: "Qalqalah (Lantunan)" },
    ghunna: { en: "Ghunna (Nasalization)", ms: "Ghunnah (Dengung)" },
    hamza_lam: { en: "Hamza & Lam", ms: "Hamzah & Lam" },
    waqf: { en: "Stop Signs (Waqf)", ms: "Tanda Berhenti (Waqaf)" },
  };
  return labels[cat][lang];
}
