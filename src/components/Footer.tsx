"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLearning } from "@/store/learning";
import { useHydrated } from "@/lib/use-hydrated";
import { UI_STRINGS } from "@/lib/i18n";
import { APP_VERSION } from "@/lib/changelog";
import { useVersion, hasUnseenRelease } from "@/store/version";

export function Footer() {
  const language = useLearning((s) => s.language);
  const lastSeenVersion = useVersion((s) => s.lastSeenVersion);
  const initSeen = useVersion((s) => s.initSeen);
  const hydrated = useHydrated();
  const t = UI_STRINGS[language];

  // On a fresh install, silently record the current version so the user only
  // sees the "What's New" dot after a *future* update — not on first launch.
  // Wait for hydration so we never overwrite a persisted lastSeenVersion.
  useEffect(() => {
    if (hydrated) initSeen();
  }, [hydrated, initSeen]);

  const showDot = hasUnseenRelease(lastSeenVersion);

  if (!hydrated) return null;

  return (
    <footer className="border-t border-[color:var(--border)] mt-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-6 text-xs text-[color:var(--muted)] flex flex-wrap gap-4 justify-between">
        <p>
          {language === "ms" ? (
            <>
              Mubin · Alat kajian Al-Quran sumber terbuka. Teks & terjemahan disediakan oleh{" "}
              <a
                className="underline hover:text-[color:var(--foreground)]"
                href="https://alquran.cloud/api"
                target="_blank"
                rel="noreferrer"
              >
                alquran.cloud
              </a>
              .
            </>
          ) : (
            <>
              Mubin · A free open Quran study tool. Quran text & translations served via{" "}
              <a
                className="underline hover:text-[color:var(--foreground)]"
                href="https://alquran.cloud/api"
                target="_blank"
                rel="noreferrer"
              >
                alquran.cloud
              </a>
              .
            </>
          )}
        </p>
        <p>
          {language === "ms" ? (
            <>
              Audio ihsan daripada CDN{" "}
              <a
                className="underline hover:text-[color:var(--foreground)]"
                href="https://islamic.network/"
                target="_blank"
                rel="noreferrer"
              >
                islamic.network
              </a>
              .
            </>
          ) : (
            <>
              Audio courtesy of the{" "}
              <a
                className="underline hover:text-[color:var(--foreground)]"
                href="https://islamic.network/"
                target="_blank"
                rel="noreferrer"
              >
                islamic.network
              </a>{" "}
              CDN.
            </>
          )}
        </p>
        <p className="basis-full">
          <Link
            href="/changelog"
            className="inline-flex items-center gap-1.5 font-mono tabular-nums hover:text-[color:var(--foreground)] transition-colors"
          >
            <span>v{APP_VERSION}</span>
            <span aria-hidden>·</span>
            <span className="font-sans">{t.nav_changelog}</span>
            {showDot && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]"
                aria-label="update available"
              />
            )}
          </Link>
        </p>
      </div>
    </footer>
  );
}
