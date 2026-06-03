"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SURAHS, getSurah, globalAyahNumber } from "@/data/surahs";
import { getAyahWithEditions } from "@/lib/api";
import { ARABIC_EDITION, getTranslation, RECITERS } from "@/lib/editions";
import { toArabicDigits } from "@/lib/format";
import { useSettings } from "@/store/settings";
import { useLearning } from "@/store/learning";
import { useBookmarks } from "@/store/bookmarks";
import { useAudio } from "@/components/AudioProvider";
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
  const router = useRouter();
  const hydrated = useHydrated();
  const language = useLearning((s) => s.language);
  const t = useMemo(() => makeStrings(language), [language]);

  const mushafScale = useSettings((s) => s.mushafScale);
  const mushafLineSpacing = useSettings((s) => s.mushafLineSpacing);

  const [page, setPage] = useState(() => clampPage(initialPage));
  // The edition lives in the persisted store so the reader always reopens the
  // Mushaf the user last chose (Phase 1: "Choose Mushaf").
  const mode = useSettings((s) => s.mushafEdition) as MushafMode;
  const setMode = useSettings((s) => s.setMushafEdition);
  const [pages, setPages] = useState<Map<number, MushafPage>>(new Map());
  const [navOpen, setNavOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chooseOpen, setChooseOpen] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<string | null>(null);
  // HUD starts visible so the controls are discoverable, then a single tap on
  // the page toggles total immersion (edge-to-edge, no chrome).
  const [hudVisible, setHudVisible] = useState(true);

  // The reader is a full-screen overlay above the app chrome — lock the body so
  // nothing scrolls behind it, and flag immersion for any chrome that reacts.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("mushaf-immersive");
    return () => {
      document.body.style.overflow = prevOverflow;
      document.documentElement.classList.remove("mushaf-immersive");
    };
  }, []);

  // "Back" leaves the reader. Prefer the real history entry the user came from;
  // fall back to the surah index for deep links / fresh tabs.
  const goBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 2) router.back();
    else router.push("/surahs");
  }, [router]);

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

  // ── Drag / swipe pager ──
  const dragRef = useRef<{ x: number; y: number; dx: number; active: boolean; moved: boolean } | null>(
    null
  );
  const committingRef = useRef(false);
  const [dragX, setDragX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Commit a page turn with a follow-through slide: the current page travels all
  // the way off in the swipe direction and the incoming page rides into centre,
  // THEN we swap the page state with the transform reset (invisible, since the
  // new current sits exactly where the incoming page already was). dir = +1 means
  // advance (swipe left → next), dir = -1 means go back (swipe right → previous).
  const commit = useCallback(
    (dir: 1 | -1) => {
      const target = dir === 1 ? page + 1 : page - 1;
      if (target < 1 || target > TOTAL_PAGES) {
        setAnimating(true);
        setDragX(0);
        return;
      }
      const width = viewportRef.current?.clientWidth ?? window.innerWidth;
      committingRef.current = true;
      setAnimating(true);
      // Swiping RIGHT (next, dir=1) moves the page to the right (+width)
      // Swiping LEFT (prev, dir=-1) moves the page to the left (-width)
      setDragX(dir === 1 ? width : -width);
      window.setTimeout(() => {
        setAnimating(false);
        setDragX(0);
        go(target);
        committingRef.current = false;
      }, 260);
    },
    [go, page]
  );

  // ── Keyboard: → next, ← previous (matches the swipe mapping) ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (navOpen || selectedVerse) return;
      if (e.key === "ArrowRight") commit(1);
      else if (e.key === "ArrowLeft") commit(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit, navOpen, selectedVerse]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (navOpen || selectedVerse || committingRef.current) return;
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
  const settleDrag = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    const width = viewportRef.current?.clientWidth ?? window.innerWidth;
    const threshold = Math.min(120, width * 0.22);
    // Swipe RIGHT past the threshold advances (next); swipe LEFT goes back (prev).
    if (d.dx > threshold) commit(1);
    else if (d.dx < -threshold) commit(-1);
    else {
      // Not far enough — rubber-band back to centre.
      setAnimating(true);
      setDragX(0);
    }
  };

  // A clean tap (no drag) on the page background toggles the HUD. Taps that land
  // on a word, a control, or the open sheets are left alone so they keep working.
  const onPointerUp = (e: React.PointerEvent) => {
    const wasTap = !!dragRef.current && !dragRef.current.moved;
    settleDrag();
    if (!wasTap) return;
    const el = e.target as HTMLElement | null;
    if (el && el.closest(".mushaf-word, button, a, input, select")) return;
    setHudVisible((v) => !v);
  };

  const cur = pages.get(page) ?? null;
  const prevPage = pages.get(page - 1) ?? null;
  const nextPage = pages.get(page + 1) ?? null;

  const curSurahs = cur?.surahs ?? [];
  const surahLabel =
    curSurahs.length > 0
      ? curSurahs.map((s) => getSurah(s)?.englishName).filter(Boolean).join(" · ")
      : "";
  const headerSurah = getSurah(curSurahs[0] ?? 0);

  return (
    <div className="mushaf-reader" dir="ltr" data-hud={hudVisible ? "true" : "false"}>
      {/* ── Top HUD: back · surah context · settings (fades on tap) ── */}
      <div className="mushaf-hud mushaf-hud-top">
        <button className="mushaf-header-btn" onClick={goBack} aria-label={t.back}>
          <IconBack />
        </button>
        <button className="mushaf-header-title" onClick={() => setNavOpen(true)}>
          {headerSurah ? (
            <>
              <span className="mushaf-header-name">
                <span className="arabic">{headerSurah.name}</span>
                <span className="mushaf-header-en">{headerSurah.englishName}</span>
              </span>
              <span className="mushaf-header-sub">
                {t.juz} {cur?.juz ?? "—"} · {t.page} {toArabicDigits(page)}
              </span>
            </>
          ) : (
            <span className="mushaf-header-sub">
              {t.page} {toArabicDigits(page)}
            </span>
          )}
        </button>
        <button
          className="mushaf-header-btn"
          onClick={() => setSettingsOpen(true)}
          aria-label={t.settings}
        >
          <IconGear />
        </button>
      </div>

      {/* ── Page surface ── */}
      <div
        ref={viewportRef}
        className="mushaf-viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={settleDrag}
        onPointerLeave={() => {
          if (dragRef.current?.active) settleDrag();
        }}
      >
        {/* Standard pager: the NEXT page waits off-screen to the LEFT (-100%)
            so dragging RIGHT brings it in; the PREVIOUS page waits to the RIGHT. */}
        <div
          className="mushaf-slide"
          style={{
            transform: `translateX(calc(-100% + ${dragX}px))`,
            transition: animating ? "transform 240ms ease" : "none",
          }}
          aria-hidden
        >
          {nextPage && <MushafPageView key={`n${nextPage.p}-${mode}`} page={nextPage} mode={mode} scale={mushafScale} lineSpacing={mushafLineSpacing} />}
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
              scale={mushafScale}
              lineSpacing={mushafLineSpacing}
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
            transform: `translateX(calc(100% + ${dragX}px))`,
            transition: animating ? "transform 240ms ease" : "none",
          }}
          aria-hidden
        >
          {prevPage && <MushafPageView key={`p${prevPage.p}-${mode}`} page={prevPage} mode={mode} scale={mushafScale} lineSpacing={mushafLineSpacing} />}
        </div>

        {/* Edge tap arrows — left goes back, right goes forward (next). */}
        <button
          className="mushaf-edge mushaf-edge-left"
          onClick={() => commit(-1)}
          disabled={page <= 1}
          aria-label={t.prev}
        >
          ‹
        </button>
        <button
          className="mushaf-edge mushaf-edge-right"
          onClick={() => commit(1)}
          disabled={page >= TOTAL_PAGES}
          aria-label={t.next}
        >
          ›
        </button>
      </div>

      {/* ── Bottom HUD: page context + script modes (fades on tap) ── */}
      <div className="mushaf-hud mushaf-hud-bottom">
        <div className="mushaf-toolbar">
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

          <button
            className="mushaf-edition-pill"
            onClick={() => setChooseOpen(true)}
            aria-label={t.chooseMushaf}
          >
            <span className="mushaf-edition-pill-name">{MODE_LABEL(mode, language)}</span>
            <IconChevronDown />
          </button>
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

      {chooseOpen && (
        <ChooseMushaf
          active={mode}
          language={language}
          strings={t}
          onClose={() => setChooseOpen(false)}
          onChoose={(m) => {
            setMode(m);
            setChooseOpen(false);
          }}
        />
      )}

      {settingsOpen && <MushafSettings strings={t} onClose={() => setSettingsOpen(false)} />}

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
  const [copied, setCopied] = useState(false);
  const [surahN, ayahN] = verseKey.split(":").map(Number);
  const meta = getSurah(surahN);

  const { playAyah } = useAudio();
  const toggleBookmark = useBookmarks((s) => s.toggle);
  const isBookmarked = useBookmarks((s) => s.has(surahN, ayahN));

  const onPlay = () => {
    playAyah({
      surahNumber: surahN,
      ayahNumber: ayahN,
      globalAyahNumber: globalAyahNumber(surahN, ayahN),
      surahName: meta?.englishName ?? `Surah ${surahN}`,
    });
    onClose();
  };
  const onBookmark = () => {
    if (!data) return;
    toggleBookmark({
      surahNumber: surahN,
      ayahNumber: ayahN,
      surahName: meta?.englishName ?? `Surah ${surahN}`,
      ayahText: data.arabic,
      translation: data.translation,
    });
  };
  const onCopy = async () => {
    if (!data) return;
    const text = `${data.arabic}\n\n${data.translation}\n— ${meta?.englishName ?? ""} ${surahN}:${ayahN}`;
    try {
      await navigator.clipboard.writeText(text.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  const onShare = async () => {
    const url = `${location.origin}/surah/${surahN}#${ayahN}`;
    const shareData = {
      title: `${meta?.englishName ?? "Quran"} ${surahN}:${ayahN}`,
      text: data ? `${data.arabic}\n${data.translation}` : undefined,
      url,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      /* user cancelled / unsupported */
    }
  };

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
        <div className="mushaf-actions" role="group" aria-label={strings.actions}>
          <button className="mushaf-action" onClick={onPlay}>
            <IconPlay />
            <span>{strings.play}</span>
          </button>
          <button
            className={"mushaf-action" + (isBookmarked ? " is-on" : "")}
            onClick={onBookmark}
            disabled={!data}
            aria-pressed={isBookmarked}
          >
            <IconBookmark filled={isBookmarked} />
            <span>{strings.bookmark}</span>
          </button>
          <button className="mushaf-action" onClick={onCopy} disabled={!data}>
            <IconCopy />
            <span>{copied ? strings.copied : strings.copy}</span>
          </button>
          <button className="mushaf-action" onClick={onShare}>
            <IconShare />
            <span>{strings.share}</span>
          </button>
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

/* ── Reading settings sheet ───────────────────────────────────────────────── */

function MushafSettings({ strings, onClose }: { strings: Strings; onClose: () => void }) {
  const mushafScale = useSettings((s) => s.mushafScale);
  const setMushafScale = useSettings((s) => s.setMushafScale);
  const mushafLineSpacing = useSettings((s) => s.mushafLineSpacing);
  const setMushafLineSpacing = useSettings((s) => s.setMushafLineSpacing);
  const reciterId = useSettings((s) => s.reciterId);
  const setReciter = useSettings((s) => s.setReciter);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="mushaf-sheet-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="mushaf-sheet" onClick={(e) => e.stopPropagation()}>
        <div aria-hidden className="mushaf-sheet-grip" />
        <div className="mushaf-settings">
          <div className="mushaf-set-row">
            <div className="mushaf-set-label">
              <span>{strings.textSize}</span>
              <span className="mushaf-set-value">{Math.round(mushafScale * 100)}%</span>
            </div>
            <div className="mushaf-set-size">
              <button
                className="mushaf-size-btn"
                aria-label="A-"
                onClick={() => setMushafScale(Math.round((mushafScale - 0.1) * 10) / 10)}
              >
                A−
              </button>
              <input
                type="range"
                min={0.8}
                max={1.8}
                step={0.1}
                value={mushafScale}
                onChange={(e) => setMushafScale(Number(e.target.value))}
                className="mushaf-pageslider"
                aria-label={strings.textSize}
              />
              <button
                className="mushaf-size-btn"
                aria-label="A+"
                onClick={() => setMushafScale(Math.round((mushafScale + 0.1) * 10) / 10)}
              >
                A+
              </button>
            </div>
          </div>

          <div className="mushaf-set-row">
            <div className="mushaf-set-label">
              <span>{strings.lineSpacing}</span>
              <span className="mushaf-set-value">{mushafLineSpacing.toFixed(1)}×</span>
            </div>
            <input
              type="range"
              min={1.5}
              max={2.6}
              step={0.1}
              value={mushafLineSpacing}
              onChange={(e) => setMushafLineSpacing(Number(e.target.value))}
              className="mushaf-pageslider"
              aria-label={strings.lineSpacing}
            />
          </div>

          <div className="mushaf-set-row">
            <label className="mushaf-set-label" htmlFor="mushaf-reciter">
              <span>{strings.reciter}</span>
            </label>
            <select
              id="mushaf-reciter"
              value={reciterId}
              onChange={(e) => setReciter(e.target.value)}
              className="mushaf-set-select"
            >
              {RECITERS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <button
            className="mushaf-set-reset"
            onClick={() => {
              setMushafScale(1);
              setMushafLineSpacing(1.9);
            }}
          >
            {strings.reset}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Choose Mushaf: card-based edition picker ─────────────────────────────── */

interface EditionMeta {
  id: MushafMode;
  name: { en: string; ms: string };
  meta: { en: string; ms: string };
  desc: { en: string; ms: string };
  /** A short representative line, rendered in the edition's own style. */
  sample: string;
}

const EDITIONS: EditionMeta[] = [
  {
    id: "madani",
    name: { en: "Madani Mushaf", ms: "Mushaf Madani" },
    meta: { en: "King Fahd Complex · 1405 AH · 15 lines", ms: "Kompleks Raja Fahd · 1405H · 15 baris" },
    desc: {
      en: "The page-accurate Madani print in authentic QPC glyphs — Ḥafṣ ʿan ʿĀṣim.",
      ms: "Cetakan Madani tepat-halaman dengan glif QPC asli — Ḥafṣ ʿan ʿĀṣim.",
    },
    sample: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
  },
  {
    id: "uthmani",
    name: { en: "Uthmani Script", ms: "Skrip Uthmani" },
    meta: { en: "Flowing Uthmani · reflowable", ms: "Uthmani mengalir · boleh susun semula" },
    desc: {
      en: "Continuous Uthmani text that reflows to fit any screen size.",
      ms: "Teks Uthmani berterusan yang menyesuaikan setiap saiz skrin.",
    },
    sample: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
  },
  {
    id: "tajweed",
    name: { en: "Tajweed", ms: "Tajwid" },
    meta: { en: "Colour-coded recitation rules", ms: "Hukum tajwid berkod warna" },
    desc: {
      en: "Every rule of recitation highlighted in colour as you read.",
      ms: "Setiap hukum bacaan diserlahkan dengan warna semasa anda membaca.",
    },
    sample: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
  },
];

function ChooseMushaf({
  active,
  language,
  strings,
  onChoose,
  onClose,
}: {
  active: MushafMode;
  language: "en" | "ms";
  strings: Strings;
  onChoose: (m: MushafMode) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="mushaf-sheet-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="mushaf-sheet mushaf-choosesheet" onClick={(e) => e.stopPropagation()}>
        <div aria-hidden className="mushaf-sheet-grip" />
        <div className="mushaf-choose-head">
          <h2>{strings.chooseMushaf}</h2>
          <p>{strings.chooseSub}</p>
        </div>
        <div className="mushaf-sheet-body">
          <ul className="mushaf-edition-list">
            {EDITIONS.map((ed) => {
              const isActive = ed.id === active;
              return (
                <li key={ed.id}>
                  <button
                    className={"mushaf-edition-card" + (isActive ? " is-active" : "")}
                    onClick={() => onChoose(ed.id)}
                    aria-pressed={isActive}
                  >
                    {isActive && (
                      <span className="mushaf-edition-check" aria-hidden>
                        <IconCheck />
                      </span>
                    )}
                    <span
                      className={
                        "mushaf-edition-preview" + (ed.id === "tajweed" ? " is-tajweed" : "")
                      }
                      aria-hidden
                    >
                      <span className="arabic">{ed.sample}</span>
                    </span>
                    <span className="mushaf-edition-info">
                      <span className="mushaf-edition-name">{ed.name[language]}</span>
                      <span className="mushaf-edition-meta">{ed.meta[language]}</span>
                      <span className="mushaf-edition-desc">{ed.desc[language]}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ── Icons ────────────────────────────────────────────────────────────────── */

function IconChevronDown() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 6.5" />
    </svg>
  );
}

function IconBack() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="2.8" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
      <path d="M8 5l12 7-12 7z" />
    </svg>
  );
}

function IconBookmark({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 3h12v18l-6-4.5L6 21V3Z" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function IconShare() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
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
    chooseMushaf: "Choose Mushaf",
    chooseSub: "Pick the edition the reader opens with.",
    next: "Next page",
    prev: "Previous page",
    back: "Back",
    surah: "Surah",
    openSurah: "Open in reader",
    loadError: "Couldn’t load this verse. Check your connection.",
    settings: "Settings",
    textSize: "Text size",
    lineSpacing: "Line spacing",
    reciter: "Reciter",
    reset: "Reset",
    actions: "Verse actions",
    play: "Play",
    bookmark: "Bookmark",
    copy: "Copy",
    copied: "Copied",
    share: "Share",
  };
  const ms = {
    page: "Halaman",
    juz: "Juzuk",
    ayah: "Ayat",
    go: "Pergi ke",
    mode: "Skrip",
    chooseMushaf: "Pilih Mushaf",
    chooseSub: "Pilih edisi yang dibuka oleh pembaca.",
    next: "Halaman seterusnya",
    prev: "Halaman sebelumnya",
    back: "Kembali",
    surah: "Surah",
    openSurah: "Buka dalam pembaca",
    loadError: "Tidak dapat memuatkan ayat ini. Semak sambungan anda.",
    settings: "Tetapan",
    textSize: "Saiz teks",
    lineSpacing: "Jarak baris",
    reciter: "Qari",
    reset: "Set semula",
    actions: "Tindakan ayat",
    play: "Main",
    bookmark: "Simpan",
    copy: "Salin",
    copied: "Disalin",
    share: "Kongsi",
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
