import type { Metadata } from "next";
import { QariComparison } from "@/components/QariComparison";

export const metadata: Metadata = {
  title: "Qari Comparison",
  description: "Train your ear by comparing the same verse recited by two reciters.",
};

export default function QariComparePage() {
  return (
    <div className="max-w-lg mx-auto">
      <QariComparison />
    </div>
  );
}
