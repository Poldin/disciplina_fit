import Link from "next/link";

type Props = { slug: string };

/** Giorno assente, disciplina sconosciuta o nessun percorso attivo (stesso messaggio della vecchia fetch client). */
export default function DisciplinaDayUnavailable({ slug }: Props) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="mx-auto max-w-2xl px-1 py-10 sm:py-14 sm:px-6 lg:px-8">
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
          <Link
            href={`/disciplina/${encodeURIComponent(slug)}`}
            className="hover:text-zinc-800 dark:hover:text-zinc-200 underline-offset-2 hover:underline"
          >
            ← {slug}
          </Link>
        </p>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          Pagina non disponibile
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
          Questo giorno non è disponibile o non fa parte del tuo percorso attivo.
        </p>
      </div>
    </div>
  );
}
