/**
 * Changelog — single source of truth for the app's version history.
 *
 * Drives both the in-app "What's New" page (/changelog) and the version shown
 * in the footer. Keep CHANGELOG.md (repo root) in sync with this list when
 * cutting a release. Newest release first; `APP_VERSION` is derived from it.
 *
 * Entries are user-facing summaries (not raw commit messages) and bilingual
 * (en / ms) so they read naturally in either language.
 */

export type ChangeType = "added" | "improved" | "fixed";

export interface ChangelogEntry {
  type: ChangeType;
  en: string;
  ms: string;
}

export interface Release {
  /** Semantic version, e.g. "0.8.0". */
  version: string;
  /** Release date, ISO yyyy-mm-dd. */
  date: string;
  title: { en: string; ms: string };
  entries: ChangelogEntry[];
}

/** Newest first. The first entry's version is the current app version. */
export const RELEASES: Release[] = [
  {
    version: "0.11.0",
    date: "2026-07-02",
    title: { en: "Wirid — daily adhkar", ms: "Wirid — zikir harian" },
    entries: [
      {
        type: "added",
        en: "A new Wirid tab: recite Al-Ma'thurat (the sughra morning and evening adhkar) and the Manzil protection verses, each with full translation, hadith sources, and a tasbih-style tap counter that tracks today's progress on your device.",
        ms: "Tab Wirid baharu: baca Al-Ma'thurat (zikir pagi dan petang sughra) dan ayat-ayat perlindungan Manzil, masing-masing dengan terjemahan penuh, sumber hadis, dan pembilang gaya tasbih yang menjejak kemajuan hari ini pada peranti anda.",
      },
      {
        type: "added",
        en: "Recognize can now read images (beta): snap a photo or upload a screenshot of clear Arabic print and the exact verse is found — all recognition runs on your device, so images never leave it. It also forgives words typed or scanned without spaces (e.g. ربالعالمين). Ornate mushaf script isn't reliably read yet; typing remains most accurate.",
        ms: "Kenal Pasti kini boleh membaca imej (beta): ambil gambar atau muat naik tangkapan skrin cetakan Arab yang jelas dan ayat yang tepat akan ditemui — semua pengecaman berjalan pada peranti anda, jadi imej tidak sesekali meninggalkannya. Ia juga memaafkan perkataan yang ditaip atau diimbas tanpa jarak (cth. ربالعالمين). Skrip mushaf berhias belum dapat dibaca dengan tepat; menaip kekal paling tepat.",
      },
      {
        type: "improved",
        en: "A calmer, easier navigation: the bottom bar now carries the four daily journeys (Home, Learn, Read, Wirid), search lives one tap away in the top corner of every screen, and secondary tools are gathered under More.",
        ms: "Navigasi lebih tenang dan mudah: bar bawah kini membawa empat perjalanan harian (Utama, Belajar, Baca, Wirid), carian berada satu ketikan sahaja di penjuru atas setiap skrin, dan alatan sekunder dihimpunkan di bawah Lagi.",
      },
      {
        type: "improved",
        en: "The app loads lighter — an unused 8 MB image was removed and the version history no longer ships with every page.",
        ms: "Aplikasi dimuat lebih ringan — imej 8 MB yang tidak digunakan telah dibuang dan sejarah versi tidak lagi dihantar bersama setiap halaman.",
      },
      {
        type: "fixed",
        en: "Ayah recognition now highlights the correct words when a verse repeats the same word, and screen readers hear a short announcement instead of the whole verse.",
        ms: "Pengecaman ayat kini menyerlahkan perkataan yang betul apabila sesuatu ayat mengulang perkataan yang sama, dan pembaca skrin mendengar pengumuman ringkas dan bukannya keseluruhan ayat.",
      },
    ],
  },
  {
    version: "0.10.1",
    date: "2026-06-20",
    title: { en: "Truer Mushaf pages", ms: "Halaman Mushaf lebih tulen" },
    entries: [
      {
        type: "improved",
        en: "The Mushaf now reads like a real printed page — every line is justified edge-to-edge and each page is the same size, so the text no longer drifts or changes size as you turn pages. A surah's short closing line sits centred, just as in print.",
        ms: "Mushaf kini kelihatan seperti halaman bercetak sebenar — setiap baris dijajarkan dari hujung ke hujung dan setiap halaman sama saiz, jadi teks tidak lagi beralih atau bertukar saiz semasa anda menyelak. Baris penutup pendek sesuatu surah berada di tengah, seperti dalam cetakan.",
      },
      {
        type: "fixed",
        en: "Fixed pages where the basmalah sits inside the surah title band (such as An-Nisāʾ) spilling past the 15 lines and shrinking the whole page. The install prompt no longer covers the reader, and page turns now follow your device's reduce-motion setting.",
        ms: "Membetulkan halaman yang basmalah berada dalam jalur tajuk surah (seperti An-Nisāʾ) terlebih daripada 15 baris dan mengecilkan seluruh halaman. Gesaan pemasangan tidak lagi menutup pembaca, dan selakan halaman kini mengikut tetapan kurangkan-gerakan peranti anda.",
      },
    ],
  },
  {
    version: "0.10.0",
    date: "2026-06-03",
    title: { en: "Mushaf reader", ms: "Pembaca Mushaf" },
    entries: [
      {
        type: "added",
        en: "A new Mushaf — read the Quran page by page in the authentic 15-line Madani script, turning pages right-to-left like a real Quran. A header shows the current surah, juz and page; jump straight to any surah, juz or page; switch between Madani, plain Uthmani and tajweed-coloured views; adjust text size and reciter in settings; and tap any verse to play it, bookmark, copy, share or read its translation.",
        ms: "Mushaf baharu — baca al-Quran halaman demi halaman dalam skrip Madani 15 baris yang asli, menyelak halaman dari kanan ke kiri seperti al-Quran sebenar. Pengepala menunjukkan surah, juzuk dan halaman semasa; lompat terus ke mana-mana surah, juzuk atau halaman; tukar antara paparan Madani, Uthmani biasa dan berwarna tajwid; laras saiz teks dan qari dalam tetapan; dan ketik mana-mana ayat untuk mainkannya, simpan, salin, kongsi atau baca terjemahannya.",
      },
      {
        type: "fixed",
        en: "Corrected the word إِنَّ (inna), which was being taught as “if” — it means “indeed / surely” (sesungguhnya). The conditional “if” is a different word, إِنْ (in). A handful of other word meanings were cleaned up and many Malay glosses repaired in the same pass.",
        ms: "Membetulkan perkataan إِنَّ (inna) yang sebelum ini diajar sebagai “if” — maknanya “sesungguhnya”. Perkataan syarat “jika/sekiranya” ialah perkataan lain, إِنْ (in). Beberapa makna perkataan lain turut dikemas kini dan banyak makna Melayu diperbaiki sekali.",
      },
    ],
  },
  {
    version: "0.9.1",
    date: "2026-06-02",
    title: { en: "Per-verse tajweed legend", ms: "Legenda tajwid ikut ayat" },
    entries: [
      {
        type: "improved",
        en: "The colour key under each verse now lists only the tajweed rules that actually appear in that verse — and every colour shown is now explained, including ones the old fixed key left out (like the purple idgham).",
        ms: "Kunci warna di bawah setiap ayat kini menyenaraikan hanya hukum tajwid yang benar-benar ada dalam ayat itu — dan setiap warna yang dipaparkan kini diterangkan, termasuk yang tertinggal sebelum ini (seperti idgham ungu).",
      },
    ],
  },
  {
    version: "0.9.0",
    date: "2026-06-01",
    title: { en: "Daily Quest & streaks", ms: "Misi Harian & streak" },
    entries: [
      {
        type: "added",
        en: "A Daily Quest on the Learn dashboard — hit your daily review goal to keep your streak alive. Set the goal that suits you (5–30 words a day).",
        ms: "Misi Harian di papan pemuka Belajar — capai matlamat ulang kaji harian untuk mengekalkan streak anda. Tetapkan matlamat yang sesuai (5–30 perkataan sehari).",
      },
    ],
  },
  {
    version: "0.8.9",
    date: "2026-06-01",
    title: { en: "Intensive review for weak words", ms: "Ulang kaji intensif untuk perkataan lemah" },
    entries: [
      {
        type: "added",
        en: "Reviewing your mistakes now teaches before it tests. Words you keep forgetting open on a short \"understand it first\" step — meaning, root, verse context and audio — then quiz you, instead of repeating the same recall test.",
        ms: "Mengulang kaji kesilapan kini mengajar dahulu sebelum menguji. Perkataan yang anda sering lupa akan dibuka dengan langkah \"fahami dahulu\" — makna, akar, konteks ayat dan audio — kemudian menguji anda, bukan mengulang ujian yang sama.",
      },
    ],
  },
  {
    version: "0.8.8",
    date: "2026-06-01",
    title: { en: "Tajweed memory aids & reciter choice", ms: "Bantuan hafalan tajwid & pilihan qari" },
    entries: [
      {
        type: "added",
        en: "Tajweed rules with a classic mnemonic now show it — Qalqalah (قُطْبُ جَدٍّ), Idgham bil-Ghunna (يَنْمُو), and the Ikhfa couplet — so you can memorise the letters the traditional way.",
        ms: "Hukum tajwid yang ada bait hafalan klasik kini memaparkannya — Qalqalah (قُطْبُ جَدٍّ), Idgham Bil-Ghunnah (يَنْمُو), dan bait Ikhfa — supaya anda boleh menghafal hurufnya cara tradisional.",
      },
      {
        type: "added",
        en: "You can now choose which reciter the tajweed examples use — pick a slower qari if it's easier to follow.",
        ms: "Anda kini boleh memilih qari untuk contoh tajwid — pilih qari yang lebih perlahan jika lebih mudah diikuti.",
      },
    ],
  },
  {
    version: "0.8.7",
    date: "2026-06-01",
    title: { en: "Faster reading & smarter search", ms: "Bacaan lebih pantas & carian lebih pintar" },
    entries: [
      {
        type: "improved",
        en: "Switching translation in the reader is now instant — it swaps in place instead of reloading the whole surah, so no more lag.",
        ms: "Menukar terjemahan dalam pembaca kini serta-merta — ia bertukar di tempat tanpa memuat semula seluruh surah, jadi tiada lagi lag.",
      },
      {
        type: "improved",
        en: "Surah search now understands spelling variations — \"yasin\", \"yaseen\" and \"yasiin\" all find Yaseen, and \"kauthar\" finds Al-Kawthar.",
        ms: "Carian surah kini memahami variasi ejaan — \"yasin\", \"yaseen\" dan \"yasiin\" semua menemui Yaseen, dan \"kauthar\" menemui Al-Kawthar.",
      },
    ],
  },
  {
    version: "0.8.6",
    date: "2026-06-01",
    title: { en: "Reading & guide polish", ms: "Kemasan bacaan & panduan" },
    entries: [
      {
        type: "improved",
        en: "Tajweed examples now name the surah (e.g. \"An-Nas 114:1\") instead of a bare number, and the idgham shafawi example is now short and clear.",
        ms: "Contoh tajwid kini menamakan surah (cth. \"An-Nas 114:1\") bukan sekadar nombor, dan contoh idgham syafawi kini pendek dan jelas.",
      },
      {
        type: "improved",
        en: "Removed the confusing single-letter code from each tajweed rule card.",
        ms: "Membuang kod satu huruf yang mengelirukan daripada setiap kad hukum tajwid.",
      },
      {
        type: "improved",
        en: "\"Jump to surah\" now appears at the top of the reader as well as the bottom.",
        ms: "\"Lompat ke surah\" kini muncul di bahagian atas pembaca, bukan hanya di bawah.",
      },
      {
        type: "improved",
        en: "The surah list now tells you which filter is hiding results when nothing matches.",
        ms: "Senarai surah kini memberitahu penapis mana yang menyembunyikan hasil apabila tiada yang sepadan.",
      },
      {
        type: "added",
        en: "A feedback link so you can reach the developer directly with ideas or to collaborate.",
        ms: "Pautan maklum balas supaya anda boleh menghubungi pembangun secara terus dengan idea atau untuk bekerjasama.",
      },
    ],
  },
  {
    version: "0.8.5",
    date: "2026-06-01",
    title: { en: "Examples in full context", ms: "Contoh dalam konteks penuh" },
    entries: [
      {
        type: "improved",
        en: "Each tajweed example now shows the whole verse with the relevant word(s) coloured, so you can see the rule in context.",
        ms: "Setiap contoh tajwid kini memaparkan seluruh ayat dengan perkataan berkaitan diwarnakan, supaya anda nampak hukum itu dalam konteks.",
      },
      {
        type: "improved",
        en: "The example audio plays the whole verse and now has a draggable progress bar with a time readout — scrub forward or back as you listen.",
        ms: "Audio contoh memainkan seluruh ayat dan kini mempunyai bar kemajuan yang boleh diseret dengan paparan masa — laju ke depan atau ke belakang semasa mendengar.",
      },
    ],
  },
  {
    version: "0.8.4",
    date: "2026-06-01",
    title: { en: "Sharper example audio", ms: "Audio contoh lebih tepat" },
    entries: [
      {
        type: "improved",
        en: "The example audio now plays just the highlighted word or phrase instead of the whole verse — so you hear exactly the part the rule applies to.",
        ms: "Audio contoh kini memainkan hanya perkataan atau frasa yang diserlahkan, bukan seluruh ayat — jadi anda mendengar tepat bahagian yang dikenakan hukum itu.",
      },
    ],
  },
  {
    version: "0.8.3",
    date: "2026-06-01",
    title: { en: "Hear the examples", ms: "Dengar contoh" },
    entries: [
      {
        type: "added",
        en: "Tajweed example cards now have a \"Hear the verse\" button so you can listen to the rule in its Quranic context.",
        ms: "Kad contoh tajwid kini mempunyai butang \"Dengar ayat\" supaya anda boleh mendengar hukum itu dalam konteks Al-Quran.",
      },
      {
        type: "added",
        en: "Each rule now has more than one example — tap \"Another example\" to cycle through them.",
        ms: "Setiap hukum kini mempunyai lebih daripada satu contoh — ketik \"Contoh lain\" untuk melihat yang seterusnya.",
      },
      {
        type: "improved",
        en: "Example explanations now follow the selected language instead of always showing English.",
        ms: "Penerangan contoh kini mengikut bahasa yang dipilih, bukan sentiasa dalam Bahasa Inggeris.",
      },
    ],
  },
  {
    version: "0.8.2",
    date: "2026-06-01",
    title: { en: "Tajweed examples", ms: "Contoh tajwid" },
    entries: [
      {
        type: "added",
        en: "Every tajweed rule in the guide now shows a worked example from the Quran (e.g. مِن رَّبِّهِمْ → \"mir-rabbihim\").",
        ms: "Setiap hukum tajwid dalam panduan kini menunjukkan contoh daripada Al-Quran (cth. مِن رَّبِّهِمْ → \"mir-rabbihim\").",
      },
      {
        type: "improved",
        en: "Clearer Malay wording for the silent Alif al-Fāriqah.",
        ms: "Penerangan Bahasa Melayu yang lebih jelas untuk Alif al-Fariqah yang senyap.",
      },
    ],
  },
  {
    version: "0.8.1",
    date: "2026-06-01",
    title: { en: "Tajweed wording", ms: "Penerangan tajwid" },
    entries: [
      {
        type: "fixed",
        en: "The silent alif is now explained as Alif al-Fāriqah — the alif after a plural waw (كَفَرُوا۟ is read \"kafaruu\").",
        ms: "Alif senyap kini dijelaskan sebagai Alif Al-Fariqah — alif selepas waw jamak (كَفَرُوا۟ dibaca \"kafaruu\").",
      },
      {
        type: "fixed",
        en: "Waqf stop-signs now use their proper names: Al-Waqf al-Awla, Al-Wasl al-Awla, and Lā Taqif.",
        ms: "Tanda waqaf kini menggunakan nama sebenar: Al-Waqf Awla, Al-Wasl Awla, dan La Taqif.",
      },
    ],
  },
  {
    version: "0.8.0",
    date: "2026-06-01",
    title: { en: "Accuracy & polish", ms: "Ketepatan & kemasan" },
    entries: [
      {
        type: "added",
        en: "This page! See what changed in every update, newest first.",
        ms: "Halaman ini! Lihat perubahan dalam setiap kemas kini, terbaharu dahulu.",
      },
      {
        type: "fixed",
        en: "Corrected tajweed rule labels to match the authoritative source — silent letters, Madd ʿAariḍ, and the Muttasil/Munfasil madd are now named correctly.",
        ms: "Membetulkan label hukum tajwid agar tepat dengan sumber sahih — huruf senyap, Mad ʿAridh, dan mad Muttasil/Munfasil kini dinamakan dengan betul.",
      },
      {
        type: "added",
        en: "Added the Iqlab tajweed rule, which was previously left uncoloured.",
        ms: "Menambah hukum tajwid Iqlab yang sebelum ini tidak diwarnakan.",
      },
      {
        type: "fixed",
        en: "Squashed a rendering bug and cleaned up the codebase for stability.",
        ms: "Membaiki pepijat paparan dan mengemas kod untuk kestabilan.",
      },
    ],
  },
  {
    version: "0.7.0",
    date: "2026-05-31",
    title: { en: "Mobile redesign", ms: "Reka bentuk mudah alih" },
    entries: [
      {
        type: "added",
        en: "A new mobile bottom navigation bar and a cleaner header — everything is a thumb-tap away.",
        ms: "Bar navigasi bawah baharu untuk mudah alih dan pengepala yang lebih kemas — semuanya hanya satu sentuhan jauh.",
      },
      {
        type: "added",
        en: "A first-run guided tour that explains each part of the app.",
        ms: "Tutorial panduan kali pertama yang menerangkan setiap bahagian aplikasi.",
      },
      {
        type: "added",
        en: "Tajweed Quest — interactive lessons that test you on tajweed rules (early preview).",
        ms: "Tajweed Quest — pelajaran interaktif yang menguji anda tentang hukum tajwid (pratonton awal).",
      },
      {
        type: "improved",
        en: "Tapping a word is much faster — we removed a 1.1 MB download and now prefetch verses on the server.",
        ms: "Menekan perkataan kini jauh lebih pantas — kami membuang muat turun 1.1 MB dan kini pramuat ayat di pelayan.",
      },
    ],
  },
  {
    version: "0.6.0",
    date: "2026-05-26",
    title: { en: "Languages", ms: "Bahasa" },
    entries: [
      {
        type: "added",
        en: "A first-launch language picker — choose English or Bahasa Melayu.",
        ms: "Pemilih bahasa ketika mula — pilih Bahasa Inggeris atau Bahasa Melayu.",
      },
      {
        type: "added",
        en: "Malay surah translations throughout the app.",
        ms: "Terjemahan surah dalam Bahasa Melayu di seluruh aplikasi.",
      },
      {
        type: "improved",
        en: "Surah Quest difficulty tiers and smoother audio playback.",
        ms: "Tahap kesukaran Misi Surah dan main balik audio yang lebih lancar.",
      },
    ],
  },
  {
    version: "0.5.0",
    date: "2026-05-26",
    title: { en: "Roots & accuracy", ms: "Akar kata & ketepatan" },
    entries: [
      {
        type: "added",
        en: "Root pages showing every unique form a root takes across the Quran.",
        ms: "Halaman akar kata yang menunjukkan setiap bentuk unik sesuatu akar di seluruh Al-Quran.",
      },
      {
        type: "improved",
        en: "Richer Malay word glosses and more accurate translations.",
        ms: "Maksud perkataan Melayu yang lebih kaya dan terjemahan yang lebih tepat.",
      },
      {
        type: "added",
        en: "The Mubin brand icon now appears across the app and as the install icon.",
        ms: "Ikon jenama Mubin kini muncul di seluruh aplikasi dan sebagai ikon pemasangan.",
      },
    ],
  },
  {
    version: "0.4.0",
    date: "2026-05-26",
    title: { en: "Tajweed", ms: "Tajwid" },
    entries: [
      {
        type: "added",
        en: "Interactive tajweed colours in the reader.",
        ms: "Warna tajwid interaktif dalam pembaca.",
      },
      {
        type: "added",
        en: "A tajweed rule guide and a full waqf (stop-sign) symbol reference.",
        ms: "Panduan hukum tajwid dan rujukan penuh simbol waqaf (tanda berhenti).",
      },
      {
        type: "improved",
        en: "Switched to the Amiri Quran font so Mushaf marks render correctly.",
        ms: "Beralih kepada fon Amiri Quran supaya tanda Mushaf dipaparkan dengan betul.",
      },
    ],
  },
  {
    version: "0.3.0",
    date: "2026-05-25",
    title: { en: "Insights & offline", ms: "Analisis & luar talian" },
    entries: [
      {
        type: "added",
        en: "A mastery heatmap and tadabbur (reflection) notes in your analytics.",
        ms: "Peta haba penguasaan dan nota tadabbur (renungan) dalam analisis anda.",
      },
      {
        type: "added",
        en: "Progressive Web App support — install Mubin and read offline.",
        ms: "Sokongan Progressive Web App — pasang Mubin dan baca tanpa talian.",
      },
    ],
  },
  {
    version: "0.2.0",
    date: "2026-05-25",
    title: { en: "Surah Quest", ms: "Misi Surah" },
    entries: [
      {
        type: "added",
        en: "Surah Quest — learn the vocabulary of a specific surah, unlocked by mastering the one before it.",
        ms: "Misi Surah — pelajari kosa kata sesuatu surah, dibuka apabila anda menguasai surah sebelumnya.",
      },
      {
        type: "added",
        en: "New game types: build-the-translation and match-the-pairs.",
        ms: "Jenis permainan baharu: bina terjemahan dan padankan pasangan.",
      },
      {
        type: "improved",
        en: "A clear, unmissable correct/wrong feedback bar in flashcards.",
        ms: "Bar maklum balas betul/salah yang jelas dalam flashcard.",
      },
    ],
  },
  {
    version: "0.1.0",
    date: "2026-05-24",
    title: { en: "Mubin launch", ms: "Pelancaran Mubin" },
    entries: [
      {
        type: "added",
        en: "Word-by-word Quran study with spaced repetition (FSRS) — learn the highest-frequency words first.",
        ms: "Kajian Al-Quran kata demi kata dengan spaced repetition (FSRS) — pelajari perkataan paling kerap dahulu.",
      },
      {
        type: "added",
        en: "Read any surah and tap any Arabic word for its meaning, root, and every verse it appears in.",
        ms: "Baca mana-mana surah dan tekan mana-mana kata Arab untuk maksud, akar, dan setiap ayat ia muncul.",
      },
      {
        type: "added",
        en: "A modern Mushaf reading aesthetic.",
        ms: "Estetika bacaan Mushaf moden.",
      },
    ],
  },
];

// APP_VERSION lives in its own tiny module so every-page consumers (footer,
// version store) don't pull this whole release history into their bundle.
// changelog.test.ts pins RELEASES[0].version to it.
export { APP_VERSION, compareVersions } from "@/lib/app-version";
