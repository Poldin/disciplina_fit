"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import Header from "@/app/components/Header";
import LoginDialog from "@/app/components/LoginDialog";
import SubscriptionDialog from "@/app/components/SubscriptionDialog";
import Footer from "@/app/components/Footer";
import NotificationPlanTimeline from "@/app/components/NotificationPlanTimeline";
import { useAuth } from "@/app/components/AuthProvider";
import { createClient } from "@/app/utils/supabase/client";
import {
  clearDisciplinaListScroll,
  peekDisciplinaListScroll,
} from "@/app/utils/disciplinaScrollMemory";
import {
  clearDisciplinaSessionCache,
  readJoinedFromSession,
  readSentDaysFromSession,
  writeJoinedToSession,
  writeSentDaysToSession,
} from "@/app/utils/disciplinaSessionCache";
import type { Discipline } from "@/app/utils/types";
import { computeJoinedPathProgress } from "@/app/utils/disciplinePathProgress";

/** Disciplina attiva dell'utente (diversa da quella corrente) */
type ActiveDisciplineInfo = {
  id: string;
  title: string | null;
  img_url: string | null;
  slug: string;
};
type DisciplineLinkStatus = "active" | "completed" | null;

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

type DisciplineReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_name: string;
};

interface DisciplinaContentProps {
  discipline: Discipline;
}

export default function DisciplinaContent({ discipline }: DisciplinaContentProps) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [isStopConfirmOpen, setIsStopConfirmOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [joined, setJoined] = useState(false);
  const [currentLinkStatus, setCurrentLinkStatus] = useState<DisciplineLinkStatus>(null);
  const [sentDayNumbers, setSentDayNumbers] = useState<number[]>([]);
  const [activeDiscipline, setActiveDiscipline] = useState<ActiveDisciplineInfo | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [completedLinkId, setCompletedLinkId] = useState<number | null>(null);
  const [isBadgeOpen, setIsBadgeOpen] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<{ count: number; avgRating: number | null }>({
    count: 0,
    avgRating: null,
  });
  const [publicReviews, setPublicReviews] = useState<DisciplineReview[]>([]);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewFetchLoading, setReviewFetchLoading] = useState(false);
  const [reviewHydrated, setReviewHydrated] = useState(false);
  const [lastSavedReviewKey, setLastSavedReviewKey] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const { user, subscriptionInfo, refreshSubscription } = useAuth();
  /** Disciplina attiva: descrizione lunga in fisarmonica (chiusa di default) */
  const [longDescOpen, setLongDescOpen] = useState(false);

  useEffect(() => {
    setLongDescOpen(false);
  }, [discipline.id]);

  // Ripristina scroll dopo ritorno da una pagina giorno (Next tende a portare in cima).
  useEffect(() => {
    const slug = discipline.slug;
    const y = peekDisciplinaListScroll(slug);
    if (y === null) return;

    let cancelled = false;
    let raf1 = 0;
    let raf2 = 0;
    let timeoutId = 0;

    const scrollOnly = () => {
      if (cancelled) return;
      window.scrollTo(0, y);
    };

    const scrollAndForget = () => {
      if (cancelled) return;
      window.scrollTo(0, y);
      clearDisciplinaListScroll(slug);
    };

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        scrollOnly();
        timeoutId = window.setTimeout(scrollAndForget, 0);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(timeoutId);
    };
  }, [discipline.slug]);

  // Pulisce l'URL dopo il ritorno da Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success" || checkout === "cancel") {
      refreshSubscription();
      window.history.replaceState({}, "", `/disciplina/${discipline.slug}`);
    }
  }, [discipline.slug, refreshSubscription]);

  // Controlla se l'utente è già iscritto a questa disciplina e se ha un'altra disciplina attiva
  const checkJoined = useCallback(async () => {
    if (!user) {
      setJoined(false);
      setCurrentLinkStatus(null);
      setActiveDiscipline(null);
      return;
    }

    const cached = readJoinedFromSession(user.id, discipline.id);
    if (cached) {
      setJoined(cached.joined);
      setActiveDiscipline(cached.activeDiscipline);
    }

    const supabase = createClient();

    // Controlla se è iscritto a QUESTA disciplina
    const { data: thisJoined } = await supabase
      .from("link_user_disciplines")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("discipline_id", discipline.id)
      .in("status", ["active", "completed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (thisJoined) {
      setJoined(true);
      setCurrentLinkStatus(thisJoined.status as DisciplineLinkStatus);
      setActiveDiscipline(null);
      writeJoinedToSession(user.id, discipline.id, true, null);
      return;
    }

    setJoined(false);
    setCurrentLinkStatus(null);

    // Controlla se ha un'ALTRA disciplina attiva
    const { data: otherActive } = await supabase
      .from("link_user_disciplines")
      .select("discipline_id, disciplines(id, title, img_url, slug)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .neq("discipline_id", discipline.id)
      .limit(1)
      .single();

    if (otherActive?.disciplines) {
      const disc = otherActive.disciplines as unknown as ActiveDisciplineInfo;
      setActiveDiscipline(disc);
      writeJoinedToSession(user.id, discipline.id, false, disc);
    } else {
      setActiveDiscipline(null);
      writeJoinedToSession(user.id, discipline.id, false, null);
    }
  }, [user, discipline.id]);

  useEffect(() => {
    checkJoined();
  }, [checkJoined]);

  useEffect(() => {
    if (!user) {
      setCompletedAt(null);
      setCompletedLinkId(null);
      return;
    }
    let cancelled = false;
    void fetch("/api/user/completions")
      .then((res) => res.json())
      .then((data: { completions?: CompletionBadgeData[] }) => {
        if (cancelled) return;
        const found = (data.completions ?? []).find((row) => {
          const disc = Array.isArray(row.disciplines)
            ? row.disciplines[0]
            : row.disciplines;
          return disc?.slug === discipline.slug;
        });
        setCompletedAt(found?.completed_at ?? null);
        setCompletedLinkId(found?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setCompletedAt(null);
          setCompletedLinkId(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, discipline.slug]);

  useEffect(() => {
    if (!user || !joined) {
      setSentDayNumbers([]);
      return;
    }
    const cachedDays = readSentDaysFromSession(user.id, discipline.id);
    if (cachedDays) {
      setSentDayNumbers(cachedDays);
    }
    let cancelled = false;
    void fetch(
      `/api/disciplines/sent-days?disciplineId=${encodeURIComponent(discipline.id)}`
    )
      .then((res) => res.json())
      .then((data: { sentDayNumbers?: number[] }) => {
        if (cancelled) return;
        const nums = data.sentDayNumbers ?? [];
        setSentDayNumbers(nums);
        writeSentDaysToSession(user.id, discipline.id, nums);
      })
      .catch(() => {
        if (!cancelled) setSentDayNumbers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user, joined, discipline.id]);

  const loadReviews = useCallback(async () => {
    const res = await fetch(`/api/disciplines/reviews?disciplineId=${encodeURIComponent(discipline.id)}`);
    const data = (await res.json()) as {
      summary?: { count?: number; avgRating?: number | null };
      reviews?: DisciplineReview[];
    };
    setReviewSummary({
      count: Number(data.summary?.count ?? 0),
      avgRating:
        typeof data.summary?.avgRating === "number"
          ? Number(data.summary.avgRating)
          : null,
    });
    setPublicReviews(Array.isArray(data.reviews) ? data.reviews : []);
  }, [discipline.id]);

  useEffect(() => {
    let cancelled = false;
    void loadReviews().catch(() => {
      if (!cancelled) {
        setReviewSummary({ count: 0, avgRating: null });
        setPublicReviews([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadReviews]);

  useEffect(() => {
    if (!isBadgeOpen || !completedLinkId) {
      setReviewRating(5);
      setReviewComment("");
      setReviewHydrated(false);
      setLastSavedReviewKey(null);
      setReviewError(null);
      return;
    }
    setReviewRating(5);
    setReviewComment("");
    setReviewHydrated(false);
    setReviewFetchLoading(true);
    setLastSavedReviewKey(null);
    setReviewError(null);

    let cancelled = false;
    void fetch(`/api/disciplines/reviews?linkId=${completedLinkId}`)
      .then((res) => res.json())
      .then((data: { review?: { rating?: number; comment?: string } | null }) => {
        if (cancelled) return;
        if (!data.review) {
          setReviewHydrated(true);
          setReviewFetchLoading(false);
          setLastSavedReviewKey("5|");
          return;
        }
        const rating = Number(data.review.rating);
        const normalizedRating =
          Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : 5;
        const normalizedComment =
          typeof data.review.comment === "string" ? data.review.comment : "";
        setReviewRating(normalizedRating);
        setReviewComment(normalizedComment);
        setLastSavedReviewKey(`${normalizedRating}|${normalizedComment.trim()}`);
        setReviewHydrated(true);
        setReviewFetchLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setReviewRating(5);
          setReviewComment("");
          setReviewHydrated(true);
          setReviewFetchLoading(false);
          setLastSavedReviewKey("5|");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isBadgeOpen, completedLinkId]);

  const saveReview = useCallback(async () => {
    if (!completedLinkId) return;
    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      setReviewError("Seleziona un voto da 1 a 5 stelle.");
      return;
    }
    setReviewLoading(true);
    setReviewError(null);
    try {
      const res = await fetch("/api/disciplines/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkId: completedLinkId,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" ? data.error : "Impossibile salvare la recensione"
        );
      }
      setLastSavedReviewKey(`${reviewRating}|${reviewComment.trim()}`);
      void loadReviews();
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Errore imprevisto");
    } finally {
      setReviewLoading(false);
    }
  }, [completedLinkId, reviewRating, reviewComment]);

  useEffect(() => {
    if (!isBadgeOpen || !completedLinkId || !reviewHydrated) return;
    const nextKey = `${reviewRating}|${reviewComment.trim()}`;
    if (nextKey === lastSavedReviewKey) return;
    const timer = window.setTimeout(() => {
      void saveReview();
    }, 700);
    return () => {
      window.clearTimeout(timer);
    };
  }, [
    isBadgeOpen,
    completedLinkId,
    reviewHydrated,
    reviewRating,
    reviewComment,
    lastSavedReviewKey,
    saveReview,
  ]);

  const joinedProgress = useMemo(
    () =>
      joined
        ? computeJoinedPathProgress(
            discipline.notification_plan,
            discipline.lenght_days,
            sentDayNumbers
          )
        : null,
    [joined, discipline.notification_plan, discipline.lenght_days, sentDayNumbers]
  );

  const handlePartecipa = async () => {
    // Step 1: Verifica login
    if (!user) {
      setIsLoginOpen(true);
      return;
    }

    // Step 2: Verifica abbonamento
    if (!subscriptionInfo?.hasAccess) {
      setIsSubscriptionOpen(true);
      return;
    }

    // Step 3: Se c'è già una disciplina attiva diversa, mostra dialog di sostituzione
    if (activeDiscipline) {
      setIsReplaceOpen(true);
      return;
    }

    // Step 4: Nessuna disciplina attiva, mostra conferma normale
    setIsConfirmOpen(true);
  };

  const handleConfirmJoin = async (replaceActive = false) => {
    setIsConfirmOpen(false);
    setIsReplaceOpen(false);
    setIsJoining(true);
    try {
      const response = await fetch("/api/disciplines/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disciplineId: discipline.id,
          replaceActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      if (user) {
        clearDisciplinaSessionCache(user.id, discipline.id);
      }
      setJoined(true);
      setCurrentLinkStatus("active");
      setActiveDiscipline(null);
      if (user) {
        writeJoinedToSession(user.id, discipline.id, true, null);
      }
    } catch (err) {
      console.error("Join error:", err);
    } finally {
      setIsJoining(false);
    }
  };

  const handleStopDiscipline = () => {
    setIsStopConfirmOpen(true);
  };

  const handleConfirmStop = async () => {
    setIsStopConfirmOpen(false);
    setIsStopping(true);
    try {
      const response = await fetch("/api/disciplines/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disciplineId: discipline.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      if (user) {
        clearDisciplinaSessionCache(user.id, discipline.id);
      }
      setJoined(false);
      setCurrentLinkStatus(null);
      if (user) {
        writeJoinedToSession(user.id, discipline.id, false, null);
      }
    } catch (err) {
      console.error("Stop error:", err);
      alert("Errore nel bloccare il percorso. Riprova.");
    } finally {
      setIsStopping(false);
    }
  };

  const getButtonText = () => {
    if (joined) return "Sei iscritto!";
    if (isJoining) return "Iscrizione in corso...";
    return "Inizia ora!";
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = discipline.title || "disciplinaFit";
    const text = discipline.short_desc || "Guarda questa disciplina su disciplinaFit";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        await navigator.clipboard?.writeText(url);
        alert("Link copiato negli appunti!");
      }
    } catch {
      // Utente ha annullato o errore: non mostrare nulla
    }
  };

  const handleShareBadge = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = discipline.title || "disciplinaFIT";
    const text = `Ho completato "${title}" su disciplinaFIT.`;
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

  const ctaButtonClass = joined
    ? "bg-green-600 hover:bg-green-600 text-white cursor-default"
    : "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900";
  const restartButtonClass =
    "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900";
  const hasPastCompletionWhileActive = currentLinkStatus === "active" && Boolean(completedAt);
  const hasPastCompletionWithoutActiveRun = !joined && Boolean(completedAt);
  const completedTotalDays = discipline.lenght_days ?? joinedProgress?.total ?? 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <Header onLoginClick={() => setIsLoginOpen(true)} />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-1 sm:px-6 lg:px-8 py-12">
        {/* Back Link + Condividi */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            indietro
          </Link>
          <button
            onClick={handleShare}
            className="inline-flex items-center px-6 py-1 bg-white dark:bg-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-200 text-zinc-900 font-medium rounded-lg transition-colors border border-zinc-200 dark:border-zinc-300"
          >
            condividi
          </button>
        </div>

        {/* Hero Section */}
        <div className="mb-8">
          {/* Immagine o gradient */}
          {discipline.img_url ? (
            <div className="h-96 rounded-2xl mb-6 overflow-hidden">
              <img
                src={discipline.img_url}
                alt={discipline.title || "Disciplina"}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="h-96 bg-linear-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 rounded-2xl mb-6"></div>
          )}

          {/* Bollino Iscrizione + Pulsante Blocca */}
          {joined && currentLinkStatus === "active" && (
            <div className="flex flex-col items-start gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="inline-flex items-center gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950"
                  aria-hidden
                >
                  <svg
                    className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  iscrizione eseguita, non mollare!
                </span>
              </div>
              <button
                onClick={handleStopDiscipline}
                disabled={isStopping}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-200 dark:text-zinc-300 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {isStopping ? "interrompo..." : "interrompi percorso"}
              </button>
            </div>
          )}

          <div className="flex items-start justify-between mb-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
                {discipline.title}
              </h1>
              {completedAt ? (
                <p
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsBadgeOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setIsBadgeOpen(true);
                    }
                  }}
                  className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 underline underline-offset-2"
                >
                  Badge vinto il {new Date(completedAt).toLocaleDateString("it-IT")}
                </p>
              ) : null}
              {(joined && joinedProgress) || hasPastCompletionWithoutActiveRun ? (
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {joined && joinedProgress && hasPastCompletionWhileActive && joinedProgress.remaining === 0 ? (
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      percorso gia completato in passato · nuova versione in corso
                    </span>
                  ) : hasPastCompletionWithoutActiveRun ? (
                    <>
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">
                        {completedTotalDays}
                      </span>
                      {" di "}
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {completedTotalDays}
                      </span>
                      {" giorni sbloccati"}
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">
                        {" · "}
                        percorso completato
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">
                        {joinedProgress?.completed}
                      </span>
                      {" di "}
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {joinedProgress?.total}
                      </span>
                      {" giorni sbloccati"}
                      {(joinedProgress?.remaining ?? 0) > 0 ? (
                        <>
                          {" · "}
                          <span className="text-zinc-500 dark:text-zinc-500">
                            ne mancano {joinedProgress?.remaining}
                          </span>
                        </>
                      ) : (
                        <span className="font-medium text-emerald-700 dark:text-emerald-400">
                          {" · "}
                          percorso completato
                        </span>
                      )}
                    </>
                  )}
                </p>
              ) : null}
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {reviewSummary.count > 0 ? (
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
            </div>
            {/* Tag nascosto temporaneamente */}
            {/* {discipline.tag && (
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                {discipline.tag}
              </span>
            )} */}
          </div>

          <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-6">
            {discipline.short_desc}
          </p>

          {/* Stats */}
          <div className="flex items-center gap-8 text-zinc-600 dark:text-zinc-400 mb-8">
            {discipline.lenght_days && (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{discipline.lenght_days} giorni</span>
              </div>
            )}
            {discipline.subscribers != null && (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{discipline.subscribers.toLocaleString()} partecipanti</span>
              </div>
            )}
          </div>

          {/* CTA Button - nascosto se già iscritto */}
          {(!joined || currentLinkStatus === "completed") && (
            <button
              onClick={handlePartecipa}
              disabled={isJoining}
              className={`w-full sm:w-auto px-8 py-4 font-semibold rounded-lg transition-colors duration-200 text-lg disabled:opacity-80 ${
                completedAt ? restartButtonClass : ctaButtonClass
              }`}
            >
              {completedAt ? "ricomincia il percorso" : getButtonText()}
            </button>
          )}
        </div>

        {/* Description with Markdown — fisarmonica se la disciplina è attiva */}
        {discipline.long_desc && (
          <div className="prose prose-zinc dark:prose-invert max-w-none">
            <div
              className={
                joined && !longDescOpen
                  ? "relative max-h-68 overflow-hidden sm:max-h-80"
                  : ""
              }
            >
              <ReactMarkdown
                components={{
                  h1: ({ node, ...props }) => (
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-8 mb-4" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-6 mb-3" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="text-zinc-700 dark:text-zinc-300 mb-4 leading-relaxed" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 mb-4 space-y-2" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal list-inside text-zinc-700 dark:text-zinc-300 mb-4 space-y-2" {...props} />
                  ),
                  strong: ({ node, ...props }) => (
                    <strong className="font-semibold text-zinc-900 dark:text-zinc-50" {...props} />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote
                      className="border-l-4 border-zinc-300 dark:border-zinc-700 pl-4 italic text-zinc-600 dark:text-zinc-400 my-4"
                      {...props}
                    />
                  ),
                }}
              >
                {discipline.long_desc}
              </ReactMarkdown>
              {joined && !longDescOpen && (
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-zinc-50 via-zinc-50/90 to-transparent dark:from-black dark:via-black/90 dark:to-transparent"
                  aria-hidden
                />
              )}
            </div>
            {joined && (
              <button
                type="button"
                onClick={() => setLongDescOpen((o) => !o)}
                className="not-prose mt-4 text-sm font-semibold text-zinc-900 underline decoration-zinc-400 underline-offset-4 hover:decoration-zinc-600 dark:text-zinc-100 dark:decoration-zinc-500 dark:hover:decoration-zinc-300"
              >
                {longDescOpen ? "Vedi meno" : "Vedi di più"}
              </button>
            )}
          </div>
        )}

        {/* Bottom CTA o Bollino Iscrizione */}
        {(!joined || currentLinkStatus === "completed") && (
          <div className="mt-12 text-center">
            <button
              onClick={handlePartecipa}
              disabled={isJoining}
              className={`w-full sm:w-auto px-8 py-4 font-semibold rounded-lg transition-colors duration-200 text-lg disabled:opacity-80 ${
                completedAt ? restartButtonClass : ctaButtonClass
              }`}
            >
              {completedAt ? "ricomincia il percorso" : getButtonText()}
            </button>
          </div>
        )}

        <NotificationPlanTimeline
          disciplineSlug={discipline.slug}
          disciplineId={discipline.id}
          disciplineTitle={discipline.title}
          lenghtDays={discipline.lenght_days}
          notificationPlan={discipline.notification_plan}
          joined={joined}
          showAllUnlocked={hasPastCompletionWithoutActiveRun}
        />

        <section className="mt-12">
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Commenti della community
          </h3>
          {publicReviews.length > 0 ? (
            <div className="mt-4 space-y-3">
              {publicReviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {review.user_name}
                    </p>
                    <p
                      className="text-amber-500 text-sm"
                      aria-label={`Valutazione ${review.rating} su 5`}
                    >
                      {"★".repeat(review.rating)}
                      <span className="text-zinc-400">
                        {review.rating < 5 ? "☆".repeat(5 - review.rating) : ""}
                      </span>
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(review.created_at).toLocaleDateString("it-IT")}
                  </p>
                  {review.comment ? (
                    <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                      {review.comment}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              Ancora nessun commento pubblico.
            </p>
          )}
        </section>
      </main>

      {/* Footer */}
      <Footer />

      {/* Login Dialog */}
      <LoginDialog isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      {/* Subscription Dialog */}
      <SubscriptionDialog
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
        disciplineSlug={discipline.slug}
      />

      {/* Stop/Block Confirm Dialog */}
      {isStopConfirmOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              Vuoi davvero interromperlo?
            </h3>
            <p className="text-zinc-700 dark:text-zinc-300 mb-6 text-sm leading-relaxed">
              Vuoi davvero procedere con l'interruzione della disciplina?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsStopConfirmOpen(false)}
                className="flex-1 px-4 py-3 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirmStop}
                className="flex-1 px-4 py-3 bg-zinc-700 hover:bg-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-200 dark:text-zinc-300 font-semibold rounded-lg transition-colors"
              >
                Sì, interrompi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog — nessuna disciplina attiva */}
      {isConfirmOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              Pronti a iniziare?
            </h3>
            <p className="text-zinc-700 dark:text-zinc-300 mb-3 text-sm leading-relaxed">
              Questo percorso richiede impegno costante. Ti supporteremo ogni giorno con messaggi motivazionali e faremo in modo che tu lo porti a termine.
            </p>
            <p className="text-zinc-900 dark:text-zinc-50 font-semibold mb-3 text-sm">
              Oggi preparati, iniziamo domani!
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-xs">
              Se hai dubbi sulla tua salute, consulta il tuo medico prima di iniziare.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsConfirmOpen(false)}
                className="flex-1 px-4 py-3 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium rounded-lg transition-colors"
              >
                non ancora
              </button>
              <button
                onClick={() => handleConfirmJoin(false)}
                className="flex-1 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold rounded-lg transition-colors"
              >
                Iniziamo!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replace Dialog — c'è già una disciplina attiva */}
      {isReplaceOpen && activeDiscipline && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-4 border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              Hai già una disciplina attiva, vuoi davvero procedere?
            </h3>

            {/* Card della disciplina attiva */}
            <div className="flex items-center gap-3 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 mb-4">
              {activeDiscipline.img_url ? (
                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                  <img
                    src={activeDiscipline.img_url}
                    alt={activeDiscipline.title || "Disciplina"}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-linear-to-br from-zinc-300 to-zinc-400 dark:from-zinc-700 dark:to-zinc-800 shrink-0"></div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                  {activeDiscipline.title}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">In corso</p>
              </div>
            </div>

            <p className="text-zinc-700 dark:text-zinc-300 mb-2 text-sm leading-relaxed">
              Stai già seguendo una disciplina. Focalizzati su una alla volta per ottenere risultati veri.
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm leading-relaxed">
              Se vuoi puoi procedere con la nuova disciplina: bloccheremo quella attuale in automatico.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setIsReplaceOpen(false)}
                className="flex-1 px-4 py-3 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => handleConfirmJoin(true)}
                className="flex-1 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold rounded-lg transition-colors"
              >
                Sì, cominciamo
              </button>
            </div>
          </div>
        </div>
      )}

      {isBadgeOpen && completedAt && (
        <div className="fixed inset-0 z-70 bg-zinc-950/95 text-white">
          <div className="h-full flex flex-col items-center px-4 sm:px-6 py-4 sm:py-6 text-center">
            <div className="w-full max-w-3xl flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setIsBadgeOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-600 text-zinc-200 hover:border-zinc-300 hover:text-zinc-50 transition-colors"
                aria-label="Chiudi"
              >
                <span className="text-2xl leading-none">×</span>
              </button>
            </div>
            <div className="w-full max-w-3xl min-h-0 overflow-y-auto pr-1 pb-28 sm:pb-0">
              <div className="w-full flex flex-col items-center">
            <h2 className="text-4xl sm:text-5xl font-bold leading-tight max-w-3xl">
              Ce l&apos;hai fatta!
            </h2>
            {discipline.img_url ? (
              <div className="mt-6 w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden border border-emerald-500/30">
                <img
                  src={discipline.img_url}
                  alt={discipline.title ?? "Disciplina"}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : null}
            <p className="mt-5 text-base sm:text-lg text-zinc-200 max-w-2xl">
              {discipline.title ?? "Percorso completato"}
            </p>
            <p className="mt-2 text-sm text-zinc-300">
              Badge vinto il {new Date(completedAt).toLocaleDateString("it-IT")}
            </p>
            <div className="mt-8 w-full max-w-2xl text-left">
              <p className="text-sm font-semibold text-zinc-100">
                La tua recensione
              </p>
              {reviewFetchLoading ? (
                <div className="mt-3" aria-hidden>
                  <div className="h-10 w-56 rounded bg-zinc-800 animate-pulse" />
                  <div className="mt-4 h-28 w-full rounded-lg bg-zinc-800 animate-pulse" />
                </div>
              ) : (
                <>
                  <div className="mt-3 flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        disabled={reviewLoading}
                        className={`text-4xl leading-none transition-colors ${
                          star <= reviewRating ? "text-amber-300" : "text-zinc-600 hover:text-zinc-400"
                        }`}
                        aria-label={`${star} stelle`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    maxLength={500}
                    disabled={reviewLoading}
                    placeholder="Scrivi un commento (opzionale)"
                    rows={5}
                    className="mt-4 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-hidden focus:border-emerald-500"
                  />
                </>
              )}
              {reviewError ? (
                <p className="mt-2 text-xs text-red-300">{reviewError}</p>
              ) : null}
            </div>
            </div>
            </div>
            <div className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-800 bg-zinc-950/95 p-4 sm:static sm:w-full sm:max-w-3xl sm:mt-4 sm:pt-3 sm:p-0 sm:border-t sm:bg-transparent">
              <div className="mx-auto w-full max-w-3xl grid grid-cols-1 sm:grid-cols-1 gap-3">
              <button
                type="button"
                onClick={handleShareBadge}
                className="px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold transition-colors"
              >
                Condividi
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
