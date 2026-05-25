import type { Metadata } from "next";
import Link from "next/link";
import {
  TAJWEED_RULES,
  WAQF_SIGNS,
  categoryLabel,
  type TajweedCategory,
  type TajweedRule,
} from "@/lib/tajweed";

export const metadata: Metadata = {
  title: "Tajweed Guide",
  description:
    "A complete interactive reference for Quranic tajweed rules — conditions, letter colors, and how to pronounce each rule correctly.",
};

const CATEGORY_ORDER: TajweedCategory[] = [
  "qalqalah",
  "madd",
  "ghunna",
  "noon_tanween",
  "meem",
  "hamza_lam",
  "waqf",
];

const CATEGORY_DESC: Record<TajweedCategory, { en: string; ms: string }> = {
  qalqalah: {
    en: "An echoing bounce produced on five specific letters when they carry sukun.",
    ms: "Lantunan gema yang dihasilkan pada lima huruf tertentu apabila membawa sukun.",
  },
  madd: {
    en: "Prolongation rules governing how long vowel sounds are stretched. The count (2, 4, 5, or 6 harakat) depends on context.",
    ms: "Peraturan pemanjangan yang mengawal tempoh bunyi vokal panjang. Bilangan harakat (2, 4, 5, atau 6) bergantung pada konteks.",
  },
  ghunna: {
    en: "A nasal hum produced through the nose when noon or meem is doubled (mushaddad).",
    ms: "Dengung nasal melalui hidung apabila nun atau mim digandakan (musyaddad).",
  },
  noon_tanween: {
    en: "Rules for noon saakin and tanween (the sound attached to the previous letter) when followed by specific letters.",
    ms: "Peraturan untuk nun saakin dan tanwin apabila diikuti oleh huruf tertentu.",
  },
  meem: {
    en: "Rules specifically for meem saakin — different from noon rules in articulation point.",
    ms: "Peraturan khusus untuk mim saakin — berbeza dari peraturan nun dari segi tempat sebutan.",
  },
  hamza_lam: {
    en: "Connecting hamzah and assimilating lam — letters that are often silent or merged in continuous recitation.",
    ms: "Hamzah penghubung dan lam yang diserap — huruf yang sering senyap atau digabungkan dalam bacaan berterusan.",
  },
  waqf: {
    en: "Stop signs written in the Mushaf to guide the reciter when and how to pause.",
    ms: "Tanda berhenti yang ditulis dalam Mushaf untuk membimbing pembaca bila dan bagaimana perlu berhenti.",
  },
};

function groupByCategory(): Record<TajweedCategory, TajweedRule[]> {
  const groups: Partial<Record<TajweedCategory, TajweedRule[]>> = {};
  for (const rule of Object.values(TAJWEED_RULES)) {
    const cat = rule.category;
    groups[cat] ??= [];
    groups[cat]!.push(rule);
  }
  return groups as Record<TajweedCategory, TajweedRule[]>;
}

export default function TajweedPage() {
  const groups = groupByCategory();

  return (
    <div className="space-y-10">
      {/* Page header */}
      <section className="card p-6 sm:p-8 relative overflow-hidden text-center">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--accent-soft)_0%,transparent_60%)] pointer-events-none"
        />
        <div className="relative">
          <p className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
            Learning · Reference
          </p>
          <h1 className="text-3xl font-semibold mt-2">Tajweed Guide</h1>
          <p className="arabic text-2xl mt-1 text-[color:var(--accent-strong)]">
            أحكام التجويد
          </p>
          <p className="text-sm text-[color:var(--muted)] mt-3 max-w-xl mx-auto leading-relaxed">
            Tajweed (تجويد) means "to do well" or "to make beautiful." These rules
            govern the precise pronunciation of every letter in the Quran, preserving
            the exact recitation of the Prophet Muhammad ﷺ.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] text-white px-5 py-2 text-sm hover:bg-[color:var(--accent-strong)]"
            >
              Enable Tajweed Colors in Reader →
            </Link>
            <Link
              href="/surahs"
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-5 py-2 text-sm hover:bg-[color:var(--accent-soft)]/40"
            >
              Read the Quran
            </Link>
          </div>
        </div>
      </section>

      {/* Quick color legend */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)] mb-4">
          Color Reference
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Object.values(TAJWEED_RULES).map((rule) => (
            <a
              key={rule.code}
              href={`#cat-${rule.category}`}
              className="flex items-center gap-2.5 rounded-lg border border-[color:var(--border)] px-3 py-2 hover:bg-[color:var(--accent-soft)]/30 transition-colors"
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: rule.color }}
                aria-hidden
              />
              <span className="text-xs font-medium truncate">{rule.name.en}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Categories */}
      {CATEGORY_ORDER.map((cat) => {
        const rules = groups[cat];
        const desc = CATEGORY_DESC[cat];

        return (
          <section key={cat} id={`cat-${cat}`} className="scroll-mt-20 space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{categoryLabel(cat, "en")}</h2>
              <p className="text-sm text-[color:var(--muted)] mt-1">{desc.en}</p>
            </div>

            {cat === "waqf" ? (
              <WaqfSection />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {(rules ?? []).map((rule) => (
                  <RuleCard key={rule.code} rule={rule} />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {/* Footer note */}
      <div className="card p-5 text-sm text-[color:var(--muted)] leading-relaxed">
        <p className="font-semibold text-[color:var(--foreground)] mb-1">
          About this guide
        </p>
        <p>
          Color annotations follow the{" "}
          <strong>quran-tajweed edition</strong> used by alquran.cloud, which marks
          rules in the Uthmani script. Tajweed colors are available for Surahs 1–81 in
          the reader. Enable them in{" "}
          <Link href="/settings" className="text-[color:var(--accent-strong)] hover:underline">
            Settings → Tajweed Colors
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

/* ── Rule Card ──────────────────────────────────────────────────────────────── */

function RuleCard({ rule }: { rule: TajweedRule }) {
  return (
    <article
      className="card p-5 space-y-3 border-t-2"
      style={{ borderTopColor: rule.color }}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: rule.color }}
              aria-hidden
            />
            <h3 className="font-bold text-[color:var(--foreground)]">
              {rule.name.en}
            </h3>
          </div>
          <p
            className="arabic text-lg text-[color:var(--muted)] mt-0.5"
            lang="ar"
            dir="rtl"
          >
            {rule.name.ar}
          </p>
        </div>
        <span
          className="font-mono text-xs px-2 py-1 rounded-full bg-[color:var(--border)]/50 text-[color:var(--muted)] shrink-0"
        >
          {rule.code}
        </span>
      </div>

      {/* Letters if applicable */}
      {rule.letters && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-[color:var(--muted)] font-bold shrink-0">
            Letters
          </span>
          <p
            className="arabic text-lg leading-loose"
            lang="ar"
            dir="rtl"
            style={{ color: rule.color }}
          >
            {rule.letters}
          </p>
        </div>
      )}

      {/* Condition */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[color:var(--muted)] font-bold mb-1">
          Condition
        </p>
        <p className="text-sm text-[color:var(--foreground)] leading-relaxed">
          {rule.condition.en}
        </p>
      </div>

      {/* How to read */}
      <div className="rounded-xl bg-[color:var(--border)]/30 p-3">
        <p className="text-[10px] uppercase tracking-widest text-[color:var(--muted)] font-bold mb-1">
          How to Read
        </p>
        <p className="text-sm text-[color:var(--foreground)] leading-relaxed">
          {rule.howToRead.en}
        </p>
      </div>

      {/* Malay equivalent */}
      <details className="text-xs text-[color:var(--muted)] group">
        <summary className="cursor-pointer hover:text-[color:var(--foreground)] transition-colors list-none flex items-center gap-1">
          <span className="group-open:hidden">▶ Bahasa Melayu</span>
          <span className="hidden group-open:inline">▼ Bahasa Melayu</span>
        </summary>
        <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-[color:var(--border)]">
          <p><strong>Syarat:</strong> {rule.condition.ms}</p>
          <p><strong>Cara Sebut:</strong> {rule.howToRead.ms}</p>
        </div>
      </details>
    </article>
  );
}

/* ── Waqf Section ───────────────────────────────────────────────────────────── */

function WaqfSection() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {WAQF_SIGNS.map((sign) => (
        <article
          key={sign.char}
          className="card p-5 space-y-2 border-t-2 border-t-[color:var(--gold)]"
        >
          <div className="flex items-center gap-3">
            <span
              className="arabic text-3xl text-[color:var(--gold)]"
              lang="ar"
              aria-hidden
            >
              {sign.char}
            </span>
            <div>
              <h3 className="font-bold text-[color:var(--foreground)]">
                {sign.name.en}
              </h3>
              <p
                className="arabic text-sm text-[color:var(--muted)]"
                lang="ar"
                dir="rtl"
              >
                {sign.name.ar}
              </p>
            </div>
          </div>
          <p className="text-sm text-[color:var(--foreground)] leading-relaxed">
            {sign.instruction.en}
          </p>

          {/* Sajdah special content */}
          {sign.char === "۩" && (
            <div className="rounded-xl border border-[color:var(--gold)]/30 bg-[color:var(--gold)]/5 p-3 space-y-2 mt-2">
              <p className="text-[10px] uppercase tracking-widest text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] font-bold">
                Sajdah Supplication
              </p>
              <p
                className="arabic text-base leading-loose text-[color:var(--foreground)]"
                lang="ar"
                dir="rtl"
              >
                سَجَدَ وَجْهِيَ لِلَّذِي خَلَقَهُ وَشَقَّ سَمْعَهُ وَبَصَرَهُ بِحَوْلِهِ وَقُوَّتِهِ
              </p>
              <p className="text-xs text-[color:var(--muted)] italic">
                "My face prostrates to the One who created it and formed its hearing and sight
                by His power and strength." — Recite this in sujud.
              </p>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
