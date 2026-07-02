/**
 * Wirid data — Al-Ma'thurat (sughra) and the Manzil compilation.
 *
 * Quranic passages are stored as surah:ayah ranges only; their Arabic and
 * translations are fetched from the same cached alquran.cloud editions the
 * surah reader uses, so the Quran text here is exactly as authoritative as
 * everywhere else in the app. Only the Sunnah adhkar (non-Quranic du'as) are
 * embedded, with their hadith sources and en/ms translations.
 *
 * Repeat counts follow the widely printed Al-Ma'thurat sughra editions
 * (al-Wazifa al-Sughra, Hasan al-Banna's compilation) — individual prints
 * vary slightly; the sequence below matches the common Malaysian print.
 */

export type WiridTime = "morning" | "evening";

/** Text that differs between the morning and evening recitation. */
export interface TimedText {
  morning: string;
  evening: string;
}

export type WiridText = string | TimedText;

export interface QuranPassageItem {
  kind: "quran";
  id: string;
  surah: number;
  /** First ayah of the passage (inclusive, 1-based). */
  from: number;
  /** Last ayah of the passage (inclusive). */
  to: number;
  repeat?: number;
}

export interface DhikrItem {
  kind: "dhikr";
  id: string;
  arabic: WiridText;
  en: WiridText;
  ms: WiridText;
  /** Narration source, e.g. "Muslim" — shown as a quiet footnote. */
  source?: { en: string; ms: string };
  repeat?: number;
}

export type WiridItem = QuranPassageItem | DhikrItem;

export function resolveText(text: WiridText, time: WiridTime): string {
  return typeof text === "string" ? text : text[time];
}

/* ────────────────────────────────────────────────────────────────────────
 * Al-Ma'thurat (sughra)
 * ──────────────────────────────────────────────────────────────────────── */

export const MATHURAT: WiridItem[] = [
  {
    kind: "dhikr",
    id: "istiadhah",
    arabic: "أَعُوذُ بِاللَّهِ السَّمِيعِ الْعَلِيمِ مِنَ الشَّيْطَانِ الرَّجِيمِ",
    en: "I seek refuge in Allah, the All-Hearing, the All-Knowing, from the accursed Shaytan.",
    ms: "Aku berlindung dengan Allah Yang Maha Mendengar lagi Maha Mengetahui daripada syaitan yang direjam.",
    repeat: 3,
  },
  { kind: "quran", id: "fatiha", surah: 1, from: 1, to: 7 },
  { kind: "quran", id: "baqarah-awal", surah: 2, from: 1, to: 5 },
  { kind: "quran", id: "ayat-kursi", surah: 2, from: 255, to: 257 },
  { kind: "quran", id: "baqarah-akhir", surah: 2, from: 284, to: 286 },
  { kind: "quran", id: "ikhlas", surah: 112, from: 1, to: 4, repeat: 3 },
  { kind: "quran", id: "falaq", surah: 113, from: 1, to: 5, repeat: 3 },
  { kind: "quran", id: "nas", surah: 114, from: 1, to: 6, repeat: 3 },
  {
    kind: "dhikr",
    id: "asbahna-mulk",
    arabic: {
      morning:
        "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا شَرِيكَ لَهُ، لَا إِلَهَ إِلَّا هُوَ وَإِلَيْهِ النُّشُورُ",
      evening:
        "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا شَرِيكَ لَهُ، لَا إِلَهَ إِلَّا هُوَ وَإِلَيْهِ الْمَصِيرُ",
    },
    en: {
      morning:
        "We have entered the morning, and the whole kingdom has entered it belonging to Allah. Praise is for Allah; He has no partner; there is no god but Him, and to Him is the resurrection.",
      evening:
        "We have entered the evening, and the whole kingdom has entered it belonging to Allah. Praise is for Allah; He has no partner; there is no god but Him, and to Him is the final return.",
    },
    ms: {
      morning:
        "Kami berpagi-pagian, dan seluruh kerajaan pada pagi ini adalah milik Allah. Segala puji bagi Allah; tiada sekutu bagi-Nya; tiada tuhan melainkan Dia, dan kepada-Nyalah kebangkitan.",
      evening:
        "Kami berpetang-petangan, dan seluruh kerajaan pada petang ini adalah milik Allah. Segala puji bagi Allah; tiada sekutu bagi-Nya; tiada tuhan melainkan Dia, dan kepada-Nyalah tempat kembali.",
    },
    source: { en: "Abu Dawud", ms: "Abu Daud" },
    repeat: 3,
  },
  {
    kind: "dhikr",
    id: "fitrah-islam",
    arabic: {
      morning:
        "أَصْبَحْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ ﷺ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ",
      evening:
        "أَمْسَيْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ ﷺ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ",
    },
    en: {
      morning:
        "We have entered the morning upon the natural way of Islam, the word of pure sincerity, the religion of our Prophet Muhammad ﷺ, and the way of our father Ibrahim — upright, surrendered, and never of those who associate partners with Allah.",
      evening:
        "We have entered the evening upon the natural way of Islam, the word of pure sincerity, the religion of our Prophet Muhammad ﷺ, and the way of our father Ibrahim — upright, surrendered, and never of those who associate partners with Allah.",
    },
    ms: {
      morning:
        "Kami berpagi-pagian di atas fitrah Islam, di atas kalimah ikhlas, di atas agama Nabi kami Muhammad ﷺ, dan di atas millah bapa kami Ibrahim yang lurus lagi berserah diri, dan bukanlah dia daripada golongan musyrikin.",
      evening:
        "Kami berpetang-petangan di atas fitrah Islam, di atas kalimah ikhlas, di atas agama Nabi kami Muhammad ﷺ, dan di atas millah bapa kami Ibrahim yang lurus lagi berserah diri, dan bukanlah dia daripada golongan musyrikin.",
    },
    source: { en: "Ahmad", ms: "Ahmad" },
    repeat: 3,
  },
  {
    kind: "dhikr",
    id: "nikmah-afiyah",
    arabic: {
      morning:
        "اللَّهُمَّ إِنِّي أَصْبَحْتُ مِنْكَ فِي نِعْمَةٍ وَعَافِيَةٍ وَسِتْرٍ، فَأَتِمَّ نِعْمَتَكَ عَلَيَّ وَعَافِيَتَكَ وَسِتْرَكَ فِي الدُّنْيَا وَالْآخِرَةِ",
      evening:
        "اللَّهُمَّ إِنِّي أَمْسَيْتُ مِنْكَ فِي نِعْمَةٍ وَعَافِيَةٍ وَسِتْرٍ، فَأَتِمَّ نِعْمَتَكَ عَلَيَّ وَعَافِيَتَكَ وَسِتْرَكَ فِي الدُّنْيَا وَالْآخِرَةِ",
    },
    en: {
      morning:
        "O Allah, I have entered the morning in blessing, wellbeing, and concealment from You — so complete Your blessing upon me, Your wellbeing, and Your concealment, in this world and the Hereafter.",
      evening:
        "O Allah, I have entered the evening in blessing, wellbeing, and concealment from You — so complete Your blessing upon me, Your wellbeing, and Your concealment, in this world and the Hereafter.",
    },
    ms: {
      morning:
        "Ya Allah, aku berpagi ini dalam nikmat, afiat dan perlindungan daripada-Mu — maka sempurnakanlah nikmat-Mu ke atasku, afiat-Mu dan perlindungan-Mu, di dunia dan di akhirat.",
      evening:
        "Ya Allah, aku berpetang ini dalam nikmat, afiat dan perlindungan daripada-Mu — maka sempurnakanlah nikmat-Mu ke atasku, afiat-Mu dan perlindungan-Mu, di dunia dan di akhirat.",
    },
    source: { en: "Ibn as-Sunni", ms: "Ibn as-Sunni" },
    repeat: 3,
  },
  {
    kind: "dhikr",
    id: "syukur-nikmat",
    arabic: {
      morning:
        "اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ",
      evening:
        "اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ",
    },
    en: {
      morning:
        "O Allah, whatever blessing has reached me or any of Your creation this morning is from You alone, without partner — so to You is all praise, and to You is all thanks.",
      evening:
        "O Allah, whatever blessing has reached me or any of Your creation this evening is from You alone, without partner — so to You is all praise, and to You is all thanks.",
    },
    ms: {
      morning:
        "Ya Allah, apa jua nikmat yang ada padaku atau pada mana-mana makhluk-Mu pagi ini, maka ia daripada-Mu semata-mata, tiada sekutu bagi-Mu — maka bagi-Mu segala puji dan bagi-Mu segala syukur.",
      evening:
        "Ya Allah, apa jua nikmat yang ada padaku atau pada mana-mana makhluk-Mu petang ini, maka ia daripada-Mu semata-mata, tiada sekutu bagi-Mu — maka bagi-Mu segala puji dan bagi-Mu segala syukur.",
    },
    source: { en: "Abu Dawud", ms: "Abu Daud" },
  },
  {
    kind: "dhikr",
    id: "hamd-jalal",
    arabic:
      "يَا رَبِّ لَكَ الْحَمْدُ كَمَا يَنْبَغِي لِجَلَالِ وَجْهِكَ وَعَظِيمِ سُلْطَانِكَ",
    en: "My Lord, to You belongs all praise as befits the majesty of Your countenance and the greatness of Your dominion.",
    ms: "Wahai Tuhanku, bagi-Mu segala puji sebagaimana yang layak dengan keagungan wajah-Mu dan kebesaran kekuasaan-Mu.",
    repeat: 3,
  },
  {
    kind: "dhikr",
    id: "redha",
    arabic: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا وَرَسُولًا",
    en: "I am content with Allah as my Lord, with Islam as my religion, and with Muhammad ﷺ as Prophet and Messenger.",
    ms: "Aku redha Allah sebagai Tuhanku, Islam sebagai agamaku, dan Muhammad ﷺ sebagai Nabi dan Rasul.",
    source: { en: "Abu Dawud, at-Tirmidhi", ms: "Abu Daud, at-Tirmizi" },
    repeat: 3,
  },
  {
    kind: "dhikr",
    id: "subhanallah-adad",
    arabic:
      "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ",
    en: "Glory and praise be to Allah — as many times as the number of His creation, as pleases Him, as weighty as His Throne, and as vast as the ink of His words.",
    ms: "Maha Suci Allah dan dengan puji-Nya — sebanyak bilangan makhluk-Nya, seredha diri-Nya, seberat Arasy-Nya dan sebanyak tinta kalimah-kalimah-Nya.",
    source: { en: "Muslim", ms: "Muslim" },
    repeat: 3,
  },
  {
    kind: "dhikr",
    id: "bismillah-ladzi",
    arabic:
      "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
    en: "In the name of Allah — with whose name nothing on earth or in heaven can cause harm — and He is the All-Hearing, the All-Knowing.",
    ms: "Dengan nama Allah yang dengan nama-Nya tiada sesuatu pun di bumi mahupun di langit dapat memberi mudarat, dan Dialah Yang Maha Mendengar lagi Maha Mengetahui.",
    source: { en: "Abu Dawud, at-Tirmidhi", ms: "Abu Daud, at-Tirmizi" },
    repeat: 3,
  },
  {
    kind: "dhikr",
    id: "perlindungan-syirik",
    arabic:
      "اللَّهُمَّ إِنَّا نَعُوذُ بِكَ مِنْ أَنْ نُشْرِكَ بِكَ شَيْئًا نَعْلَمُهُ، وَنَسْتَغْفِرُكَ لِمَا لَا نَعْلَمُهُ",
    en: "O Allah, we seek refuge in You from knowingly associating anything with You, and we seek Your forgiveness for what we do unknowingly.",
    ms: "Ya Allah, kami berlindung dengan-Mu daripada mempersekutukan-Mu dengan sesuatu yang kami sedari, dan kami memohon keampunan-Mu bagi apa yang tidak kami sedari.",
    source: { en: "Ahmad", ms: "Ahmad" },
    repeat: 3,
  },
  {
    kind: "dhikr",
    id: "kalimat-tammat",
    arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
    en: "I seek refuge in the perfect words of Allah from the evil of what He has created.",
    ms: "Aku berlindung dengan kalimah-kalimah Allah yang sempurna daripada kejahatan makhluk ciptaan-Nya.",
    source: { en: "Muslim", ms: "Muslim" },
    repeat: 3,
  },
  {
    kind: "dhikr",
    id: "ham-hazan",
    arabic:
      "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ، وَأَعُوذُ بِكَ مِنَ الْجُبْنِ وَالْبُخْلِ، وَأَعُوذُ بِكَ مِنْ غَلَبَةِ الدَّيْنِ وَقَهْرِ الرِّجَالِ",
    en: "O Allah, I seek refuge in You from worry and grief; from incapacity and laziness; from cowardice and miserliness; and from being overwhelmed by debt and overpowered by men.",
    ms: "Ya Allah, aku berlindung dengan-Mu daripada keluh-kesah dan dukacita; daripada kelemahan dan kemalasan; daripada sifat pengecut dan bakhil; dan daripada bebanan hutang serta penindasan manusia.",
    source: { en: "al-Bukhari", ms: "al-Bukhari" },
    repeat: 3,
  },
  {
    kind: "dhikr",
    id: "afini",
    arabic:
      "اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ",
    en: "O Allah, grant wellbeing to my body; O Allah, grant wellbeing to my hearing; O Allah, grant wellbeing to my sight. There is no god but You.",
    ms: "Ya Allah, sihatkanlah tubuh badanku; Ya Allah, sihatkanlah pendengaranku; Ya Allah, sihatkanlah penglihatanku. Tiada tuhan melainkan Engkau.",
    source: { en: "Abu Dawud", ms: "Abu Daud" },
    repeat: 3,
  },
  {
    kind: "dhikr",
    id: "sayyidul-istighfar",
    arabic:
      "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي، فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
    en: "O Allah, You are my Lord; there is no god but You. You created me and I am Your servant, keeping Your covenant and promise as best I can. I seek refuge in You from the evil I have done. I acknowledge Your favour upon me, and I acknowledge my sin — so forgive me, for none forgives sins but You. (Sayyid al-Istighfar — the master supplication of forgiveness)",
    ms: "Ya Allah, Engkaulah Tuhanku, tiada tuhan melainkan Engkau. Engkau menciptakanku dan aku hamba-Mu, dan aku tetap atas perjanjian dan janji-Mu sekadar termampu. Aku berlindung dengan-Mu daripada kejahatan yang telah kulakukan. Aku mengakui nikmat-Mu ke atasku dan aku mengakui dosaku — maka ampunilah aku, kerana tiada yang mengampunkan dosa melainkan Engkau. (Sayyidul Istighfar — penghulu istighfar)",
    source: { en: "al-Bukhari", ms: "al-Bukhari" },
    repeat: 3,
  },
  {
    kind: "dhikr",
    id: "istighfar",
    arabic:
      "أَسْتَغْفِرُ اللَّهَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ",
    en: "I seek the forgiveness of Allah — there is no god but Him, the Ever-Living, the Sustainer — and I turn to Him in repentance.",
    ms: "Aku memohon keampunan Allah yang tiada tuhan melainkan Dia, Yang Maha Hidup lagi Maha Berdiri Sendiri, dan aku bertaubat kepada-Nya.",
    repeat: 3,
  },
  {
    kind: "dhikr",
    id: "salawat",
    arabic: "اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ وَعَلَى آلِ سَيِّدِنَا مُحَمَّدٍ",
    en: "O Allah, send Your blessings upon our master Muhammad and upon the family of our master Muhammad.",
    ms: "Ya Allah, limpahkanlah selawat ke atas junjungan kami Muhammad dan ke atas keluarga junjungan kami Muhammad.",
    repeat: 10,
  },
  {
    kind: "dhikr",
    id: "tahlil",
    arabic:
      "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    en: "There is no god but Allah alone, with no partner. His is the dominion and His is the praise, and He has power over all things.",
    ms: "Tiada tuhan melainkan Allah semata-mata, tiada sekutu bagi-Nya. Milik-Nya segala kerajaan dan bagi-Nya segala puji, dan Dia Maha Berkuasa atas segala sesuatu.",
    source: { en: "al-Bukhari, Muslim", ms: "al-Bukhari, Muslim" },
    repeat: 10,
  },
  {
    kind: "dhikr",
    id: "kaffarah-majlis",
    arabic:
      "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ",
    en: "Glory be to You, O Allah, and with Your praise. I bear witness that there is no god but You; I seek Your forgiveness and turn to You in repentance.",
    ms: "Maha Suci Engkau, ya Allah, dan dengan puji-Mu. Aku bersaksi bahawa tiada tuhan melainkan Engkau; aku memohon keampunan-Mu dan bertaubat kepada-Mu.",
    source: { en: "at-Tirmidhi", ms: "at-Tirmizi" },
  },
  {
    kind: "dhikr",
    id: "dua-rabitah",
    arabic:
      "اللَّهُمَّ إِنَّكَ تَعْلَمُ أَنَّ هَذِهِ الْقُلُوبَ قَدِ اجْتَمَعَتْ عَلَى مَحَبَّتِكَ، وَالْتَقَتْ عَلَى طَاعَتِكَ، وَتَوَحَّدَتْ عَلَى دَعْوَتِكَ، وَتَعَاهَدَتْ عَلَى نُصْرَةِ شَرِيعَتِكَ، فَوَثِّقِ اللَّهُمَّ رَابِطَتَهَا، وَأَدِمْ وُدَّهَا، وَاهْدِهَا سُبُلَهَا، وَامْلَأْهَا بِنُورِكَ الَّذِي لَا يَخْبُو، وَاشْرَحْ صُدُورَهَا بِفَيْضِ الْإِيمَانِ بِكَ، وَجَمِيلِ التَّوَكُّلِ عَلَيْكَ، وَأَحْيِهَا بِمَعْرِفَتِكَ، وَأَمِتْهَا عَلَى الشَّهَادَةِ فِي سَبِيلِكَ، إِنَّكَ نِعْمَ الْمَوْلَى وَنِعْمَ النَّصِيرُ",
    en: "O Allah, You know that these hearts have gathered upon love of You, met upon obedience to You, united upon Your call, and pledged to support Your sacred law. So strengthen, O Allah, their bond; make their affection lasting; guide them on their paths; fill them with Your light that never dims; expand their breasts with the abundance of faith in You and beautiful reliance upon You; give them life through knowing You, and grant them death upon martyrdom in Your path. Truly You are the best Protector and the best Helper. (Du'a Rabitah)",
    ms: "Ya Allah, sesungguhnya Engkau mengetahui bahawa hati-hati ini telah berhimpun di atas kecintaan kepada-Mu, bertemu di atas ketaatan kepada-Mu, bersatu di atas dakwah-Mu, dan berjanji setia untuk menolong syariat-Mu. Maka eratkanlah, ya Allah, ikatannya; kekalkanlah kasih sayangnya; tunjukkanlah jalan-jalannya; penuhilah ia dengan cahaya-Mu yang tidak pernah malap; lapangkanlah dadanya dengan limpahan iman kepada-Mu dan tawakal yang indah kepada-Mu; hidupkanlah ia dengan makrifat-Mu, dan matikanlah ia dalam syahid di jalan-Mu. Sesungguhnya Engkau sebaik-baik Pelindung dan sebaik-baik Penolong. (Doa Rabitah)",
  },
];

/* ────────────────────────────────────────────────────────────────────────
 * Manzil — the classical 33-passage protection compilation, read daily
 * as ruqyah. All items are Quranic.
 * ──────────────────────────────────────────────────────────────────────── */

export const MANZIL: QuranPassageItem[] = [
  { kind: "quran", id: "m-fatiha", surah: 1, from: 1, to: 7 },
  { kind: "quran", id: "m-baqarah-1-5", surah: 2, from: 1, to: 5 },
  { kind: "quran", id: "m-baqarah-163", surah: 2, from: 163, to: 163 },
  { kind: "quran", id: "m-baqarah-255-257", surah: 2, from: 255, to: 257 },
  { kind: "quran", id: "m-baqarah-284-286", surah: 2, from: 284, to: 286 },
  { kind: "quran", id: "m-imran-18", surah: 3, from: 18, to: 18 },
  { kind: "quran", id: "m-imran-26-27", surah: 3, from: 26, to: 27 },
  { kind: "quran", id: "m-araf-54-56", surah: 7, from: 54, to: 56 },
  { kind: "quran", id: "m-isra-110-111", surah: 17, from: 110, to: 111 },
  { kind: "quran", id: "m-muminun-115-118", surah: 23, from: 115, to: 118 },
  { kind: "quran", id: "m-saffat-1-11", surah: 37, from: 1, to: 11 },
  { kind: "quran", id: "m-rahman-33-40", surah: 55, from: 33, to: 40 },
  { kind: "quran", id: "m-hashr-21-24", surah: 59, from: 21, to: 24 },
  { kind: "quran", id: "m-jinn-1-4", surah: 72, from: 1, to: 4 },
  { kind: "quran", id: "m-kafirun", surah: 109, from: 1, to: 6 },
  { kind: "quran", id: "m-ikhlas", surah: 112, from: 1, to: 4 },
  { kind: "quran", id: "m-falaq", surah: 113, from: 1, to: 5 },
  { kind: "quran", id: "m-nas", surah: 114, from: 1, to: 6 },
];

/** Every unique surah a routine needs, for a single batched server fetch. */
export function uniqueSurahs(items: readonly WiridItem[]): number[] {
  const set = new Set<number>();
  for (const item of items) {
    if (item.kind === "quran") set.add(item.surah);
  }
  return [...set].sort((a, b) => a - b);
}
