import Link from "next/link";
import Footer from "@/app/components/Footer";

type Props = { slug: string; dayNumber: number };

/** Giorno assente, disciplina sconosciuta o nessun percorso attivo (stesso messaggio della vecchia fetch client). */
export default function DisciplinaDayUnavailable({ slug, dayNumber }: Props) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="mx-auto max-w-2xl px-1 py-10 sm:py-14 sm:px-6 lg:px-8">
        <header className="mb-10 flex flex-col gap-6 sm:mb-12 sm:gap-8">
          <Link
            href={`/disciplina/${encodeURIComponent(slug)}`}
            className="self-start text-base font-semibold leading-snug tracking-tight text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300 sm:text-lg"
          >
            ← {slug}
          </Link>
          <h1
            className="text-center text-4xl font-bold leading-none tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50 sm:text-5xl md:text-6xl"
            aria-label={`Giorno ${dayNumber}`}
          >
            GIORNO {dayNumber}
          </h1>
        </header>
        <h2 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Pagina non disponibile
        </h2>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Questo giorno non è disponibile o non fa parte del tuo percorso attivo.
        </p>
      </div>

      <Footer />
    </div>
  );
}
