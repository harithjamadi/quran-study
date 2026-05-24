/* Reusable empty-state with a small illustrated icon, headline, helper text
   and an optional CTA. Kept dependency-free — SVG illustrations inline. */

import Link from "next/link";

interface EmptyStateProps {
  illustration: "bookmark" | "search" | "vocab" | "session";
  title: string;
  body: string;
  cta?: { label: string; href: string };
}

export function EmptyState({ illustration, title, body, cta }: EmptyStateProps) {
  return (
    <div className="card relative overflow-hidden p-10 sm:p-14 text-center animate-fade-up">
      <div
        aria-hidden
        className="absolute -top-20 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-[color:var(--accent)]/8 blur-3xl pointer-events-none"
      />
      <div className="relative inline-flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center mb-6">
        {/* Decorative ring behind the illustration */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-full border border-dashed border-[color:var(--gold)]/30"
        />
        <Illustration kind={illustration} />
      </div>
      <h2
        className="display text-[length:var(--text-xl)] text-[color:var(--foreground)]"
        style={{ fontWeight: 600 }}
      >
        {title}
      </h2>
      <p className="mt-2 max-w-md mx-auto text-sm text-[color:var(--muted-strong)] leading-relaxed">
        {body}
      </p>
      {cta && (
        <Link
          href={cta.href}
          className="touch-target mt-6 inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[color:var(--accent-strong)] hover:shadow-[var(--shadow-glow)] transition-all active:scale-95"
        >
          {cta.label}
          <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
}

function Illustration({ kind }: { kind: EmptyStateProps["illustration"] }) {
  const stroke = "var(--gold)";
  const fill = "var(--gold-soft)";

  if (kind === "bookmark") {
    return (
      <svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M18 8h28a2 2 0 0 1 2 2v46l-16-10-16 10V10a2 2 0 0 1 2-2Z" fill={fill} />
        <path d="M26 22h12M26 30h8" />
      </svg>
    );
  }
  if (kind === "search") {
    return (
      <svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="28" cy="28" r="16" fill={fill} />
        <path d="m42 42 12 12" />
        <path d="M22 28h12M28 22v12" opacity="0.6" />
      </svg>
    );
  }
  if (kind === "vocab") {
    return (
      <svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="10" y="14" width="44" height="36" rx="2" fill={fill} />
        <path d="M32 14v36M18 22h8M18 30h8M38 22h8M38 30h8" />
      </svg>
    );
  }
  // session
  return (
    <svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="32" cy="32" r="22" fill={fill} />
      <path d="M28 24v16l12-8z" fill={stroke} />
    </svg>
  );
}
