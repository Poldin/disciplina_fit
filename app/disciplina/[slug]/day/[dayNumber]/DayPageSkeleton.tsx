import type { DayPageShellPrefill } from "@/app/utils/dayPageShellMemory";
import DisciplinaDayPageChrome from "./DisciplinaDayPageChrome";

export default function DayPageSkeleton({
  slug,
  dayNumber,
  shell,
}: {
  slug: string;
  dayNumber: number;
  /** Dati già noti dalla pagina disciplina (timeline); evita header “vuoto” durante il fetch RSC. */
  shell: DayPageShellPrefill | null;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="mx-auto max-w-2xl px-1 py-10 sm:py-14 sm:px-6 lg:px-8">
        <DisciplinaDayPageChrome
          slug={slug}
          dayNumber={dayNumber}
          disciplineTitle={shell?.disciplineTitle ?? null}
          scheduleCalendarDateLabel={shell?.scheduleCalendarDateLabel ?? null}
          pathProgress={
            shell?.pathProgressRemaining != null
              ? { remaining: shell.pathProgressRemaining }
              : null
          }
          userName={shell?.userName ?? null}
        />
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
