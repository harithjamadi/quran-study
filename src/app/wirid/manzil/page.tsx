import type { Metadata } from "next";
import { MANZIL } from "@/data/wirid";
import { fetchWiridPassages } from "@/lib/wirid-fetch";
import { ManzilClient } from "./ManzilClient";

export const metadata: Metadata = {
  title: "Manzil — Protection Verses",
  description:
    "Read the Manzil — the classical compilation of 33 Quranic passages recited daily for protection (ruqyah), with translation and progress tracking.",
  alternates: { canonical: "/wirid/manzil" },
};

export default async function ManzilPage() {
  const passages = await fetchWiridPassages(MANZIL);
  return <ManzilClient passages={passages} />;
}
