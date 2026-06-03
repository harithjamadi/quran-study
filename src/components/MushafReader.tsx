"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SURAHS, getSurah } from "@/data/surahs";
import { getAyahWithEditions } from "@/lib/api";
import { ARABIC_EDITION, getTranslation } from "@/lib/editions";
import { toArabicDigits } from "@/lib/format";
import { useSettings } from "@/store/settings";
import { useLearning } from "@/store/learning";
import { useHydrated } from "@/lib/use-hydrated";
import {
  clampPage,
  loadMushafIndex,
  loadMushafPage,
  prefetchPage,
  TOTAL_PAGES,
  type MushafIndex,
  type MushafPage,
} from "@/lib/mushaf";
import { MushafPageView, type MushafMode } from "@/components/MushafPageView";

const LAST_PAGE_KEY = "mushaf.lastPage.v1";

const MODE_LABELS: Record<MushafMode, { en: string; ms: string }> = {
  madani: { en: "Madani", ms: "Madani" },
  uthmani: { en: "Uthmani", ms: "Uthmani" },
  tajweed: { en: "Tajweed", ms: "Tajwid" },
};

interface Props {
  initialPage: number;
}

export function MushafReader({ initialPage }: Props) {
  const hydrated = useHydrated();
  const language = useLearning((s) => s.language);
  const t = useMemo(() => makeStrings(language), [language]);

  const [page, setPage] = useState(() => clampPage(initialPage));
  const [mode, setMode] = useState<MushafMode>("madani");
  const [pages, setPages] = useState<Map<number, MushafPage>>(new Map());
  const [navOpen, setNavOpen] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<string | null>(null);

  // ── Load current page + prefetch neighbours ──
  useEffect(() => {
    let active = true;
    loadMushafPage(page).then((p) => {
      if (active && p) setPages((prev) => (prev.has(page) ? prev : new Map(prev).set(page, p)));
    });
    if (page > 1) prefetchPage(page - 1);
    if (page < TOTAL_PAGES) prefetchPage(page + 1);
    // also fold prefetched neighbours into state so swipe shows them instantly
    for (const n of [page - 1, page + 1]) {
      if (n >= 1 && n <= TOTAL_PAGES) {
        loadMushafPage(n).then((p) => {
          if (active && p) setPages((prev) => (prev.has(n) ? prev : new Map(prev).set(n, p)));
        });
      }
    }
    return () => {
      active = false;
    };
  }, [page]);

  // ── Persist + reflect in the URL without a server round-trip ──
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LAST_PAGE_KEY, String(page));
    } catch {
      /* ignore */
    }
    window.history.replaceState(window.history.state, "", `/mushaf/${page}`);
  }, [hydrated, page]);

  const go = useCallback((next: number) => {
    setSelectedVerse(null);
    setPage(clampPage(next));
  }, []);

  // In the mushaf the page numbers increase to the LEFT (it is bound on the
  // right and read right-to-left), so a real page-turn is: drag the sheet to the
  // RIGHT to bring the next (higher) page in from the left. That is the gesture
  // a physical Quran uses — the opposite of a left-to-right book.
  const next = useCallback(() => go(page + 1), [go, page]);
  const prev = useCallback(() => go(page - 1), [go, page]);

  // ── Keyboard ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (navOpen || selectedVerse) return;
      if (e.key === "ArrowLeft") next();
      else if (e.key === "ArrowRight") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, navOpen, selectedVerse]);

  // ── Drag / swipe pager ──
  const dragRef = useRef<{ x: number; y: number; dx: number; active: boolean; moved: boolean } | null>(
    null
  );
  const [dragX, setDragX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (navOpen || selectedVerse) return;
    dragRef.current = { x: e.clientX, y: e.clientY, dx: 0, active: true, moved: false };
    setAnimating(false);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d?.active) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    // Vertical scroll wins if the gesture is clearly vertical.
    if (!d.moved && Math.abs(dy) > Math.abs(dx)) {
      d.active = false;
      return;
    }
    d.moved = true;
    d.dx = dx;
    setDragX(dx);
  };
  const endDrag = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    const width = viewportRef.current?.clientWidth ?? window.innerWidth;
    const threshold = Math.min(120, width * 0.22);
    setAnimating(true);
    setDragX(0);
    // Dragging RIGHT (dx > 0) reveals the page to the right = the PREVIOUS
    // (lower) page; dragging LEFT advances. This matches a right-bound mushaf.
    if (d.dx > threshold && page > 1) requestAnimationFrame(prev);
    else if (d.dx < -threshold && page < TOTAL_PAGES) requestAnimationFrame(next);
  };

  const cur = pages.get(page) ?? null;
  const prevPage = pages.get(page - 1) ?? null;
  const nextPage = pages.get(page + 1) ?? null;

  const curSurahs = cur?.surahs ?? [];
  const surahLabel =
    curSurahs.length > 0
      ? curSurahs.map((s) => getSurah(s)?.englishName).filter(Boolean).join(" · ")
      : "";

  return (
    <div className="mushaf-reader" dir="ltr">
      {/* ── Page surface ── */}
      <div
        ref={viewportRef}
        className="mushaf-viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => {
          if (dragRef.current?.active) endDrag();
        }}
      >
        {/* prev page sits to the RIGHT (+100%), next to the LEFT (-100%) */}
        <div
          className="mushaf-slide"
          style={{
            transform: `translateX(calc(100% + ${dragX}px))`,
            transition: animating ? "transform 240ms ease" : "none",
          }}
          aria-hidden
        >
          {prevPage && <MushafPageView key={`p${prevPage.p}-${mode}`} page={prevPage} mode={mode} />}
        </div>
        <div
          className="mushaf-slide"
          style={{
            transform: `translateX(${dragX}px)`,
            transition: animating ? "transform 240ms ease" : "none",
          }}
        >
          {cur ? (
            <MushafPageView
              key={`c${cur.p}-${mode}`}
              page={cur}
              mode={mode}
              onSelectVerse={setSelectedVerse}
              activeVerse={selectedVerse}
            />
          ) : (
            <div className="mushaf-loading">
              <span className="inline-block h-7 w-7 animate-spin rounded-full border-4 border-[color:var(--accent)] border-r-transparent" />
            </div>
          )}
        </div>
        <div
          className="mushaf-slide"
          style={{
            transform: `translateX(calc(-100% + ${dragX}px))`,
            transition: animating ? "transform 240ms ease" : "none",
          }}
          aria-hidden
        >
          {nextPage && <MushafPageView key={`n${nextPage.p}-${mode}`} page={nextPage} mode={mode} />}
        </div>

        {/* Edge tap arrows — next is on the LEFT (RTL paging) */}
        <button
          className="mushaf-edge mushaf-edge-left"
          onClick={next}
          disabled={page >= TOTAL_PAGES}
          aria-label={t.next}
        >
          ‹
        </button>
        <button
          className="mushaf-edge mushaf-edge-right"
          onClick={prev}
          disabled={page <= 1}
          aria-label={t.prev}
        >
          ›
        </button>
      </div>

      {/* ── Bottom toolbar ── */}
      <div className="mushaf-toolbar">
        <button className="mushaf-tool" onClick={() => setNavOpen(true)}>
          <IconList />
          <span>{t.go}</span>
        </button>

        <button
          className="mushaf-pagepill"
          onClick={() => setNavOpen(true)}
          aria-label={t.go}
        >
          <span className="mushaf-pagepill-main">
            {t.page} {toArabicDigits(page)}
          </span>
          <span className="mushaf-pagepill-sub">
            {t.juz} {cur?.juz ?? "—"}
            {surahLabel ? ` · ${surahLabel}` : ""}
          </span>
        </button>

        <div className="mushaf-modes" role="group" aria-label={t.mode}>
          {(["madani", "uthmani", "tajweed"] as MushafMode[]).map((m) => (
            <button
              key={m}
              className={"mushaf-mode" + (mode === m ? " is-active" : "")}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
            >
              {MODE_LABEL(m, language)}
            </button>
          ))}
        </div>
      </div>

      {navOpen && (
        <MushafNav
          page={page}
          strings={t}
          onClose={() => setNavOpen(false)}
          onGo={(p) => {
            setNavOpen(false);
            go(p);
          }}
        />
      )}

      {selectedVerse && (
        <VerseSheet
          key={selectedVerse}
          verseKey={selectedVerse}
          strings={t}
          onClose={() => setSelectedVerse(null)}
        />
      )}
    </div>
  );
}

function MODE_LABEL(m: MushafMode, lang: "en" | "ms") {
  return MODE_LABELS[m][lang];
}

/* ── Navigation sheet: page / surah / juz ─────────────────────────────────── */

type Strings = ReturnType<typeof makeStrings>;

function MushafNav({
  page,
  strings,
  onClose,
  onGo,
}: {
  page: number;
  strings: Strings;
  onClose: () => void;
  onGo: (page: number) => void;
}) {
  const [tab, setTab] = useState<"surah" | "juz" | "page">("surah");
  const [pageInput, setPageInput] = useState(String(page));
  const [index, setIndex] = useState<MushafIndex | null>(null);

  useEffect(() => {
    loadMushafIndex().then(setIndex);
  }, []);

  // Prefer the built index (verified against real data); fall back to the static
  // tables so the navigator is usable instantly / offline before it loads.
  const surahStart = useCallback(
    (surah: number) => index?.surahStartPage?.[surah] ?? surahStartPageSync(surah),
    [index]
  );
  const juzStart = useMemo(() => {
    if (!index) return JUZ_START_PAGE;
    const out = [...JUZ_START_PAGE];
    for (let j = 1; j <= 30; j++) {
      const pg = index.pages.find((p) => p.juz === j);
      if (pg) out[j - 1] = pg.p;
    }
    return out;
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="mushaf-sheet-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="mushaf-sheet" onClick={(e) => e.stopPropagation()}>
        <div aria-hidden className="mushaf-sheet-grip" />
        <div className="mushaf-tabs">
          {(["surah", "juz", "page"] as const).map((tb) => (
            <button
              key={tb}
              className={"mushaf-tab" + (tab === tb ? " is-active" : "")}
              onClick={() => setTab(tb)}
            >
              {strings[tb]}
            </button>
          ))}
        </div>

        <div className="mushaf-sheet-body">
          {tab === "surah" && (
            <ul className="mushaf-jumplist">
              {SURAHS.map((s) => (
                <li key={s.number}>
                  <button onClick={() => onGo(surahStart(s.number))}>
                    <span className="mushaf-jump-num">{s.number}</span>
                    <span className="mushaf-jump-main">{s.englishName}</span>
                    <span className="arabic mushaf-jump-ar">{s.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {tab === "juz" && (
            <div className="mushaf-juzgrid">
              {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                <button key={j} onClick={() => onGo(juzStart[j - 1])}>
                  {strings.juz} {j}
                </button>
              ))}
            </div>
          )}

          {tab === "page" && (
            <form
              className="mushaf-pageform"
              onSubmit={(e) => {
                e.preventDefault();
                const n = Number(pageInput);
                if (n >= 1 && n <= TOTAL_PAGES) onGo(n);
              }}
            >
              <label htmlFor="mushaf-page-input">
                {strings.page} (1–{TOTAL_PAGES})
              </label>
              <div className="mushaf-pageform-row">
                <input
                  id="mushaf-page-input"
                  type="number"
                  min={1}
                  max={TOTAL_PAGES}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  autoFocus
                />
                <button type="submit">{strings.go}</button>
              </div>
              <input
                type="range"
                min={1}
                max={TOTAL_PAGES}
                value={Number(pageInput) || 1}
                onChange={(e) => setPageInput(e.target.value)}
                className="mushaf-pageslider"
              />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Verse translation sheet ──────────────────────────────────────────────── */

function VerseSheet({
  verseKey,
  strings,
  onClose,
}: {
  verseKey: string;
  strings: Strings;
  onClose: () => void;
}) {
  const language = useLearning((s) => s.language);
  const translationId = useSettings((s) => s.translationId) || (language === "ms" ? "ms.basmeih" : "en.sahih");
  const [data, setData] = useState<{ arabic: string; translation: string } | null>(null);
  const [error, setError] = useState(false);
  const [surahN, ayahN] = verseKey.split(":").map(Number);
  const meta = getSurah(surahN);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    getAyahWithEditions(verseKey, [ARABIC_EDITION, translationId])
      .then((eds) => {
        if (!active) return;
        const ar = eds.find((e) => e.edition?.identifier === ARABIC_EDITION);
        const tr = eds.find((e) => e.edition?.identifier === translationId);
        setData({ arabic: ar?.text ?? "", translation: tr?.text ?? "" });
      })
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [verseKey, translationId]);

  return (
    <div className="mushaf-sheet-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="mushaf-sheet mushaf-versesheet" onClick={(e) => e.stopPropagation()}>
        <div aria-hidden className="mushaf-sheet-grip" />
        <div className="mushaf-verse-head">
          <span>
            {meta?.englishName ?? `Surah ${surahN}`} · {strings.ayah} {ayahN}
          </span>
          <Link href={`/surah/${surahN}#${ayahN}`} className="mushaf-verse-open">
            {strings.openSurah} ›
          </Link>
        </div>
        <div className="mushaf-verse-body">
          {error ? (
            <p className="text-sm text-[color:var(--muted)]">{strings.loadError}</p>
          ) : !data ? (
            <div className="py-6 text-center">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-[color:var(--accent)] border-r-transparent" />
            </div>
          ) : (
            <>
              <p className="arabic mushaf-verse-ar" dir="rtl">
                {data.arabic}
              </p>
              <p className="mushaf-verse-tr">{data.translation}</p>
              <p className="mushaf-verse-edition">
                {getTranslation(translationId).label}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Icons + strings ──────────────────────────────────────────────────────── */

function IconList() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function makeStrings(lang: "en" | "ms") {
  const en = {
    page: "Page",
    juz: "Juz",
    ayah: "Ayah",
    go: "Go to",
    mode: "Script",
    next: "Next page",
    prev: "Previous page",
    surah: "Surah",
    openSurah: "Open in reader",
    loadError: "Couldn’t load this verse. Check your connection.",
  };
  const ms = {
    page: "Halaman",
    juz: "Juzuk",
    ayah: "Ayat",
    go: "Pergi ke",
    mode: "Skrip",
    next: "Halaman seterusnya",
    prev: "Halaman sebelumnya",
    surah: "Surah",
    openSurah: "Buka dalam pembaca",
    loadError: "Tidak dapat memuatkan ayat ini. Semak sambungan anda.",
  };
  return lang === "ms" ? ms : en;
}

// Juz → starting Madani page (standard 15-line mushaf). Verified against the
// built page index (scripts/build-mushaf.mjs), not typed from memory.
const JUZ_START_PAGE = [
  1, 22, 42, 63, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262, 282, 302, 322,
  342, 362, 382, 402, 422, 442, 462, 482, 503, 522, 542, 562, 582,
];

// Surah → starting Madani page (standard 15-line mushaf). Static lookup so the
// navigator is instant and works before the page index has loaded.
const SURAH_START_PAGE: Record<number, number> = {
  1: 1, 2: 2, 3: 50, 4: 77, 5: 106, 6: 128, 7: 151, 8: 177, 9: 187, 10: 208,
  11: 221, 12: 235, 13: 249, 14: 255, 15: 262, 16: 267, 17: 282, 18: 293,
  19: 305, 20: 312, 21: 322, 22: 332, 23: 342, 24: 350, 25: 359, 26: 367,
  27: 377, 28: 385, 29: 396, 30: 404, 31: 411, 32: 415, 33: 418, 34: 428,
  35: 434, 36: 440, 37: 446, 38: 453, 39: 458, 40: 467, 41: 477, 42: 483,
  43: 489, 44: 496, 45: 499, 46: 502, 47: 507, 48: 511, 49: 515, 50: 518,
  51: 520, 52: 523, 53: 526, 54: 528, 55: 531, 56: 534, 57: 537, 58: 542,
  59: 545, 60: 549, 61: 551, 62: 553, 63: 554, 64: 556, 65: 558, 66: 560,
  67: 562, 68: 564, 69: 566, 70: 568, 71: 570, 72: 572, 73: 574, 74: 575,
  75: 577, 76: 578, 77: 580, 78: 582, 79: 583, 80: 585, 81: 586, 82: 587,
  83: 587, 84: 589, 85: 590, 86: 591, 87: 591, 88: 592, 89: 593, 90: 594,
  91: 595, 92: 595, 93: 596, 94: 596, 95: 597, 96: 597, 97: 598, 98: 598,
  99: 599, 100: 599, 101: 600, 102: 600, 103: 601, 104: 601, 105: 601,
  106: 602, 107: 602, 108: 602, 109: 603, 110: 603, 111: 603, 112: 604,
  113: 604, 114: 604,
};

function surahStartPageSync(surah: number): number {
  return SURAH_START_PAGE[surah] ?? 1;
}
