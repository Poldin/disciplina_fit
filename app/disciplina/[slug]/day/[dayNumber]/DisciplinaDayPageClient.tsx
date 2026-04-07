"use client";

import { useEffect } from "react";
import Footer from "@/app/components/Footer";
import DayMessagesMarkdown from "./DayMessagesMarkdown";
import DayBlocks from "./DayBlocks";
import DayChatSection from "@/app/disciplina/[slug]/day/[dayNumber]/DayChatSection";
import DisciplinaDayPageChrome from "./DisciplinaDayPageChrome";
import type { DayContentSegment } from "@/app/utils/disciplineDayContent";
import type { DayPagePathProgress } from "@/app/utils/disciplinePathProgress";
import { clearDayPageShellPrefill } from "@/app/utils/dayPageShellMemory";
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
  useEffect(() => {
    clearDayPageShellPrefill(slug, dayNumber);
  }, [slug, dayNumber]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="mx-auto max-w-2xl px-1 py-10 sm:py-14 sm:px-6 lg:px-8">
        <DisciplinaDayPageChrome
          slug={slug}
          dayNumber={dayNumber}
          disciplineTitle={disciplineTitle}
          scheduleCalendarDateLabel={scheduleCalendarDateLabel}
          pathProgress={pathProgress}
          userName={userName}
        />

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
