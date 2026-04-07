"use client";

import Link from "next/link";
import Footer from "@/app/components/Footer";
import DayMessagesMarkdown from "./DayMessagesMarkdown";
import DayBlocks from "./DayBlocks";
import DayChatSection from "@/app/disciplina/[slug]/day/[dayNumber]/DayChatSection";
import type { DayContentSegment } from "@/app/utils/disciplineDayContent";
import type { DayPagePathProgress } from "@/app/utils/disciplinePathProgress";
import { messageScheduleCaption } from "@/app/utils/messageScheduleCaption";

type Props = {
  slug: string;
  dayNumber: number;
  disciplineId: string;
  disciplineTitle: string | null;
  segments: DayContentSegment[];
  pathProgress: DayPagePathProgress | null;
  /** Data calendario del giorno nel piano (UTC), come su pagina disciplina */
  scheduleCalendarDateLabel: string | null;
  userName: string | null;
};

export default function DisciplinaDayPageClient({
  slug,
  dayNumber,
  disciplineId,
  disciplineTitle,
  segments,
  pathProgress,
  scheduleCalendarDateLabel,
  userName,
}: Props) {
  const backLabel = disciplineTitle ?? slug;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="mx-auto max-w-2xl px-1 py-10 sm:py-14 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-6 sm:mb-12 sm:gap-8">
          <Link
            href={`/disciplina/${encodeURIComponent(slug)}`}
            className="self-start text-base font-semibold leading-snug tracking-tight text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300 sm:text-lg"
          >
            ← {backLabel}
          </Link>
          <div className="flex flex-col items-center gap-1">
            {scheduleCalendarDateLabel ? (
              <p
                className="text-center text-[11px] font-normal tracking-normal text-zinc-400 dark:text-zinc-500 sm:text-xs"
                aria-label={`Data nel piano: ${scheduleCalendarDateLabel}`}
              >
                {scheduleCalendarDateLabel}
              </p>
            ) : null}
            <h1
              className="text-center text-4xl font-bold leading-none tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50 sm:text-5xl md:text-6xl"
              aria-label={`Giorno ${dayNumber}`}
            >
              GIORNO #{dayNumber}
            </h1>
            {pathProgress ? (
              <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                {pathProgress.remaining > 0 ? (
                  pathProgress.remaining === 1 ? (
                    <>
                      ti manca 1 giorno
                      {userName ? `, ${userName}` : ""}
                    </>
                  ) : (
                    <>
                      ti mancano {pathProgress.remaining} giorni
                      {userName ? `, ${userName}` : ""}
                    </>
                  )
                ) : (
                  <>
                    Percorso completato
                    {userName ? `, ${userName}` : ""}
                  </>
                )}
              </p>
            ) : null}
          </div>
        </header>

        {segments.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            Nessun testo per questo giorno.
          </p>
        ) : (
          <div className="space-y-8">
            {segments.map((seg) => {
              const caption = messageScheduleCaption(
                seg.isSent,
                seg.sendTimeUtc,
                seg.sentAt
              );
              return (
                <div key={seg.id} className="space-y-4">
                  {/* Box messaggio */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-6">
                    {caption ? (
                      <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
                        {caption}
                      </p>
                    ) : null}
                    <DayMessagesMarkdown source={seg.text} />
                  </div>
                  {/* Blocchi extra fuori dal box */}
                  <DayBlocks
                    messageScheduleId={seg.id}
                    blocks={seg.blocks}
                    initialResponses={seg.responses}
                  />
                </div>
              );
            })}
          </div>
        )}
        <DayChatSection disciplineId={disciplineId} dayNumber={dayNumber} />
      </div>

      <Footer />
    </div>
  );
}
