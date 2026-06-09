import { promises as fs } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { FoundationsTrack } from "@/components/FoundationsTrack";

export const metadata: Metadata = {
  title: "Foundations — Noorani Track",
  description:
    "Build a solid base before Tajweed quests: learn the alphabet, short vowels, tanween, sukun, and shadda through interactive lessons with articulation diagrams.",
};

async function loadFoundations() {
  const raw = await fs.readFile(
    path.join(process.cwd(), "public", "data", "foundations.json"),
    "utf-8"
  );
  return JSON.parse(raw);
}

export default async function FoundationsPage() {
  const data = await loadFoundations();
  return (
    <div className="max-w-2xl mx-auto space-y-4 py-2">
      <div className="text-center">
        <p className="eyebrow text-[color:var(--accent-strong)] mb-1">Phase 0</p>
        <h1 className="display text-[length:var(--text-2xl)] font-black">Noorani Foundations</h1>
        <p className="text-sm text-[color:var(--muted)] mt-1.5 max-w-md mx-auto">
          Master the building blocks of Arabic recitation — alphabet, vowels, and essential marks.
        </p>
      </div>
      <FoundationsTrack lessons={data.lessons} />
    </div>
  );
}
