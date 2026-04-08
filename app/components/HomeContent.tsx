"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Header from "./Header";
import LoginDialog from "./LoginDialog";
import Footer from "./Footer";
import { useAuth } from "./AuthProvider";
import { useActiveDiscipline } from "@/app/hooks/useActiveDiscipline";
import type { Discipline } from "@/app/utils/types";
import { computeJoinedPathProgress } from "@/app/utils/disciplinePathProgress";
import { formatScheduleDayDateItShort } from "@/app/utils/scheduleDayUnlock";
import { isSubscriptionRequired } from "@/app/utils/subscriptionRequired";

interface HomeContentProps {
  disciplines: Discipline[];
}

type CompletionDialogData = {
  id: number;
  discipline_id: string;
  completed_at: string | null;
  disciplines:
    | {
        title: string | null;
        slug: string;
        img_url: string | null;
      }
    | {
        title: string | null;
        slug: string;
        img_url: string | null;
      }[]
    | null;
};

type CompletionBadgeData = {
  id: number;
  completed_at: string | null;
  disciplines:
    | {
        title: string | null;
        slug: string;
        img_url: string | null;
      }
    | {
        title: string | null;
        slug: string;
        img_url: string | null;
      }[]
    | null;
};

type DisciplineReviewSummary = {
  count: number;
  avgRating: number | null;
};

export default function HomeContent({ disciplines }: HomeContentProps) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [sentDayNumbers, setSentDayNumbers] = useState<number[]>([]);
  /** Primo invio giorno 1 (UTC), stesso criterio della timeline disciplina */
  const [pathStartIso, setPathStartIso] = useState<string | null>(null);
  const [completionDialog, setCompletionDialog] = useState<CompletionDialogData | null>(null);
  const [isClosingCompletionDialog, setIsClosingCompletionDialog] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [completedAtBySlug, setCompletedAtBySlug] = useState<Record<string, string>>({});
  const [selectedBadge, setSelectedBadge] = useState<{
    title: string;
    completedAt: string;
    imgUrl: string | null;
  } | null>(null);
  const [reviewSummaryByDisciplineId, setReviewSummaryByDisciplineId] = useState<
    Record<string, DisciplineReviewSummary>
  >({});
  const { user, subscriptionInfo, refreshSubscription } = useAuth();
  const { activeDiscipline, activeDisciplineId } = useActiveDiscipline(user?.id);

  const joinedDisciplineIds = useMemo(
    () => (activeDisciplineId ? new Set([activeDisciplineId]) : new Set<string>()),
    [activeDisciplineId]
  );

  const activeProgress = useMemo(() => {
    if (!activeDiscipline) return null;
    return computeJoinedPathProgress(
      activeDiscipline.notification_plan,
      activeDiscipline.lenght_days,
      sentDayNumbers
    );
  }, [activeDiscipline, sentDayNumbers]);
  const activeDisciplineCompletedAt = activeDiscipline
    ? completedAtBySlug[activeDiscipline.slug]
    : undefined;
  const hasPastCompletionWhileActive =
    Boolean(activeDisciplineCompletedAt) &&
    Boolean(pathStartIso) &&
    new Date(activeDisciplineCompletedAt as string).getTime() <
      new Date(pathStartIso as string).getTime();

  // Pulisce l'URL dopo il ritorno da Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success" || checkout === "cancel") {
      refreshSubscription();
      window.history.replaceState({}, "", "/");
    }
  }, [refreshSubscription]);

  useEffect(() => {
    if (!user || !activeDiscipline) {
      setSentDayNumbers([]);
      setPathStartIso(null);
      return;
    }
    let cancelled = false;
    void fetch(
      `/api/disciplines/sent-days?disciplineId=${encodeURIComponent(activeDiscipline.id)}`
    )
      .then((res) => res.json())
      .then(
        (data: {
          sentDayNumbers?: number[];
          dayFirstSendUtc?: Record<string, string>;
        }) => {
          if (cancelled) return;
          setSentDayNumbers(data.sentDayNumbers ?? []);
          const d1 = data.dayFirstSendUtc?.["1"];
          setPathStartIso(typeof d1 === "string" && d1 ? d1 : null);
        }
      )
      .catch(() => {
        if (!cancelled) {
          setSentDayNumbers([]);
          setPathStartIso(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, activeDiscipline?.id]);

  useEffect(() => {
    if (!user) {
      setCompletionDialog(null);
      return;
    }
    let cancelled = false;
    void fetch("/api/disciplines/completion-unseen")
      .then((res) => res.json())
      .then((data: { completion?: CompletionDialogData | null }) => {
        if (cancelled) return;
        setCompletionDialog(data.completion ?? null);
      })
      .catch(() => {
        if (!cancelled) setCompletionDialog(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (disciplines.length === 0) {
      setReviewSummaryByDisciplineId({});
      return;
    }
    let cancelled = false;
    void Promise.all(
      disciplines.map(async (discipline) => {
        const res = await fetch(
          `/api/disciplines/reviews?disciplineId=${encodeURIComponent(discipline.id)}`
        );
        const data = (await res.json()) as {
          summary?: { count?: number; avgRating?: number | null };
        };
        return {
          id: discipline.id,
          summary: {
            count: Number(data.summary?.count ?? 0),
            avgRating:
              typeof data.summary?.avgRating === "number"
                ? Number(data.summary.avgRating)
                : null,
          } satisfies DisciplineReviewSummary,
        };
      })
    )
      .then((rows) => {
        if (cancelled) return;
        const next: Record<string, DisciplineReviewSummary> = {};
        for (const row of rows) {
          next[row.id] = row.summary;
        }
        setReviewSummaryByDisciplineId(next);
      })
      .catch(() => {
        if (!cancelled) setReviewSummaryByDisciplineId({});
      });
    return () => {
      cancelled = true;
    };
  }, [disciplines]);

  useEffect(() => {
    if (!completionDialog) {
      setReviewRating(0);
      setReviewComment("");
      setReviewError(null);
      return;
    }
    setReviewRating(5);
    setReviewComment("");
    setReviewError(null);
  }, [completionDialog?.id]);

  useEffect(() => {
    if (!user) {
      setCompletedAtBySlug({});
      return;
    }
    let cancelled = false;
    void fetch("/api/user/completions")
      .then((res) => res.json())
      .then((data: { completions?: CompletionBadgeData[] }) => {
        if (cancelled) return;
        const nextMap: Record<string, string> = {};
        for (const row of data.completions ?? []) {
          const disc = Array.isArray(row.disciplines)
            ? row.disciplines[0]
            : row.disciplines;
          if (!disc?.slug || !row.completed_at) continue;
          nextMap[disc.slug] = row.completed_at;
        }
        setCompletedAtBySlug(nextMap);
      })
      .catch(() => {
        if (!cancelled) setCompletedAtBySlug({});
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleCloseCompletionDialog = async () => {
    if (!completionDialog) return;
    setIsClosingCompletionDialog(true);
    try {
      await fetch("/api/disciplines/completion-seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId: completionDialog.id }),
      });
      setCompletionDialog(null);
    } finally {
      setIsClosingCompletionDialog(false);
    }
  };

  const handleSubmitCompletionReview = async () => {
    if (!completionDialog) return;
    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      setReviewError("Seleziona un voto da 1 a 5 stelle.");
      return;
    }
    setIsClosingCompletionDialog(true);
    setReviewError(null);
    try {
      const reviewRes = await fetch("/api/disciplines/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkId: completionDialog.id,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      if (!reviewRes.ok) {
        const data = await reviewRes.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" ? data.error : "Impossibile salvare la valutazione"
        );
      }
      await fetch("/api/disciplines/completion-seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId: completionDialog.id }),
      });
      setCompletionDialog(null);
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Errore imprevisto");
    } finally {
      setIsClosingCompletionDialog(false);
    }
  };

  const handleShareBadge = async (title: string) => {
    const text = `Ho completato "${title}" su disciplinaFIT.`;
    const url = typeof window !== "undefined" ? window.location.origin : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Badge ottenuto", text, url });
      } else {
        await navigator.clipboard?.writeText(`${text} ${url}`.trim());
        alert("Messaggio copiato negli appunti!");
      }
    } catch {
      // no-op
    }
  };

  // Gestisce il click su "Abbonati" dalla home (checkout Stripe)
  const handleSubscribe = async () => {
    setIsLoadingPortal(true);
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore nella creazione del pagamento");
      }

      // Redirect a Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Errore nel caricamento del pagamento. Riprova.");
      setIsLoadingPortal(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <Header onLoginClick={() => setIsLoginOpen(true)} />

      {/* Disciplina attiva */}
      {user && subscriptionInfo?.hasAccess && activeDiscipline && (
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="max-w-7xl mx-auto px-1 sm:px-6 lg:px-8 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
              in corso
            </p>
            <Link
              href={`/disciplina/${activeDiscipline.slug}`}
              className="group block rounded-xl -mx-1 px-1 py-1 transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900"
            >
              <div className="flex items-center gap-4">
                {activeDiscipline.img_url ? (
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700">
                    <img
                      src={activeDiscipline.img_url}
                      alt={activeDiscipline.title || "Disciplina"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-linear-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 shrink-0"></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 group-hover:underline truncate">
                    {activeDiscipline.title}
                  </p>
                  {activeProgress ? (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                      {hasPastCompletionWhileActive && activeProgress.remaining === 0 ? (
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          percorso gia completato in passato · nuova versione in corso
                        </span>
                      ) : (
                        <>
                          <span className="font-medium text-emerald-700 dark:text-emerald-400">
                            {activeProgress.completed}
                          </span>
                          {" di "}
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            {activeProgress.total}
                          </span>
                          {" giorni sbloccati"}
                          {activeProgress.remaining > 0 ? (
                            <>
                              {" · "}
                              <span className="text-zinc-500 dark:text-zinc-500">
                                ne mancano {activeProgress.remaining}
                              </span>
                            </>
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                              {" · "}
                              percorso completato
                            </span>
                          )}
                        </>
                      )}
                    </p>
                  ) : null}
                  {activeProgress && pathStartIso ? (
                    <p className="text-[11px] font-normal tracking-normal text-zinc-400 dark:text-zinc-500 mt-1 sm:text-xs">
                      Partenza · {formatScheduleDayDateItShort(pathStartIso)}
                    </p>
                  ) : null}
                  {!activeProgress && activeDiscipline.lenght_days ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {activeDiscipline.lenght_days} giorni
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="hidden sm:inline-block px-3 py-1 text-xs font-medium rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-600/40">
                    In corso
                  </span>
                  <svg
                    className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-50 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {activeProgress && (
                <div className="mt-4 pl-0 sm:pl-18 space-y-2">
                  <div
                    className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={activeProgress.pct}
                    aria-label={`Percorso: ${activeProgress.pct} percento`}
                  >
                    <div
                      className="h-full rounded-full bg-emerald-500 dark:bg-emerald-500 transition-[width] duration-300 ease-out"
                      style={{ width: `${activeProgress.pct}%` }}
                    />
                  </div>
                </div>
              )}
            </Link>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-1 sm:px-6 lg:px-8 py-12">
        {/* Section Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Prenditi cura di te, con disciplina.
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-2">
            Prendersi cura di sé, del proprio equilibrio, richiede scelte da perseguire nel tempo con disciplina.
          </p>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Scegli la disciplina che risuona in te e trasforma i tuoi obiettivi in abitudini quotidiane. Non mollare!
          </p>
        </div>

        {/* Discipline Cards Grid */}
        <div id="discipline-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {disciplines.map((discipline) => {
            const completedAt = completedAtBySlug[discipline.slug];
            const reviewSummary = reviewSummaryByDisciplineId[discipline.id];
            return (
              <Link
                key={discipline.id}
                href={`/disciplina/${discipline.slug}`}
                className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:scale-[1.02] cursor-pointer"
              >
              {/* Card Header - Immagine o gradient */}
              {discipline.img_url ? (
                <div className="h-80 overflow-hidden">
                  <img
                    src={discipline.img_url}
                    alt={discipline.title || "Disciplina"}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-80 bg-linear-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900"></div>
              )}
              
              {/* Card Body */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                    {discipline.title}
                  </h3>
                  {/* Tag nascosto temporaneamente */}
                  {/* {discipline.tag && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      {discipline.tag}
                    </span>
                  )} */}
                </div>
                
                <p className="text-zinc-600 dark:text-zinc-400 mb-4 text-sm">
                  {discipline.short_desc}
                </p>
                <p className="mb-4 text-xs text-zinc-600 dark:text-zinc-400">
                  {reviewSummary && reviewSummary.count > 0 ? (
                    <>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {reviewSummary.avgRating?.toFixed(1)}
                      </span>
                      {" / 5 · "}
                      {reviewSummary.count} recensioni
                    </>
                  ) : (
                    "0 recensioni"
                  )}
                </p>
                {completedAt ? (
                  <p
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedBadge({
                        title: discipline.title ?? "Percorso completato",
                        completedAt,
                        imgUrl: discipline.img_url ?? null,
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedBadge({
                          title: discipline.title ?? "Percorso completato",
                          completedAt,
                          imgUrl: discipline.img_url ?? null,
                        });
                      }
                    }}
                    className="mb-4 text-xs font-medium text-emerald-700 dark:text-emerald-400 underline underline-offset-2"
                  >
                    Badge vinto il {new Date(completedAt).toLocaleDateString("it-IT")}
                  </p>
                ) : null}
                
                <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-500 mb-4">
                  {discipline.lenght_days && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {discipline.lenght_days} giorni
                    </span>
                  )}
                  {discipline.subscribers != null && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {discipline.subscribers.toLocaleString()} partecipanti
                    </span>
                  )}
                </div>
                
                <button className={`w-full py-2 font-medium rounded-lg transition-colors duration-200 ${
                  joinedDisciplineIds.has(discipline.id)
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-600/40"
                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-50"
                }`}>
                  {joinedDisciplineIds.has(discipline.id)
                    ? "In esecuzione"
                    : completedAt
                      ? "Badge ottenuto"
                      : "Partecipa"}
                </button>
              </div>
              </Link>
            );
          })}
        </div>

        {/* Messaggio se non ci sono discipline */}
        {disciplines.length === 0 && (
          <div className="text-center py-16">
            <p className="text-xl text-zinc-500 dark:text-zinc-400">
              Nessuna disciplina disponibile al momento.
            </p>
            <p className="text-zinc-400 dark:text-zinc-500 mt-2">
              Torna presto per scoprire nuove sfide!
            </p>
          </div>
        )}

        {/* How It Works Section */}
        <div className="mt-24 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              Prenditi cura di te, con disciplina.
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto mb-6">
              Quante volte hai iniziato con entusiasmo e mollato dopo una settimana? L&apos;abbonamento in palestra inutilizzato, 
              la dieta dimenticata, la promessa di correre ogni mattina svanita. Il problema non sei tu: è che nessuno ti  
              accompagna davvero, giorno dopo giorno.
            </p>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto">
              Non serve essere degli atleti o spingersi al limite per trovare il proprio equilibrio. 
              Basta partire dalle piccole cose ed essere costanti, anche in una crescita lenta.
            </p>
          </div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* Step 1 */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-zinc-900 dark:text-zinc-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                1. Scegli una disciplina
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Esplora le nostre discipline e scegli quella che risuona con i tuoi obiettivi. Accesso illimitato a tutte le discipline.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-zinc-900 dark:text-zinc-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                2. Ricevi mail e notifiche di supporto quotidiane
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Ogni giorno ti inviamo messaggi per informarti e motivarti per tenerti sulla strada giusta e non mollare mai.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-zinc-900 dark:text-zinc-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                3. Tieni traccia del percorso
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Rispondi ogni giorno raccontandoci come è andata. Ti ritroverai in piena conoscenza di te e di come stai progredendo.
              </p>
            </div>
          </div>

          {/* Pricing / CTA */}
          <div className="text-center">
            {isSubscriptionRequired() ? (
              <>
                <div className="mb-4">
                  <span className="text-5xl font-bold text-zinc-900 dark:text-zinc-50">€4,99</span>
                  <span className="text-xl text-zinc-600 dark:text-zinc-400">/mese</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  Accesso illimitato a tutte le discipline • Notifiche e informazioni di supporto quotidiani • Cancella quando vuoi
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-6 max-w-sm mx-auto leading-relaxed">
                  Perchè devo pagare un abbonamento? Perchè chi investe, arriva fino in fondo.
                </p>
                <button
                  onClick={() => {
                    if (!user) {
                      setIsLoginOpen(true);
                      return;
                    }
                    if (!subscriptionInfo?.hasAccess) {
                      handleSubscribe();
                      return;
                    }
                  }}
                  disabled={isLoadingPortal && !!user && !subscriptionInfo?.hasAccess}
                  className="w-full sm:w-auto px-8 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingPortal && !!user && !subscriptionInfo?.hasAccess
                    ? "Caricamento..."
                    : subscriptionInfo?.hasAccess
                      ? "Abbonamento già attivo, non mollare!"
                      : "Abbonati e non mollare!"}
                </button>
              </>
            ) : (
              <>
                <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-6 max-w-xl mx-auto">
                  Accesso gratuito a tutte le discipline. Accedi, scegli un percorso e non mollare.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      setIsLoginOpen(true);
                      return;
                    }
                    document.getElementById("discipline-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="w-full sm:w-auto px-8 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                >
                  {user ? "Scegli una disciplina" : "Accedi e inizia"}
                </button>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Login Dialog */}
      <LoginDialog isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      {completionDialog && (
        <div className="fixed inset-0 z-70 bg-zinc-950/95 text-white">
          <div className="min-h-full flex flex-col items-center justify-center px-6 py-10 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300 mb-4">
              Traguardo raggiunto
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold leading-tight max-w-3xl">
              Percorso concluso.
              <br />
              Ce l&apos;hai fatta!
            </h2>
            <p className="mt-5 text-base sm:text-lg text-zinc-200 max-w-2xl">
              Hai completato{" "}
              {Array.isArray(completionDialog.disciplines)
                ? completionDialog.disciplines[0]?.title ?? "la tua disciplina"
                : completionDialog.disciplines?.title ?? "la tua disciplina"}
              . Questo traguardo resta nel tuo profilo.
            </p>
            <div className="mt-8 w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-left">
              <p className="text-sm font-semibold text-zinc-100">
                Quanto valuti questo percorso?
              </p>
              <div className="mt-3 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    disabled={isClosingCompletionDialog}
                    aria-label={`${star} stelle`}
                    className={`text-2xl transition-colors ${
                      star <= reviewRating ? "text-amber-300" : "text-zinc-600 hover:text-zinc-400"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <label className="mt-4 block text-sm text-zinc-300">
                Commento (opzionale)
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  maxLength={500}
                  disabled={isClosingCompletionDialog}
                  placeholder="Condividi la tua esperienza..."
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-hidden focus:border-emerald-500"
                  rows={4}
                />
              </label>
              {reviewError ? (
                <p className="mt-2 text-xs text-red-300">{reviewError}</p>
              ) : null}
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSubmitCompletionReview}
                disabled={isClosingCompletionDialog}
                className="px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold transition-colors disabled:opacity-60"
              >
                {isClosingCompletionDialog ? "Salvo..." : "Invia valutazione"}
              </button>
              <button
                type="button"
                onClick={handleCloseCompletionDialog}
                disabled={isClosingCompletionDialog}
                className="px-6 py-3 rounded-lg border border-zinc-600 hover:border-zinc-400 text-zinc-100 transition-colors disabled:opacity-60"
              >
                Salta
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedBadge && (
        <div className="fixed inset-0 z-70 bg-zinc-950/95 text-white">
          <div className="min-h-full flex flex-col items-center px-6 py-10 text-center">
            <div className="flex-1 w-full flex flex-col items-center justify-center">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300 mb-4">
              Badge ottenuto
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold leading-tight max-w-3xl">
              Ce l&apos;hai fatta!
            </h2>
            {selectedBadge.imgUrl ? (
              <div className="mt-6 w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden border border-emerald-500/30">
                <img
                  src={selectedBadge.imgUrl}
                  alt={selectedBadge.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : null}
            <p className="mt-5 text-base sm:text-lg text-zinc-200 max-w-2xl">
              {selectedBadge.title}
            </p>
            <p className="mt-2 text-sm text-zinc-300">
              Badge vinto il {new Date(selectedBadge.completedAt).toLocaleDateString("it-IT")}
            </p>
            </div>
            <div className="mt-8 w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleShareBadge(selectedBadge.title)}
                className="px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold transition-colors"
              >
                Condividi
              </button>
              <button
                type="button"
                onClick={() => setSelectedBadge(null)}
                className="px-6 py-3 rounded-lg border border-zinc-500 hover:border-zinc-300 text-zinc-100 font-semibold transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
