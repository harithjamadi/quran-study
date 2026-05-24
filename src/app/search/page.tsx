"use client";

import { useSearchParams } from "next/navigation";
import { SearchClient } from "@/components/SearchClient";
import { useLearning } from "@/store/learning";
import { UI_STRINGS } from "@/lib/i18n";
import { useHydrated } from "@/lib/use-hydrated";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];
  const hydrated = useHydrated();

  const query = searchParams?.get("q") ?? "";
  const edition = searchParams?.get("edition") ?? "en.sahih";

  if (!hydrated) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t.search_title}</h1>
        <p className="text-sm text-[color:var(--muted)] mt-1">
          {t.search_desc}
        </p>
      </header>
      <SearchClient
        initialQuery={query}
        initialEdition={edition}
        initialResults={[]}
        initialCount={0}
        initialError={null}
      />
    </div>
  );
}
