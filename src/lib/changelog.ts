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

/** Current app version — always the newest release. */
export const APP_VERSION = RELEASES[0].version;

/**
 * Compare two dotted version strings. Returns a negative number if `a < b`,
 * positive if `a > b`, and 0 if equal. Tolerant of differing segment counts.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
