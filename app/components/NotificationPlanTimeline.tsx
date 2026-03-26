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
                <div
                  className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold sm:h-10 sm:w-10 sm:text-sm ${
                    open
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-100"
                      : "border-zinc-200 bg-white text-zinc-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200"
                  }`}
                >
                  {dayNumber}
                </div>
                <div className="min-w-0 flex-1 pt-0.5 sm:pt-1">
                  {open ? (
                    <span className="mb-2 inline-flex items-center rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-semibold tracking-wide text-zinc-900 dark:bg-zinc-200 dark:text-zinc-900">
                      Giorno {dayNumber}
                    </span>
                  ) : (
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Giorno {dayNumber}
                    </p>
                  )}
                  {preview ? (
                    <p
                      className={`text-sm leading-relaxed ${open ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-500 dark:text-zinc-500"}`}
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
                    className="group flex flex-1 gap-4 rounded-xl border border-transparent p-3 -m-3 transition-all hover:border-emerald-200/90 hover:bg-emerald-50/70 hover:shadow-sm dark:hover:border-emerald-500/25 dark:hover:bg-emerald-950/35 sm:gap-5 focus:outline-none focus-visible:border-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-400/60 dark:focus-visible:border-emerald-500/40 dark:focus-visible:ring-emerald-500/40"
                  >
                    {inner}
                    <span
                      className="self-center text-emerald-600 group-hover:text-emerald-700 dark:text-emerald-400 dark:group-hover:text-emerald-300 shrink-0"
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
                  <div className="flex flex-1 gap-4 cursor-not-allowed p-3 -m-3 opacity-70 sm:gap-5">
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
