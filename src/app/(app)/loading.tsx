export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse space-y-4">
      <span className="sr-only">Gegevens worden geladen…</span>
      <div className="h-7 w-72 rounded bg-line" />
      <div className="h-4 w-[28rem] max-w-full rounded bg-line" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-surface border border-line" />)}
      </div>
      <div className="h-64 rounded-lg bg-surface border border-line" />
    </div>
  );
}
