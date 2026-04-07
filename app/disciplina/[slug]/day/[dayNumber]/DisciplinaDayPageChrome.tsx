import Link from "next/link";

type Props = {
  slug: string;
  dayNumber: number;
  disciplineTitle: string | null;
  scheduleCalendarDateLabel: string | null;
  pathProgress: { remaining: number } | null;
  userName: string | null;
};

export default function DisciplinaDayPageChrome({
  slug,
  dayNumber,
  disciplineTitle,
  scheduleCalendarDateLabel,
  pathProgress,
  userName,
}: Props) {
  const backLabel = disciplineTitle ?? slug;

  return (
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
  );
}
