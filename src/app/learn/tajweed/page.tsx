import type { Metadata } from "next";
import { TajweedGuideClient } from "@/components/TajweedGuideClient";

export const metadata: Metadata = {
  title: "Tajweed Guide",
  description:
    "A complete reference for Quranic tajweed rules — conditions, letter colors, and how to pronounce each rule correctly.",
};

export default function TajweedPage() {
  return <TajweedGuideClient />;
}
