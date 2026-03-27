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
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
          <Link
            href={`/disciplina/${encodeURIComponent(slug)}`}
            className="hover:text-zinc-800 dark:hover:text-zinc-200 underline-offset-2 hover:underline"
          >
            ← Torna alla disciplina
          </Link>
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-8">
          Giorno {dayNumber}
        </h1>
        <div className="space-y-10 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-6 sm:p-8 shadow-sm">
          <div className="space-y-3" aria-hidden>
            <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-[92%] animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-[88%] animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-[70%] animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
