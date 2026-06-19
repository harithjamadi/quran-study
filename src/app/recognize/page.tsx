import type { Metadata } from "next";
import { RecognizeClient } from "./RecognizeClient";

export const metadata: Metadata = { title: "Recognize an Ayah · Mubin" };

export default function RecognizePage() {
  return <RecognizeClient />;
}
