import type { Metadata } from "next";
import { AudioShadowing } from "@/components/AudioShadowing";

export const metadata: Metadata = {
  title: "Audio Shadowing",
  description: "Listen to a Quran verse, record yourself, and compare with the original recitation.",
};

export default function AudioShadowPage() {
  return (
    <div className="max-w-lg mx-auto">
      <AudioShadowing />
    </div>
  );
}
