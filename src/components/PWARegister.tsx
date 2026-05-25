"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISSED_KEY = "noor.pwa.installDismissed";

export function PWARegister() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only register the service worker in production builds. The dev server's
    // HMR pipeline conflicts with cached scripts.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) || 0);
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - dismissedAt < sevenDays) {
      setHidden(true);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!prompt || hidden) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setHidden(true);
  };

  const install = async () => {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "dismissed") dismiss();
    setPrompt(null);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-xs z-[60] rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-2xl p-4 animate-pop">
      <div className="flex items-start gap-3">
        <div className="text-[color:var(--gold)] text-2xl shrink-0 mt-0.5" aria-hidden>
          ✦
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Install Mubin</p>
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
        </div>
      </div>
    </div>
  );
}
