"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DayMessagesMarkdown from "./DayMessagesMarkdown";
import DayPageSkeleton from "./DayPageSkeleton";

type Segment = { id: string; text: string };

type Props = {
  slug: string;
  dayNumber: number;
};

export default function DisciplinaDayPageClient({ slug, dayNumber }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [disciplineTitle, setDisciplineTitle] = useState<string | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");

    void (async () => {
      const res = await fetch(
        `/api/disciplines/day-content?slug=${encodeURIComponent(slug)}&day=${dayNumber}`
      );
      if (cancelled) return;

      if (res.status === 401) {
        router.replace("/");
        return;
      }

      if (res.status === 404) {
        setPhase("error");
        return;
      }

      if (!res.ok) {
        setPhase("error");
        return;
      }

      const data = (await res.json()) as {
        disciplineTitle?: string | null;
        segments?: Segment[];
      };
      if (cancelled) return;

      setDisciplineTitle(data.disciplineTitle ?? null);
      setSegments(Array.isArray(data.segments) ? data.segments : []);
      setPhase("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, dayNumber, router]);

  if (phase === "loading") {
    return <DayPageSkeleton slug={slug} dayNumber={dayNumber} />;
  }

  if (phase === "error") {
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
