#!/usr/bin/env node
// Computes lemma frequencies + cumulative coverage from public/data/words/*.json.
// Now includes both English and Malay glosses with diacritic-agnostic matching.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildGlossTables,
  resolveGloss,
  cleanEnGloss,
} from "./lib/glosses.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const WORDS_DIR = path.join(PROJECT_ROOT, "public", "data", "words");
const OUT_LEMMA = path.join(PROJECT_ROOT, "public", "data", "lemma-frequency.json");
const OUT_COVERAGE = path.join(PROJECT_ROOT, "public", "data", "coverage.json");

// Curated Malay glosses for the most frequent lemmas in the Quran.
// Keys are bare Arabic (no tashkeel) — normalize() is applied before lookup
// so it matches lemmas whether or not they carry diacritics in the dataset.
// Covers the top ~280 lemmas (~70% of all Quran tokens by frequency).
const RAW_MS_GLOSSES = {
  // — Particles, prepositions, conjunctions —
  "من|P": "daripada / dari",
  "من|N": "siapa / sesiapa",
  // إِنَّ (inna, with shadda) and إِنْ (in, without) are a minimal pair: the
  // shadda is the ONLY distinguishing mark and it changes the meaning entirely
  // (emphatic "indeed" vs conditional "if"). They are keyed with full diacritics
  // so the exact-match layer keeps them apart — a bare "إن" key would collapse
  // both into one (diacritic-stripping) bucket and mistranslate one of them.
  "إِنّ": "sesungguhnya",
  "إِن": "sekiranya / jika",
  "أن": "bahawa / untuk",
  "لا": "tidak / bukan",
  "في": "di dalam / pada",
  "ما": "apa yang / tidak",
  "على": "ke atas / di atas",
  "إلى": "kepada / ke arah",
  "مع": "bersama-sama",
  "ب": "dengan / pada",
  "و": "dan",
  "ف": "maka / lalu",
  "ل": "untuk / bagi / kepunyaan",
  "إذا": "apabila / tatkala",
  "إذ": "ketika / sewaktu",
  "ثم": "kemudian",
  "أو": "atau",
  "لم": "tidak / belum",
  "قد": "sesungguhnya / sudah",
  "أي": "mana / mana satu",
  "بعد": "selepas / sesudah",
  "قبل": "sebelum",
  "عند": "di sisi / mempunyai",
  "كما": "seperti mana",
  "لكن": "tetapi",
  "حتى": "sehingga",
  "إلا": "melainkan / kecuali",
  "أم": "atau",
  "ولو": "dan sekiranya",
  "فلما": "maka tatkala",
  "ألم": "bukankah",
  "عن": "tentang / daripada",
  "بين": "antara",
  "دون": "selain / di bawah",
  "بل": "bahkan / malah",
  "لن": "tidak akan",
  "ف": "maka / lalu",
  "هل": "adakah",
  "كيف": "bagaimana",
  "لولا": "kalau tidak",
  "أما": "adapun",
  "ليس": "bukan / tidak",
  "غير": "selain / bukan",
  "تحت": "di bawah",

  // — Demonstratives & pronouns —
  "هذا": "ini",
  "ذلك": "itu",
  "ذا": "itu / yang demikian",
  "الذي": "yang",
  "الذين": "orang-orang yang",
  "أولئك": "mereka itu",
  "هم": "mereka",
  "هو": "dia",
  "أحد": "seseorang / salah seorang",
  "أكثر": "kebanyakan / lebih banyak",
  "بعض": "sebahagian",

  // — Names of Allah / divine attributes —
  "الله": "Allah",
  "رب": "Tuhan / Pemelihara",
  "رحمن": "Maha Pemurah",
  "رحيم": "Maha Penyayang",
  "عليم": "Maha Mengetahui",
  "حكيم": "Maha Bijaksana",
  "عزيز": "Maha Perkasa",
  "غفور": "Maha Pengampun",
  "بصير": "Maha Melihat",
  "إله": "tuhan / sembahan",

  // — Common verbs —
  "كان": "adalah / telah menjadi",
  "قال": "berkata",
  "آمن": "beriman",
  "جعل": "menjadikan / meletakkan",
  "علم": "mengetahui",
  "كتب": "menulis / menetapkan",
  "خلق": "menciptakan",
  "أتى": "datang / membawa",
  "رأى": "melihat / berpendapat",
  "عمل": "beramal / melakukan",
  "ذكر": "mengingat / menyebut",
  "آتى": "memberi",
  "جاء": "datang",
  "شاء": "menghendaki / berkehendak",
  "كفر": "kufur / mengingkari",
  "أنزل": "menurunkan",
  "كذب": "mendustakan",
  "دعا": "menyeru / berdoa",
  "اتقى": "bertakwa",
  "أراد": "menghendaki / berkehendak",
  "اتبع": "mengikuti",
  "أرسل": "mengutus",
  "أخذ": "mengambil",
  "اتخذ": "mengambil / menjadikan",
  "ظلم": "menzalimi / berlaku zalim",
  "سأل": "bertanya / meminta",
  "وجد": "mendapati / menemui",
  "أخرج": "mengeluarkan",
  "أكل": "memakan",
  "فعل": "melakukan / berbuat",
  "نظر": "memandang / memerhati",
  "قتل": "membunuh",
  "خاف": "takut",
  "رجع": "kembali",
  "تولى": "berpaling",
  "سمع": "mendengar",
  "دخل": "memasuki",
  "جزى": "membalas",
  "أطاع": "mentaati",
  "أوحى": "mewahyukan",
  "أشرك": "mempersekutukan",
  "ألقى": "mencampakkan / melemparkan",
  "وعد": "menjanjikan",
  "أنفق": "membelanjakan",
  "غفر": "mengampuni",
  "أضل": "menyesatkan",
  "أصاب": "menimpa",
  "أحبب": "mencintai / menyayangi",
  "تاب": "bertaubat",
  "نزل": "menurunkan / turun",
  "كسب": "mengusahakan / berusaha",
  "تلى": "membaca / mengikuti",
  "نصر": "menolong",
  "قضى": "memutuskan / menetapkan",
  "صبر": "bersabar",
  "مس": "menyentuh / menimpa",
  "ضرب": "memukul / membuat perumpamaan",
  "أقام": "menegakkan / mendirikan",
  "قاتل": "berperang",
  "خرج": "keluar",
  "ضل": "sesat / tersesat",
  "بعث": "membangkitkan / mengutus",
  "أحيا": "menghidupkan",
  "أهلك": "membinasakan",
  "تذكر": "mengambil pelajaran / mengingat",
  "جرى": "mengalir",
  "نهى": "melarang",

  // — Common nouns —
  // (Some trilateral roots cover both a verb and a noun lemma. After diacritic
  // stripping the keys collide, so we merge meanings into one entry — e.g.
  // "رزق" covers both "to give provision" and "provision/rezeki".)
  "كل": "setiap / semua",
  "يوم": "hari",
  "ناس": "manusia",
  "رحمة": "rahmat",
  "نور": "cahaya",
  "قوم": "kaum / orang-orang",
  "أرض": "bumi",
  "سماء": "langit",
  "خير": "baik / lebih baik",
  "شر": "buruk / jahat",
  "نفس": "diri / jiwa",
  "آية": "ayat / tanda",
  "رسول": "rasul / utusan",
  "عذاب": "azab / siksa",
  "شيء": "sesuatu / perkara",
  "كتاب": "kitab",
  "حق": "kebenaran / hak",
  "مؤمن": "orang beriman",
  "سبيل": "jalan",
  "كافر": "orang kafir",
  "ذو": "yang mempunyai",
  "آخر": "yang lain / yang akhir",
  "آخرة": "akhirat",
  "جنة": "syurga / taman",
  "نار": "neraka / api",
  "موسى": "Musa",
  "قلب": "hati",
  "عبد": "hamba / menyembah",
  "لعل": "supaya / agar",
  "ظالم": "orang zalim",
  "أهل": "ahli / keluarga / penduduk",
  "يد": "tangan",
  "مبين": "yang nyata / yang terang",
  "دنيا": "dunia",
  "عظيم": "besar / agung",
  "أجر": "pahala / upah",
  "دين": "agama / pembalasan",
  "قول": "perkataan / ucapan",
  "شيطان": "syaitan",
  "مثل": "perumpamaan",
  "ملك": "malaikat / raja",
  "ولي": "pelindung / wali",
  "مال": "harta",
  "هدى": "petunjuk / memberi petunjuk",
  "فضل": "kurnia / kelebihan",
  "ليل": "malam",
  "صلاة": "solat / sembahyang",
  "أول": "yang pertama",
  "بني": "wahai anakku",
  "أصحاب": "ahli / penghuni",
  "جهنم": "neraka jahannam",
  "زوج": "pasangan / suami / isteri",
  "حياة": "kehidupan",
  "نبي": "nabi",
  "أخ": "saudara",
  "خالد": "kekal",
  "فرعون": "Firaun",
  "صالح": "soleh / yang baik",
  "عالم": "alam / sekalian alam",
  "أليم": "yang pedih",
  "وجه": "wajah / muka",
  "إنسان": "manusia / insan",
  "بينة": "bukti / keterangan nyata",
  "قليل": "sedikit",
  "قيامة": "kiamat",
  "قرءان": "Al-Quran",
  "إبراهيم": "Ibrahim",
  "بيت": "rumah",
  "يمين": "tangan kanan / sumpah",
  "أمة": "umat",
  "آباء": "bapa-bapa / nenek moyang",
  "ماء": "air",
  "كثير": "banyak",
  "ابن": "anak lelaki",
  "صالحة": "amal soleh",
  "صادق": "yang benar",
  "نساء": "wanita / isteri",
  "سيئة": "kejahatan / keburukan",
  "نذير": "pemberi peringatan",
  "قرية": "negeri / kampung",
  "عين": "mata / mata air",
  "نهار": "siang",
  "شهيد": "saksi / syahid",
  "ولد": "anak",
  "شديد": "yang kuat / yang dahsyat",
  "رزق": "rezeki / memberi rezeki",
  "نهر": "sungai",
  "جميع": "semua / kesemua",
  "أجل": "ajal / tempoh",
  "مجرم": "orang berdosa",
  "موت": "kematian",
  "عدو": "musuh",
  "نعمة": "nikmat",
  "أمر": "perintah / urusan / memerintah",
  "مَرْضِيَّة": "diredhai",

  // — Fatihah / very-common phrases (preserved from original) —
  "إياك": "hanya kepada-Mu",
  "نعبد": "kami sembah",
  "نستعين": "kami minta tolong",
  "اهدنا": "tunjukkanlah kami",
  "صراط": "jalan",
  "المستقيم": "yang lurus",
  "أنعمت": "Engkau telah nikmati",
  "مغضوب": "dimurkai",
  "ضالين": "sesat",
};

// Gloss-table construction and resolution live in ./lib/glosses.mjs so they can
// be unit-tested. The exact-match layer is what keeps lexical minimal pairs such
// as إِنَّ ("indeed") and إِنْ ("if") from collapsing into one bucket.
const MS_TABLES = buildGlossTables(RAW_MS_GLOSSES, "MS");

const RAW_EN_GLOSSES = {
  "من|P": "from / of",
  "من|N": "who / whoever",
  "اللَّه": "Allah",
  "ما": "what / that which / not",
  "فِي": "in / inside",
  "لا": "no / not",
  "إِنّ": "indeed / surely",
  "قالَ": "to say / said",
  "الَّذِي": "who / which / that",
  "عَلَى": "on / upon / against",
  "كانَ": "to be / was / were",
  "ل": "for / to",
  "ذا": "that / this",
  "رَبّ": "Lord / Master",
  "إِلَى": "to / towards",
  "إِن": "if",
  "إِلّا": "except / but",
  "أَن": "that",
  "آمَنَ": "to believe",
  "ب": "with / by / in",
  "و": "and",
  "ف": "so / then",
  "يَوْم": "day",
  "عَن": "from / about",
  "أَرْض": "earth / land",
  "إِذا": "when / if",
  "قَد": "already / surely",
  "قَوْم": "people / folk",
  "عَلِمَ": "to know",
  "آيَة": "sign / verse",
  "أَنّ": "that",
  "كُلّ": "all / every / each",
  "لَم": "not",
  "جَعَلَ": "to make / to set",
  "ثُمّ": "then",
  "رَسُول": "messenger",
  "عَذاب": "punishment / torment",
  "سَماء": "sky / heaven",
  "نَفْس": "self / soul",
  "كَفَرَ": "to disbelieve / to deny",

  // — Lemmas whose first Quranic occurrence is an inflected/contextual form, so
  //   the raw per-word gloss reads as a sentence fragment ("will be taken",
  //   "you took"). Curated dictionary forms here keep the vocabulary cards clean.
  //   Keyed with full diacritics so the exact-match layer hits the right lemma.
  "أَخَذَ|V": "to take / to seize",
  "اتَّخَذَ|V": "to take / to adopt",
  "يُؤاخِذُ|V": "to take to task / to hold accountable",
  "أَخْذ|N": "taking / seizure",
  "آخِذ|N": "one who takes",
  "مُتَّخِذ|N": "one who takes / adopts",
  "اتِّخاذ|N": "taking / adoption",
  "باطِن|N": "inner / hidden",
  "باطِنَة|N": "hidden / inner",
  "يُمَحِّصَ|V": "to purify / to test",
  "صَغَتْ|V": "to incline / to lean",
};

const EN_TABLES = buildGlossTables(RAW_EN_GLOSSES, "EN");

// Source for contextual per-word Indonesian translations (~95% intelligible
// to Malay speakers; identical for religious vocabulary). The data is keyed
// by surah → ayah → wordPosition, paralleling the alignment we already use
// for English glosses from Quran.com.
const ID_WBW_URL =
  "https://raw.githubusercontent.com/ekoheri/Al_Quran_Terjemahan_per_kata_per_ayat/master/backend/database/surah_per_kata";
const ID_CACHE_DIR = path.join(PROJECT_ROOT, ".cache", "id-wbw");

async function ensureIndonesianWbwCache() {
  await fs.mkdir(ID_CACHE_DIR, { recursive: true });
  let downloaded = 0;
  let cached = 0;
  for (let n = 1; n <= 114; n++) {
    const dest = path.join(ID_CACHE_DIR, `${n}.json`);
    try {
      await fs.access(dest);
      cached++;
      continue;
    } catch {
      // fall through to fetch
    }
    const res = await fetch(`${ID_WBW_URL}/${n}.json`);
    if (!res.ok) throw new Error(`ID WBW fetch failed for surah ${n}: HTTP ${res.status}`);
    const text = await res.text();
    await fs.writeFile(dest, text);
    downloaded++;
    if (downloaded % 20 === 0) process.stdout.write(`  ${downloaded} downloaded...\r`);
  }
  console.log(`  Indonesian WBW: ${downloaded} downloaded, ${cached} from cache`);
}

async function loadIndonesianWbwMap() {
  // Returns Map<"s:a:w", string> — Indonesian gloss per word location.
  const map = new Map();
  for (let n = 1; n <= 114; n++) {
    const raw = await fs.readFile(path.join(ID_CACHE_DIR, `${n}.json`), "utf-8");
    const data = JSON.parse(raw);
    const chapter = data[String(n)] || data[n];
    if (!chapter || !chapter.terjemah) continue;
    for (const ayahKey of Object.keys(chapter.terjemah)) {
      const words = chapter.terjemah[ayahKey];
      for (const wKey of Object.keys(words)) {
        const text = words[wKey];
        if (text && typeof text === "string") {
          map.set(`${n}:${ayahKey}:${wKey}`, text.trim());
        }
      }
    }
  }
  return map;
}

async function main() {
  console.log("→ ensuring Indonesian word-by-word cache...");
  await ensureIndonesianWbwCache();
  console.log("→ loading Indonesian WBW map...");
  const idMap = await loadIndonesianWbwMap();
  console.log(`  ${idMap.size} word-level Indonesian glosses indexed`);

  const files = (await fs.readdir(WORDS_DIR))
    .filter((f) => f.endsWith(".json"))
    .sort((a, b) => Number(a.replace(".json", "")) - Number(b.replace(".json", "")));

  const stats = new Map();
  let totalTokens = 0;
  let curatedHits = 0;
  let idFallbackHits = 0;

  for (const f of files) {
    const surah = Number(f.replace(".json", ""));
    const raw = await fs.readFile(path.join(WORDS_DIR, f), "utf-8");
    const data = JSON.parse(raw);
    for (const ayahKey of Object.keys(data)) {
      const ayah = Number(ayahKey);
      for (const w of data[ayahKey]) {
        totalTokens++;
        if (!w.lemma) continue;
        const key = w.lemma;
        const existing = stats.get(key);
        if (!existing) {
          // Three-tier Malay resolution, most accurate first:
          // 1. Hand-curated Malay dictionary (perfect Malay for top ~260 lemmas)
          // 2. Indonesian per-word translation aligned at the sample occurrence
          //    (contextual, fluent, ~95% intelligible to Malay readers)
          // 3. null → UI falls back to English with an "EN" badge
          const curated = resolveGloss(MS_TABLES, w);

          const idGloss = curated
            ? null
            : idMap.get(`${surah}:${ayah}:${w.i}`) || null;
          if (curated) curatedHits++;
          else if (idGloss) idFallbackHits++;

          stats.set(key, {
            lemma: w.lemma,
            root: w.root,
            pos: w.pos,
            count: 1,
            // Curated glosses are already clean lemma forms — use as-is. Only the
            // raw per-word fallback needs the leading-conjunction trim.
            en: resolveGloss(EN_TABLES, w) ?? cleanEnGloss(w.gloss),
            ms: curated || idGloss,
            msSource: curated ? "curated" : idGloss ? "id" : null,
            translit: w.translit,
            sampleSurah: surah,
            sampleAyah: ayah,
            sampleWord: w.i,
            sampleText: w.text,
          });
        } else {
          existing.count++;
        }
      }
    }
  }

  console.log(
    `  curated MS: ${curatedHits} lemmas · Indonesian fallback: ${idFallbackHits} lemmas`
  );

  const sorted = Array.from(stats.values()).sort((a, b) => b.count - a.count);
  const milestones = [50, 100, 200, 300, 500, 750, 1000, 1500, 2000];
  let running = 0;
  const milestonePoints = [];
  let nextIdx = 0;
  for (let i = 0; i < sorted.length; i++) {
    running += sorted[i].count;
    while (nextIdx < milestones.length && i + 1 === milestones[nextIdx]) {
      milestonePoints.push({
        topN: milestones[nextIdx],
        tokensCovered: running,
        pct: +((running / totalTokens) * 100).toFixed(2),
      });
      nextIdx++;
    }
  }

  await fs.writeFile(OUT_LEMMA, JSON.stringify(sorted));
  await fs.writeFile(OUT_COVERAGE, JSON.stringify({ totalTokens, lemmaCount: sorted.length, milestones: milestonePoints }));

  console.log(`✓ Processed ${sorted.length} lemmas with diacritic-agnostic Malay matching.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
