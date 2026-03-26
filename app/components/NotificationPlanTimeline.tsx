"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/components/AuthProvider";
import { listNotificationPlanDayPreviews } from "@/app/utils/notificationPlanDisplay";

type Props = {
  disciplineSlug: string;
  disciplineId: string;
  notificationPlan: unknown;
  /** Utente iscritto a questa disciplina con link attivo */
  joined: boolean;
};

export default function NotificationPlanTimeline({
  disciplineSlug,
  disciplineId,
  notificationPlan,
  joined,
}: Props) {
  const { user } = useAuth();
  const days = useMemo(
    () => listNotificationPlanDayPreviews(notificationPlan),
    [notificationPlan]
  );
  const [sentDayNumbers, setSentDayNumbers] = useState<number[]>([]);

  useEffect(() => {
    if (!user || !joined) {
      setSentDayNumbers([]);
      return;
    }
    let cancelled = false;
    void fetch(
      `/api/disciplines/sent-days?disciplineId=${encodeURIComponent(disciplineId)}`
    )
      .then((res) => res.json())
      .then((data: { sentDayNumbers?: number[] }) => {
        if (!cancelled) setSentDayNumbers(data.sentDayNumbers ?? []);
      })
      .catch(() => {
        if (!cancelled) setSentDayNumbers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user, joined, disciplineId]);

  if (days.length === 0) return null;

  const unlocked = new Set(sentDayNumbers);
  const base = `/disciplina/${encodeURIComponent(disciplineSlug)}/day`;

  return (
    <section
      className="mt-16 pt-12 border-t border-zinc-200 dark:border-zinc-800"
      aria-label="Percorso giornaliero"
    >
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
        Il tuo percorso
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-8">
        Ogni giorno apre un messaggio quando almeno una notifica di quel giorno è
        stata inviata.
      </p>

      <div className="relative">
        <div
          className="absolute left-[15px] top-3 bottom-3 z-0 w-px bg-zinc-200 dark:bg-zinc-700 sm:left-[19px]"
          aria-hidden
        />
        <ul className="space-y-0">
          {days.map(({ dayNumber, preview }) => {
            const open = unlocked.has(dayNumber);
            const href = `${base}/${dayNumber}`;

            const inner = (
              <>
                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-zinc-200 bg-white text-xs font-bold text-zinc-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200 sm:h-10 sm:w-10 sm:text-sm">
                  {dayNumber}
                </div>
                <div className="min-w-0 flex-1 pt-0.5 sm:pt-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1">
                    Giorno {dayNumber}
                  </p>
                  {preview ? (
                    <p
                      className={`text-sm leading-relaxed ${open ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-500 dark:text-zinc-500"}`}
                    >
                      {preview}
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-400 dark:text-zinc-600 italic">
                      Nessun testo in anteprima
                    </p>
                  )}
                  {!open && (
                    <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                      Si apre dopo il primo invio del giorno
                    </p>
                  )}
                </div>
              </>
            );

            return (
              <li key={dayNumber} className="relative flex gap-4 pb-10 sm:gap-5">
                {open ? (
                  <Link
                    href={href}
                    className="group flex flex-1 gap-4 rounded-xl p-3 -m-3 transition-colors hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 sm:gap-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-500"
                  >
                    {inner}
                    <span
                      className="self-center text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 shrink-0"
                      aria-hidden
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </span>
                  </Link>
                ) : (
                  <div className="flex flex-1 gap-4 opacity-75 sm:gap-5 cursor-not-allowed p-3 -m-3">
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
