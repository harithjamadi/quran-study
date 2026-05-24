"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="card p-10 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-[color:var(--muted)] mt-2">
        An unexpected error occurred. You can try again.
      </p>
      <button
        onClick={() => reset()}
        className="inline-block mt-5 rounded-full bg-[color:var(--accent)] text-white px-4 py-2 text-sm hover:bg-[color:var(--accent-strong)]"
      >
        Try again
      </button>
    </div>
  );
}
