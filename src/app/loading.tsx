export default function Loading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <div className="card p-6 animate-pulse-soft">
        <div className="h-6 w-40 bg-[color:var(--border)] rounded mb-3" />
        <div className="h-4 w-full bg-[color:var(--border)] rounded mb-2" />
        <div className="h-4 w-2/3 bg-[color:var(--border)] rounded" />
      </div>
      <div className="card p-6 animate-pulse-soft">
        <div className="h-4 w-1/3 bg-[color:var(--border)] rounded mb-3" />
        <div className="h-4 w-full bg-[color:var(--border)] rounded mb-2" />
        <div className="h-4 w-5/6 bg-[color:var(--border)] rounded" />
      </div>
    </div>
  );
}
