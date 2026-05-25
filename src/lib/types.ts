export type RevelationType = "Meccan" | "Medinan";

export interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: RevelationType;
}

export interface Ayah {
  number: number;
  numberInSurah: number;
  text: string;
  juz: number;
  page: number;
  hizbQuarter: number;
  sajda: boolean | { id: number; recommended: boolean; obligatory: boolean };
}

/** Specific response structure for /ayah/{ref}/editions/{ids} */
export interface AyahEdition extends Ayah {
  edition: EditionInfo;
  surah: SurahMeta;
}

export interface SurahEdition {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: RevelationType;
  numberOfAyahs: number;
  ayahs: Ayah[];
  edition: EditionInfo;
}

export interface EditionInfo {
  identifier: string;
  language: string;
  name: string;
  englishName: string;
  format: "text" | "audio";
  type: "translation" | "quran" | "tafsir" | "transliteration" | "versebyverse";
}

export interface SearchMatch {
  number: number;
  text: string;
  edition: EditionInfo;
  surah: SurahMeta;
  numberInSurah: number;
}

export interface SearchResult {
  count: number;
  matches: SearchMatch[];
}

export interface Bookmark {
  id: string;
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  ayahText: string;
  translation?: string;
  createdAt: number;
  note?: string;
}

export interface LastRead {
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  timestamp: number;
}

export type ThemeMode = "light" | "dark" | "system";
export type ArabicScript = "uthmani" | "indopak" | "simple";

/** Quran.com v4 Word structure */
export interface QuranComWord {
  id: number;
  position: number;
  audio_url: string | null;
  char_type_name: string;
  text_uthmani: string;
  transliteration: { text: string | null };
  translation: { text: string | null };
}

/** Quran.com v4 Verse structure */
export interface QuranComVerse {
  id: number;
  verse_number: number;
  verse_key: string;
  text_uthmani: string;
  words: QuranComWord[];
}

export interface QuranComVerseResponse {
  verse: QuranComVerse;
}
