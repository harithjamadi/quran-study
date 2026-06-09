import type { Metadata } from "next";
import { WaqfMaster } from "@/components/WaqfMaster";

export const metadata: Metadata = {
  title: "Waqf Master",
  description: "Learn the 11 Quran stop signs through interactive multiple-choice quizzes.",
};

export default function WaqfPage() {
  return (
    <div className="max-w-lg mx-auto">
      <WaqfMaster />
    </div>
  );
}
