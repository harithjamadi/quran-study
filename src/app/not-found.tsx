import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card p-10 text-center">
      <p className="text-xs uppercase tracking-widest text-[color:var(--muted)]">404</p>
      <h1 className="text-2xl font-semibold mt-2">Page not found</h1>
      <p className="text-sm text-[color:var(--muted)] mt-2">
        The page you’re looking for doesn’t exist.
      </p>
      <Link
        href="/"
        className="inline-block mt-5 rounded-full bg-[color:var(--accent)] text-white px-4 py-2 text-sm hover:bg-[color:var(--accent-strong)]"
      >
        Back to home
      </Link>
    </div>
  );
}
