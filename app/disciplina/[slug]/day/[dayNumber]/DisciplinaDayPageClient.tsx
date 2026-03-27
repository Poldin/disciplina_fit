"use client";

import Link from "next/link";
import DayMessagesMarkdown from "./DayMessagesMarkdown";

type Segment = { id: string; text: string };

type Props = {
  slug: string;
  dayNumber: number;
  disciplineTitle: string | null;
  segments: Segment[];
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
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
          <Link
            href={`/disciplina/${encodeURIComponent(slug)}`}
            className="hover:text-zinc-800 dark:hover:text-zinc-200 underline-offset-2 hover:underline"
          >
            ← {backLabel}
          </Link>
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-8">
          Giorno {dayNumber}
        </h1>
        <div className="space-y-10 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-6 sm:p-8 shadow-sm">
          {segments.length === 0 ? (
            <p className="text-zinc-600 dark:text-zinc-400">
              Nessun testo per questo giorno.
            </p>
          ) : (
            segments.map((seg, i) => (
              <div
                key={seg.id}
                className={
                  i > 0
                    ? "pt-10 border-t border-zinc-200 dark:border-zinc-800"
                    : undefined
                }
              >
                <DayMessagesMarkdown source={seg.text} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
