import type { Metadata } from "next";
import { WiridHubClient } from "./WiridHubClient";

export const metadata: Metadata = {
  title: "Wirid — Daily Adhkar",
  description:
    "Daily remembrance routines: Al-Ma'thurat morning and evening adhkar, and the Manzil protection compilation — with translation and tap-to-count progress.",
  alternates: { canonical: "/wirid" },
};

export default function WiridPage() {
  return <WiridHubClient />;
}
