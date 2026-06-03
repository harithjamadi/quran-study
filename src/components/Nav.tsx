"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { classNames } from "@/lib/format";

import { UI_STRINGS } from "@/lib/i18n";
import { useLearning } from "@/store/learning";

export function Nav() {
  const pathname = usePathname();
  const language = useLearning((s) => s.language);
  const setHasSeenTutorial = useLearning((s) => s.setHasSeenTutorial);
  const t = UI_STRINGS[language];

  const items = [
    { href: "/", label: t.nav_home },
    { href: "/learn", label: t.nav_learn },
    { href: "/surahs", label: t.nav_read },
    { href: "/mushaf", label: language === "ms" ? "Mushaf" : "Mushaf" },
    { href: "/analytics", label: language === "ms" ? "Analitik" : "Stats" },
    { href: "/search", label: t.nav_search },
    { href: "/bookmarks", label: t.nav_bookmarks },
    { href: "/settings", label: t.nav_settings },
  ];

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[color:var(--background)]/80 border-b border-[color:var(--border)]">
      <nav className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center gap-3 sm:gap-6">
        <Link
          href="/"
          className="group flex items-center gap-2 shrink-0"
          aria-label="Mubin home"
        >
          <span
            aria-hidden
            className="text-[color:var(--gold)] text-lg sm:text-xl transition-transform duration-500 group-hover:rotate-180"
          >
            ✦
          </span>
          <span
            className="display text-[1.05rem] sm:text-[1.15rem] tracking-tight"
            style={{ fontWeight: 600 }}
          >
            Mubin
          </span>
        </Link>

        <ul className="ml-auto hidden md:flex items-center gap-0.5 sm:gap-1 text-[13px] sm:text-sm">
          {items.map((it) => {
            const active =
              it.href === "/"
                ? pathname === "/"
                : pathname.startsWith(it.href);
            return (
              <li key={it.href} className="relative shrink-0">
                <Link
                  href={it.href}
                  className={classNames(
                    "relative inline-flex items-center px-2 sm:px-3 py-2 rounded-md transition-colors duration-200 whitespace-nowrap",
                    active
                      ? "text-[color:var(--foreground)]"
                      : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                  )}
                >
                  {it.label}
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-2 sm:left-3 right-2 sm:right-3 -bottom-[1px] h-[2px] bg-[color:var(--gold)] rounded-full animate-fade-in"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => setHasSeenTutorial(false)}
          aria-label={t.tut_replay}
          title={t.tut_replay}
          className="hidden md:inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[color:var(--muted)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--border)]/40 transition-colors"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M9.2 9.2a2.8 2.8 0 0 1 5.4 1c0 1.8-2.6 2.2-2.6 4" />
            <path d="M12 17.5h.01" />
          </svg>
        </button>
      </nav>
    </header>
  );
}
