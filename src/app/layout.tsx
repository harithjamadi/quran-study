import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk, Amiri_Quran } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AudioProvider } from "@/components/AudioProvider";
import { AudioBar } from "@/components/AudioBar";
import { Footer } from "@/components/Footer";
import { PWARegister } from "@/components/PWARegister";
import { Analytics } from "@vercel/analytics/next";

// Display: Fraunces — variable serif with optical sizing, soft characterful
// italics. Used for headings, big stats, editorial moments.
const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display-family",
  display: "swap",
});

// Body: Hanken Grotesk — humanist sans with quiet personality. Not Inter,
// not Roboto. Reads beautifully at small sizes alongside an editorial serif.
const body = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body-family",
  display: "swap",
});

// Arabic: Amiri Quran — Khaled Hosny's Quran-specific cut, tuned for proper
// Mushaf typography. Without this self-hosted, the .arabic stack falls
// back to system fonts that render small-high marks like ۛ as wrong glyphs
// (e.g. a ring instead of three triangulated dots).
const arabicQuran = Amiri_Quran({
  subsets: ["arabic"],
  weight: "400",
  variable: "--font-arabic-family",
  display: "swap",
});

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
  appleWebApp: {
    capable: true,
    title: "Mubin",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ec" },
    { media: "(prefers-color-scheme: dark)", color: "#131210" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${arabicQuran.variable}`}
    >
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
        <link
          rel="preconnect"
          href="https://audio.qurancdn.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <AudioProvider>
            <Nav />
            <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-32">
              {children}
            </main>
            <AudioBar />
            <Footer />
            <PWARegister />
          </AudioProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
