/**
 * Fuzzy romanization matching for surah search.
 *
 * Romanized (rumi) surah names are spelled inconsistently — "Yaseen" / "Yasin" /
 * "Yasiin", "Kawthar" / "Kauthar", "Nuh" / "Nooh". A naive substring match misses
 * these. We normalize both the query and the candidate to a canonical form that
 * folds the common variants, then substring-match on that.
 *
 * Folding rules (applied to lowercased, accent-stripped, letters-only text):
 *   - w → u   glide vs vowel   (kaWthar / kaUthar)
 *   - e → i   vowel variant    (yasEen / yasIn)
 *   - o → u   vowel variant    (nOOh / nUh) — mirrors Arabic's three vowels a/i/u
 *   - collapse runs of the same letter (yasEEn, yasiIn → single)
 */
export function normalizeSearch(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents (ā, ʿ → a, …)
    .replace(/[^a-z0-9]/g, "") // keep letters & digits only (drops spaces, -, ')
    .replace(/w/g, "u")
    .replace(/e/g, "i")
    .replace(/o/g, "u")
    .replace(/(.)\1+/g, "$1"); // collapse duplicate runs (do this AFTER folding)
}

interface SurahLike {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
}

/**
 * True when `query` matches the surah by number, Arabic name, English name, or
 * English meaning. Romanized fields are compared with {@link normalizeSearch}
 * so spelling variants still match; a bare number matches the surah number.
 */
export function surahMatches(surah: SurahLike, query: string): boolean {
  const raw = query.trim();
  if (!raw) return true;

  // Exact surah-number match (e.g. "36").
  if (/^\d+$/.test(raw) && String(surah.number) === raw) return true;

  // Arabic-script query: match the Arabic name directly.
  if (surah.name.includes(raw)) return true;

  const needle = normalizeSearch(raw);
  if (!needle) return false;

  return (
    normalizeSearch(surah.englishName).includes(needle) ||
    normalizeSearch(surah.englishNameTranslation).includes(needle) ||
    String(surah.number).includes(needle)
  );
}
