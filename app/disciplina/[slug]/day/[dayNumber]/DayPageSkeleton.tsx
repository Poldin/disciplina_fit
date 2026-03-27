import Link from "next/link";

export default function DayPageSkeleton({
  slug,
  dayNumber,
}: {
  slug: string;
  dayNumber: number;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="mx-auto max-w-2xl px-1 py-10 sm:py-14 sm:px-6 lg:px-8">
        <header className="mb-10 flex flex-col gap-6 sm:mb-12 sm:gap-8">
          <Link
            href={`/disciplina/${encodeURIComponent(slug)}`}
            className="self-start text-base font-semibold leading-snug tracking-tight text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300 sm:text-lg"
          >
            ← indietro
          </Link>
          <div
            className="text-center text-4xl font-bold leading-none tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50 sm:text-5xl md:text-6xl"
            aria-hidden
          >
            GIORNO {dayNumber}
          </div>
          <div
            className="mx-auto h-3 w-48 max-w-[90%] animate-pulse rounded bg-zinc-200 dark:bg-zinc-800"
            aria-hidden
          />
        </header>
        <div className="space-y-4" aria-hidden>
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-6"
            >
              <div className="mb-4 h-3 w-44 max-w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="space-y-3">
                <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-[92%] animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-[88%] animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
