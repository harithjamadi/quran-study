export interface EditionOption {
  id: string;
  label: string;
  language: string;
  type: "translation" | "tafsir" | "transliteration" | "quran";
}

// Curated set of public-domain / freely-licensed editions exposed by
// the Al-Quran Cloud API (api.alquran.cloud).
export const TRANSLATIONS: EditionOption[] = [
  { id: "en.sahih", label: "Sahih International", language: "English", type: "translation" },
  { id: "en.pickthall", label: "Pickthall", language: "English", type: "translation" },
  { id: "en.yusufali", label: "Yusuf Ali", language: "English", type: "translation" },
  { id: "en.asad", label: "Muhammad Asad", language: "English", type: "translation" },
  { id: "en.arberry", label: "Arberry", language: "English", type: "translation" },
  { id: "ms.basmeih", label: "Abdullah Basmeih", language: "Malay", type: "translation" },
  { id: "id.indonesian", label: "Bahasa Indonesia", language: "Indonesian", type: "translation" },
  { id: "ur.jalandhry", label: "Jalandhry", language: "Urdu", type: "translation" },
  { id: "fr.hamidullah", label: "Hamidullah", language: "French", type: "translation" },
  { id: "tr.diyanet", label: "Diyanet İşleri", language: "Turkish", type: "translation" },
  { id: "de.aburida", label: "Abu Rida", language: "German", type: "translation" },
  { id: "es.cortes", label: "Cortes", language: "Spanish", type: "translation" },
];

export const TRANSLITERATION: EditionOption = {
  id: "en.transliteration",
  label: "Transliteration",
  language: "Latin",
  type: "transliteration",
};

export const TAFSIRS: EditionOption[] = [
  { id: "en.jalalayn", label: "Tafsir al-Jalalayn", language: "English", type: "tafsir" },
  { id: "ar.muyassar", label: "Tafsir Al-Muyassar", language: "Arabic", type: "tafsir" },
];

export interface Reciter {
  id: string;
  name: string;
  style?: string;
}

export const RECITERS: Reciter[] = [
  { id: "ar.alafasy", name: "Mishary Rashid Alafasy", style: "Murattal" },
  { id: "ar.husary", name: "Mahmoud Khalil Al-Husary", style: "Murattal" },
  { id: "ar.minshawi", name: "Muhammad Siddiq Al-Minshawi", style: "Murattal" },
  { id: "ar.abdulbasitmurattal", name: "Abdul Basit Abd us-Samad", style: "Murattal" },
  { id: "ar.abdurrahmaansudais", name: "Abdur-Rahman as-Sudais", style: "Murattal" },
  { id: "ar.muhammadayyoub", name: "Muhammad Ayyub", style: "Murattal" },
  { id: "ar.shaatree", name: "Abu Bakr Ash-Shaatree", style: "Murattal" },
  { id: "ar.hudhaify", name: "Ali Al-Hudhaifi", style: "Murattal" },
];

export const ARABIC_EDITION = "quran-uthmani";

export function getReciter(id: string): Reciter {
  return RECITERS.find((r) => r.id === id) ?? RECITERS[0];
}

export function getTranslation(id: string): EditionOption {
  return TRANSLATIONS.find((t) => t.id === id) ?? TRANSLATIONS[0];
}
