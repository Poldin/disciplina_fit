import Link from "next/link";

type Props = { slug: string; dayNumber: number };

/** Giorno assente, disciplina sconosciuta o nessun percorso attivo (stesso messaggio della vecchia fetch client). */
export default function DisciplinaDayUnavailable({ slug, dayNumber }: Props) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="mx-auto max-w-2xl px-1 py-10 sm:py-14 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <Link
            href={`/disciplina/${encodeURIComponent(slug)}`}
            className="min-w-0 self-start text-xl font-bold leading-snug tracking-tight text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50 sm:self-auto sm:text-2xl sm:leading-tight"
          >
            ← {slug}
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
        <h1 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Pagina non disponibile
        </h1>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Questo giorno non è disponibile o non fa parte del tuo percorso attivo.
        </p>
      </div>
    </div>
  );
}
