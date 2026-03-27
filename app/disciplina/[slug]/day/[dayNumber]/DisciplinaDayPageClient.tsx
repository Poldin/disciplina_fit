"use client";

import Link from "next/link";
import DayMessagesMarkdown from "./DayMessagesMarkdown";
import type { DayContentSegment } from "@/app/utils/disciplineDayContent";
import type { DayPagePathProgress } from "@/app/utils/disciplinePathProgress";
import { messageScheduleCaption } from "@/app/utils/messageScheduleCaption";

type Props = {
  slug: string;
  dayNumber: number;
  disciplineTitle: string | null;
  segments: DayContentSegment[];
  pathProgress: DayPagePathProgress | null;
};

export default function DisciplinaDayPageClient({
  slug,
  dayNumber,
  disciplineTitle,
  segments,
  pathProgress,
}: Props) {
  const backLabel = disciplineTitle ?? slug;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="mx-auto max-w-2xl px-1 py-10 sm:py-14 sm:px-6 lg:px-8">
        <header className="mb-10 flex flex-col gap-6 sm:mb-12 sm:gap-8">
          <Link
            href={`/disciplina/${encodeURIComponent(slug)}`}
            className="self-start text-base font-semibold leading-snug tracking-tight text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300 sm:text-lg"
          >
            ← {backLabel}
          </Link>
          <h1
            className="text-center text-4xl font-bold leading-none tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50 sm:text-5xl md:text-6xl"
            aria-label={`Giorno ${dayNumber}`}
          >
            GIORNO {dayNumber}
          </h1>

          {pathProgress ? (
            <div
              className="space-y-2 overflow-visible"
              role="group"
              aria-label={
                pathProgress.currentOrdinal != null
                  ? `Avanzamento: ${pathProgress.completed} su ${pathProgress.total} giorni con invio effettuato. Questo giorno è il ${pathProgress.currentOrdinal}-esimo passo su ${pathProgress.total}.`
                  : `Avanzamento: ${pathProgress.completed} su ${pathProgress.total} giorni con invio effettuato. Giorno ${dayNumber} rispetto a ${pathProgress.total} passi nel percorso.`
              }
            >
              <div className="flex flex-col gap-1.5 text-xs sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-6 sm:gap-y-1">
                <p className="text-zinc-600 dark:text-zinc-400">
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                    {pathProgress.completed}
                  </span>
                  {" di "}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {pathProgress.total}
                  </span>
                  {" giorni con invio effettuato"}
                </p>
                <p className="text-zinc-500 dark:text-zinc-500">
                  {pathProgress.currentOrdinal != null ? (
                    <>
                      Questo giorno:{" "}
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {pathProgress.currentOrdinal}
                      </span>
                      {" di "}
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {pathProgress.total}
                      </span>
                    </>
                  ) : (
                    <>
                      Giorno {dayNumber}
                      {" · "}
                      {pathProgress.total} passi nel percorso
                    </>
                  )}
                </p>
              </div>
              <div className="relative h-2 w-full">
                <div className="absolute inset-0 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                <div
                  className="absolute left-0 top-0 h-2 rounded-full bg-emerald-500 dark:bg-emerald-500"
                  style={{ width: `${pathProgress.completedPct}%` }}
                />
                <div
                  className="absolute top-1/2 z-10 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white dark:bg-white"
                  style={{ left: `${pathProgress.markerPct}%` }}
                />
              </div>
            </div>
          ) : null}
        </header>

        {segments.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            Nessun testo per questo giorno.
          </p>
        ) : (
          <div className="space-y-4">
            {segments.map((seg) => {
              const caption = messageScheduleCaption(
                seg.isSent,
                seg.sendTimeUtc,
                seg.sentAt
              );
              return (
                <div
                  key={seg.id}
                  className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-6"
                >
                  {caption ? (
                    <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
                      {caption}
                    </p>
                  ) : null}
                  <DayMessagesMarkdown source={seg.text} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
