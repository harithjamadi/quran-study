"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISSED_KEY = "noor.pwa.installDismissed";

function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  // Safari on iOS includes "Safari" but not "CriOS" (Chrome) or "FxiOS" (Firefox)
  const isSafari = /safari/i.test(ua) && !/crios|fxios|chrome/i.test(ua);
  return isIOS && isSafari;
}

function isAlreadyInstalled(): boolean {
  // iOS standalone mode
  if ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true) return true;
  // Chrome/Android installed PWA
  if (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) return true;
  return false;
}

function dismissedRecently(): boolean {
  if (typeof window === "undefined") return false;
  const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) || 0);
  return Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000;
}

export function PWARegister() {
  const [chromePrompt, setChromePrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  // Dismissed state is safe to compute as lazy initial state: when true the
  // component renders null on both server and client, so no hydration mismatch.
  const [hidden, setHidden] = useState(dismissedRecently);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      // When an *updated* worker takes control, reload once so the page swaps to
      // fresh assets instead of running against a stale cached shell. We skip the
      // reload on the very first install (no prior controller) — that's not an
      // update, and reloading then would be a pointless flash. `refreshing`
      // guards against more than one reload.
      const hadController = !!navigator.serviceWorker.controller;
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing || !hadController) return;
        refreshing = true;
        window.location.reload();
      });

      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Proactively check for an updated worker on each load, and tell a
          // waiting worker to take over immediately so fixes ship without a
          // manual cache clear.
          reg.update().catch(() => undefined);
          reg.addEventListener("updatefound", () => {
            const installing = reg.installing;
            if (!installing) return;
            installing.addEventListener("statechange", () => {
              if (installing.state === "installed" && navigator.serviceWorker.controller) {
                reg.waiting?.postMessage("SKIP_WAITING");
              }
            });
          });
        })
        .catch(() => undefined);
    }

    if (dismissedRecently() || isAlreadyInstalled()) return;

    // Show iOS-specific "Add to Home Screen" guide for Safari users.
    // Apple never fires beforeinstallprompt, so we need our own nudge.
    // This must be a post-mount setState (not lazy initial state): the server
    // can't detect iOS Safari, so rendering it during SSR would mismatch on hydration.
    if (isIOSSafari()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowIOSHint(true);
      return;
    }

    // Capture Chrome/Android's install prompt so we can trigger it from our own UI.
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setChromePrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (hidden || (!chromePrompt && !showIOSHint)) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setHidden(true);
  };

  const install = async () => {
    if (!chromePrompt) return;
    await chromePrompt.prompt();
    const choice = await chromePrompt.userChoice;
    if (choice.outcome === "dismissed") dismiss();
    setChromePrompt(null);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-xs z-[60] rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-2xl p-4 animate-pop">
      <div className="flex items-start gap-3">
        <div className="text-[color:var(--gold)] text-2xl shrink-0 mt-0.5" aria-hidden>
          ✦
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Install Mubin</p>

          {showIOSHint ? (
            <>
              <p className="text-xs text-[color:var(--muted)] mt-0.5 leading-relaxed">
                Tap the{" "}
                <span className="inline-flex items-center gap-0.5 font-medium text-[color:var(--foreground)]">
                  {/* iOS Share icon */}
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                    className="inline-block"
                  >
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>{" "}
                  Share
                </span>{" "}
                button in Safari, then choose{" "}
                <span className="font-medium text-[color:var(--foreground)]">
                  &ldquo;Add to Home Screen&rdquo;
                </span>
                .
              </p>
              <button
                onClick={dismiss}
                className="mt-3 text-xs text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-colors"
              >
                Dismiss
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-[color:var(--muted)] mt-0.5 leading-relaxed">
                Add to your home screen for offline reading and faster launches.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={install}
                  className="rounded-full bg-[color:var(--accent)] text-white px-3 py-1.5 text-xs font-bold hover:bg-[color:var(--accent-strong)] transition-colors"
                >
                  Install
                </button>
                <button
                  onClick={dismiss}
                  className="text-xs text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-colors"
                >
                  Not now
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
