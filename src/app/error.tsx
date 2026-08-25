"use client";

/**
 * App-level error boundary: a database or upstream outage renders a calm,
 * branded message with a retry, instead of Next's raw "Application error"
 * digest. Server components that throw (e.g. Postgres down) land here.
 */
export default function AppError({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-4xl">🛠️</p>
      <h1 className="mt-4 text-xl font-semibold text-stone-900">
        This page hit a temporary problem
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-600">
        A data source did not respond. The mirrors refresh automatically, so
        this usually clears in a moment.
      </p>
      <button
        onClick={() => reset()}
        className="mt-6 rounded-lg bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-800 ring-1 ring-inset ring-amber-500/30 transition hover:bg-amber-500/25"
      >
        Try again
      </button>
    </div>
  );
}
