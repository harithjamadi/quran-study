"use client";

import { useLearning } from "@/store/learning";
import { useHydrated } from "@/lib/use-hydrated";

export function Footer() {
  const language = useLearning((s) => s.language);
  const hydrated = useHydrated();

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
      </div>
    </footer>
  );
}
