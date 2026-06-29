// Instant navigation skeleton — shown the moment a link is tapped while the
// server renders the (force-dynamic) page, so clicks feel immediate.
export default function Loading() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="mb-6 space-y-2.5">
        <div className="h-6 w-44 rounded-md bg-stone-200/70" />
        <div className="h-3 w-80 max-w-[80%] rounded bg-stone-200/50" />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-2xl border border-stone-200/70 bg-stone-100/60"
          />
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-xl border border-stone-200/60 bg-stone-100/50"
          />
        ))}
      </div>
    </div>
  );
}
