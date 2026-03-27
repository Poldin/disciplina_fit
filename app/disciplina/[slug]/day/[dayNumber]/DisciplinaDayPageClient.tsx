"use client";

import Link from "next/link";
import DayMessagesMarkdown from "./DayMessagesMarkdown";
import type { DayContentSegment } from "@/app/utils/disciplineDayContent";
import { messageScheduleCaption } from "@/app/utils/messageScheduleCaption";

type Props = {
  slug: string;
  dayNumber: number;
  disciplineTitle: string | null;
  segments: DayContentSegment[];
};

export default function DisciplinaDayPageClient({
  slug,
  dayNumber,
  disciplineTitle,
  segments,
}: Props) {
  const backLabel = disciplineTitle ?? slug;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="mx-auto max-w-2xl px-1 py-10 sm:py-14 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <Link
            href={`/disciplina/${encodeURIComponent(slug)}`}
            className="min-w-0 self-start text-xl font-bold leading-snug tracking-tight text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50 sm:self-auto sm:text-2xl sm:leading-tight"
          >
            ← {backLabel}
          </Link>
          <span
            className="inline-flex w-fit shrink-0 items-baseline gap-2 self-center rounded-full border border-zinc-300 bg-zinc-100 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 sm:self-auto"
            aria-label={`Giorno ${dayNumber}`}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Giorno
            </span>
            <span className="text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50 sm:text-2xl">
              {dayNumber}
            </span>
          </span>
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
