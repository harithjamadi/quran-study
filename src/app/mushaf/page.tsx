"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clampPage } from "@/lib/mushaf";

const LAST_PAGE_KEY = "mushaf.lastPage.v1";

// Entry point: resume the reader on the last page the user was on, else page 1.
export default function MushafIndexPage() {
  const router = useRouter();
  useEffect(() => {
    let page = 1;
    try {
      const saved = localStorage.getItem(LAST_PAGE_KEY);
      if (saved) page = clampPage(Number(saved));
    } catch {
      /* ignore */
    }
    router.replace(`/mushaf/${page}`);
  }, [router]);

  return (
    <div className="py-24 text-center">
      <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--accent)] border-r-transparent" />
    </div>
  );
}
