# Changelog

All notable changes to Mubin are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and this project adheres to
[Semantic Versioning](https://semver.org/).

The user-facing version of this list lives in `src/lib/changelog.ts` and is
shown in-app at `/changelog` (linked from the footer and the mobile "More"
menu). Keep the two in sync when cutting a release.

## [0.8.5] — 2026-06-01

### Changed
- Tajweed examples now show the **whole verse with the relevant word(s)
  coloured** (instead of the word alone), so the rule is seen in context.
- The example audio plays the **whole verse** with an **interactive scrubber** —
  a draggable progress bar plus a current-time / duration readout, so you can
  seek forward and back while listening.

## [0.8.4] — 2026-06-01

### Changed
- The example audio now plays **just the highlighted word or phrase** instead of
  the whole verse. Each example is clipped to its exact word range using
  Quran.com's per-word timings for Shaikh Mishary Alafasy, so you hear precisely
  the part the rule applies to (the clip keeps the words connected, so cross-word
  rules like idgham/iqlab/ikhfa stay audible).

## [0.8.3] — 2026-06-01

### Added
- Tajweed example cards now have a **Hear the verse** button that plays the
  recitation of the verse the example is drawn from, so you can hear the rule
  in context.
- Each rule now carries **multiple examples** — tap **Another example** to cycle
  through them.

### Changed
- Example explanations are now bilingual and follow the selected language
  (English / Malay) instead of always showing English.

## [0.8.2] — 2026-06-01

### Added
- Every tajweed rule in the guide now shows a worked example from the Quran
  (e.g. مِن رَّبِّهِمْ → "mir-rabbihim").

### Changed
- Clearer Malay wording for the silent **Alif al-Fāriqah** ("tidak dibunyikan
  langsung" instead of "senyap total").

## [0.8.1] — 2026-06-01

### Fixed
- The silent-letter rule is now explained as **Alif al-Fāriqah** — the alif
  after a plural waw (e.g. كَفَرُوا۟, read "kafaruu"), marked with the round
  zero (sifir mustadir).
- Waqf stop-signs now use their proper names: **Al-Waqf al-Awla**,
  **Al-Wasl al-Awla**, and **Lā Taqif**.

## [0.8.0] — 2026-06-01

### Added
- In-app **What's New** page (`/changelog`) with version history and an
  unseen-update indicator.
- The **Iqlab** tajweed rule, which was previously left uncoloured.

### Fixed
- Corrected tajweed rule labels to match the authoritative alquran.cloud /
  cpfair legend — silent letters (`s`), Madd ʿĀriḍ lil-Sukūn (`p`), and the
  Muttasil/Munfasil madd (`o`) are now named correctly. (Pending scholar review.)
- Resolved a React rules-of-hooks bug in the word detail panel and cleared all
  outstanding linter errors.

## [0.7.0] — 2026-05-31

### Added
- Mobile bottom-navigation bar and redesigned header.
- First-run guided tutorial overlay explaining each part of the app.
- Tajweed Quest — interactive tajweed-rule lessons (early preview).

### Changed
- Word taps are much faster: removed a 1.1 MB client download and now prefetch
  surah verses on the server.

## [0.6.0] — 2026-05-26

### Added
- First-launch language picker (English / Bahasa Melayu).
- Malay surah translations across the app.

### Changed
- Surah Quest difficulty tiers and audio playback improvements.

## [0.5.0] — 2026-05-26

### Added
- Root pages showing every unique surface form of a root across the Quran.
- Mubin brand icon across all icon surfaces (favicon, PWA install icon).

### Changed
- Enriched Malay word glosses and improved translation accuracy.

## [0.4.0] — 2026-05-26

### Added
- Interactive tajweed colours in the reader.
- Tajweed rule guide and a full waqf (stop-sign) symbol reference.

### Changed
- Switched to the Amiri Quran font so Mushaf marks render correctly.

## [0.3.0] — 2026-05-25

### Added
- Mastery heatmap and tadabbur (reflection) notes in analytics.
- Progressive Web App support — installable, with offline reading.

## [0.2.0] — 2026-05-25

### Added
- Surah Quest — learn a surah's vocabulary, unlocked by mastering the previous one.
- New game types: build-the-translation and match-the-pairs.

### Changed
- Clear, unmissable correct/wrong feedback bar in flashcards.

## [0.1.0] — 2026-05-24

### Added
- Initial Mubin release: word-by-word Quran study with spaced repetition (FSRS).
- Read any surah with tap-to-study on every Arabic word (meaning, root, occurrences).
- Modern Mushaf reading aesthetic.
