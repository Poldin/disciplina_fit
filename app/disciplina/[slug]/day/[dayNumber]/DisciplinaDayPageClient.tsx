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
              className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pathProgress.completedPct}
              aria-label={`${pathProgress.completed} su ${pathProgress.total} giorni con invio effettuato`}
            >
              <div
                className="h-full rounded-full bg-emerald-500 dark:bg-emerald-500 transition-[width] duration-300 ease-out"
                style={{ width: `${pathProgress.completedPct}%` }}
              />
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
