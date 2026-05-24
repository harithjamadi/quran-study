import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AudioProvider } from "@/components/AudioProvider";
import { AudioBar } from "@/components/AudioBar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: {
    default: "Mubin — Making the Quran Clear",
    template: "%s · Mubin",
  },
  description:
    "Learn Quranic Arabic word by word. Active recall flashcards on the highest-frequency lemmas, plus a reader where every Arabic word reveals its meaning and root. Free, open, no account.",
  applicationName: "Mubin",
  keywords: ["Quran", "Quranic Arabic", "Word by word", "Tafsir", "Recitation", "Translation", "Bahasa Melayu", "Free Quran app"],
  openGraph: {
    title: "Mubin — Making the Quran Clear",
    description: "Learn Quranic Arabic word by word. Free, open, no account.",
    type: "website",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf5" },
    { media: "(prefers-color-scheme: dark)", color: "#14140f" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://api.alquran.cloud"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://cdn.islamic.network"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen">
        <ThemeProvider>
          <AudioProvider>
            <Nav />
            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-32">{children}</main>
            <AudioBar />
            <Footer />
          </AudioProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
