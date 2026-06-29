// Instant navigation skeleton — shown the moment a link is tapped (and briefly
// on reload) while the server renders the page. Solid, borderless soft-grey
// blocks that pulse, so it reads as "loading" rather than empty outlined boxes.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden="true">
      <div className="space-y-2.5">
        <div className="h-6 w-44 rounded-md bg-stone-200" />
        <div className="h-3 w-80 max-w-[70%] rounded bg-stone-200/70" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-stone-200/80" />
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-stone-200/70" />
        ))}
      </div>
    </div>
  );
}
