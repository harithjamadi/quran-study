"use client";

import { SettingsPanel } from "@/components/SettingsPanel";
import { UI_STRINGS } from "@/lib/i18n";
import { useLearning } from "@/store/learning";
import { useHydrated } from "@/lib/use-hydrated";

export default function SettingsPage() {
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];
  const hydrated = useHydrated();

  if (!hydrated) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t.set_title}</h1>
        <p className="text-sm text-[color:var(--muted)] mt-1">
          {t.set_desc}
        </p>
      </header>
      <SettingsPanel />
    </div>
  );
}
