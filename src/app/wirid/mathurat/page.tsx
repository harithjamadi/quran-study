import type { Metadata } from "next";
import { MATHURAT } from "@/data/wirid";
import { fetchWiridPassages } from "@/lib/wirid-fetch";
import { MathuratClient } from "./MathuratClient";

export const metadata: Metadata = {
  title: "Al-Ma'thurat — Morning & Evening Adhkar",
  description:
    "Recite Al-Ma'thurat (sughra) — the daily compilation of Quranic passages and Prophetic supplications for morning and evening, with translation and tap-to-count.",
  alternates: { canonical: "/wirid/mathurat" },
};

export default async function MathuratPage() {
  // Batched + cached server fetch: the Quranic passages arrive pre-sliced so
  // the page paints complete with no client round-trip.
  const passages = await fetchWiridPassages(MATHURAT);
  return <MathuratClient passages={passages} />;
}
