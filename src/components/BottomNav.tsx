"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { classNames } from "@/lib/format";
import { UI_STRINGS } from "@/lib/i18n";
import { useLearning } from "@/store/learning";
import { useVersion, hasUnseenRelease } from "@/store/version";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * Mobile-native bottom tab bar. Shown only below `md`; on desktop the top
 * <Nav> carries the full link set. Five clear icon + label targets cover the
 * primary journeys, and a "More" sheet holds the secondary destinations so
 * nothing is buried. Designed to be obvious at a glance for any age.
 */
export function BottomNav() {
  const pathname = usePathname();
  const language = useLearning((s) => s.language);
  const setHasSeenTutorial = useLearning((s) => s.setHasSeenTutorial);
  const lastSeenVersion = useVersion((s) => s.lastSeenVersion);
  const hydrated = useHydrated();
  const showUpdateDot = hasUnseenRelease(lastSeenVersion);
  const [moreOpen, setMoreOpen] = useState(false);
  const t = UI_STRINGS[language];

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  // Hide during focused full-screen flows (flashcard sessions, quizzes) so the
  // bar never covers their own bottom controls — standard mobile behavior.
  const focusedFlow = /^\/learn\/(session|surah-quest|tajweed-quest|quest)\b/.test(pathname);

  if (!hydrated || focusedFlow) return null;

  const tabs: {
    href: string;
    label: string;
    icon: (p: { active: boolean }) => React.ReactElement;
    match: (p: string) => boolean;
  }[] = [
    { href: "/", label: t.nav_home, icon: IconHome, match: (p) => p === "/" },
    { href: "/learn", label: t.nav_learn, icon: IconLearn, match: (p) => p.startsWith("/learn") },
    { href: "/surahs", label: t.nav_read, icon: IconBook, match: (p) => p.startsWith("/surah") || p.startsWith("/root") },
    { href: "/search", label: t.nav_search, icon: IconSearch, match: (p) => p.startsWith("/search") },
  ];

  const moreItems: {
    href: string;
    label: string;
    icon: (p: { active: boolean }) => React.ReactElement;
    dot?: boolean;
  }[] = [
    { href: "/mushaf", label: "Mushaf", icon: IconMushaf },
    { href: "/analytics", label: t.nav_stats, icon: IconChart },
    { href: "/bookmarks", label: t.nav_bookmarks, icon: IconBookmark },
    { href: "/changelog", label: t.nav_changelog, icon: IconSparkle, dot: showUpdateDot },
    { href: "/settings", label: t.nav_settings, icon: IconGear },
  ];
  const moreActive = moreItems.some((it) => pathname.startsWith(it.href));

  return (
    <>
      {/* ── "More" bottom sheet ── */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={t.nav_more_title}>
          <button
            aria-label="Close"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[var(--radius-xl)] border-t border-[color:var(--border)] bg-[color:var(--surface)] px-2 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-12px_44px_-14px_rgba(0,0,0,0.4)] animate-slide-up">
            <div aria-hidden className="mx-auto mb-3 mt-1 h-1.5 w-10 rounded-full bg-[color:var(--border-strong)]" />
            <p className="px-3 pb-2 eyebrow text-[10px]">{t.nav_more_title}</p>
            <ul className="pb-1">
              {moreItems.map((it) => {
                const active = pathname.startsWith(it.href);
                const Icon = it.icon;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      onClick={() => setMoreOpen(false)}
                      className={classNames(
                        "flex items-center gap-3.5 rounded-[var(--radius)] px-3.5 py-3.5 transition-colors",
                        active
                          ? "bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]"
                          : "text-[color:var(--foreground)] hover:bg-[color:var(--border)]/40"
                      )}
                    >
                      <span
                        className={classNames(
                          "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                          active ? "bg-[color:var(--accent)] text-white" : "bg-[color:var(--border)]/50 text-[color:var(--muted-strong)]"
                        )}
                      >
                        <Icon active={active} />
                      </span>
                      <span className="text-[15px] font-medium">{it.label}</span>
                      {it.dot && (
                        <span
                          className="h-2 w-2 rounded-full bg-[color:var(--accent)]"
                          aria-label="update available"
                        />
                      )}
                      <span aria-hidden className="ml-auto text-[color:var(--muted)]">›</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-1 border-t border-[color:var(--border)] pt-1">
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  setHasSeenTutorial(false);
                }}
                className="flex w-full items-center gap-3.5 rounded-[var(--radius)] px-3.5 py-3.5 text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--border)]/40"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[color:var(--border)]/50 text-[color:var(--muted-strong)]">
                  <IconHelp />
                </span>
                <span className="text-[15px] font-medium">{t.tut_replay}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom tab bar ── */}
      <nav
        aria-label="Primary"
        className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--border)] bg-[color:var(--background)]/92 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="flex items-stretch">
          {tabs.map((tab) => {
            const active = tab.match(pathname);
            const Icon = tab.icon;
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={classNames(
                    "flex h-[3.75rem] flex-col items-center justify-center gap-1 transition-colors",
                    active ? "text-[color:var(--accent-strong)]" : "text-[color:var(--muted)]"
                  )}
                >
                  <span
                    className={classNames(
                      "flex items-center justify-center rounded-full px-4 py-0.5 transition-colors",
                      active ? "bg-[color:var(--accent-soft)]" : ""
                    )}
                  >
                    <Icon active={active} />
                  </span>
                  <span className={classNames("text-[10.5px] leading-none tracking-wide", active ? "font-bold" : "font-medium")}>
                    {tab.label}
                  </span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={classNames(
                "flex h-[3.75rem] w-full flex-col items-center justify-center gap-1 transition-colors",
                moreActive || moreOpen ? "text-[color:var(--accent-strong)]" : "text-[color:var(--muted)]"
              )}
            >
              <span
                className={classNames(
                  "relative flex items-center justify-center rounded-full px-4 py-0.5 transition-colors",
                  moreActive || moreOpen ? "bg-[color:var(--accent-soft)]" : ""
                )}
              >
                <IconMore active={moreActive || moreOpen} />
                {showUpdateDot && !moreOpen && (
                  <span
                    aria-hidden
                    className="absolute right-2.5 top-0 h-2 w-2 rounded-full bg-[color:var(--accent)] ring-2 ring-[color:var(--background)]"
                  />
                )}
              </span>
              <span className={classNames("text-[10.5px] leading-none tracking-wide", moreActive ? "font-bold" : "font-medium")}>
                {t.nav_more}
              </span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}

/* ── Icons ──
 * Stroke icons that gain a filled body when active, so the current tab reads
 * clearly even at a glance. 24px viewBox, rendered at 22px. */

function IconHome({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? "2.1" : "1.7"} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.14 : 1} />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

function IconLearn({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? "2.1" : "1.7"} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 4 2.5 9 12 14l9.5-5L12 4Z" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.16 : 1} />
      <path d="M6 11v4.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V11" />
      <path d="M21.5 9v4.5" />
    </svg>
  );
}

function IconBook({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? "2.1" : "1.7"} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 6.5C10 5 7 4 3.5 4.2v14C7 18 10 19 12 20.5" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.16 : 1} />
      <path d="M12 6.5C14 5 17 4 20.5 4.2v14C17 18 14 19 12 20.5" />
      <path d="M12 6.5v14" />
    </svg>
  );
}

function IconSearch({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? "2.2" : "1.7"} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

function IconMore({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" stroke="none" aria-hidden>
      <circle cx="5" cy="12" r={active ? "2.1" : "1.7"} />
      <circle cx="12" cy="12" r={active ? "2.1" : "1.7"} />
      <circle cx="19" cy="12" r={active ? "2.1" : "1.7"} />
    </svg>
  );
}

function IconMushaf({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H18a2 2 0 0 1 2 2v13a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V5.5Z" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.14 : 1} />
      <path d="M8 8h8M8 11h8M8 14h5" />
    </svg>
  );
}

function IconChart({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" opacity={active ? 1 : 0.95} />
    </svg>
  );
}

function IconBookmark({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 3h12v18l-6-4.5L6 21V3Z" />
    </svg>
  );
}

function IconHelp() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.2 9.2a2.8 2.8 0 0 1 5.4 1c0 1.8-2.6 2.2-2.6 4" />
      <path d="M12 17.5h.01" />
    </svg>
  );
}

function IconSparkle({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l1.9 4.8L18.7 9.7 14 11.6 12 16.5 10 11.6 5.3 9.7 10.1 7.8 12 3Z" fillOpacity={active ? 0.16 : 1} />
      <path d="M18.5 14.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
    </svg>
  );
}

function IconGear({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r={active ? "3" : "2.6"} />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </svg>
  );
}
