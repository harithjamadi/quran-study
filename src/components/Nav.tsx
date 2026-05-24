"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { classNames } from "@/lib/format";

import { UI_STRINGS } from "@/lib/i18n";
import { useLearning } from "@/store/learning";

export function Nav() {
  const pathname = usePathname();
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];

  const items = [
    { href: "/", label: t.nav_home },
    { href: "/learn", label: t.nav_learn },
    { href: "/surahs", label: t.nav_read },
    { href: "/search", label: t.nav_search },
    { href: "/bookmarks", label: t.nav_bookmarks },
    { href: "/settings", label: t.nav_settings },
  ];

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-[color:var(--background)]/85 border-b border-[color:var(--border)]">
      <nav className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden className="text-[color:var(--gold)] text-xl">✦</span>
          <span>Mubin</span>
          <span className="hidden sm:inline text-xs text-[color:var(--muted)] font-normal">
            · Quran study
          </span>
        </Link>
        <ul className="ml-auto flex items-center gap-1 text-sm">
          {items.map((it) => {
            const active =
              it.href === "/"
                ? pathname === "/"
                : pathname.startsWith(it.href);
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className={classNames(
                    "px-3 py-1.5 rounded-md transition-colors",
                    active
                      ? "bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]"
                      : "text-[color:var(--muted)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--border)]/40"
                  )}
                >
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
