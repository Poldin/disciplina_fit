"use client";

import { useEffect, useState } from "react";

export type BadgeModalBadge = {
  id: number;
  title: string;
  imgUrl: string | null;
  completedAt: string;
};

type BadgeModalProps = {
  badge: BadgeModalBadge | null;
  onClose: () => void;
};

export default function BadgeModal({ badge, onClose }: BadgeModalProps) {
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewFetchLoading, setReviewFetchLoading] = useState(false);
  const [reviewHydrated, setReviewHydrated] = useState(false);
  const [lastSavedReviewKey, setLastSavedReviewKey] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!badge) {
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
    void fetch(`/api/disciplines/reviews?linkId=${badge.id}`)
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
  }, [badge?.id]);

  const saveReview = async () => {
    if (!badge) return;
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
          linkId: badge.id,
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
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Errore imprevisto");
    } finally {
      setReviewLoading(false);
    }
  };

  useEffect(() => {
    if (!badge || !reviewHydrated) return;
    const nextKey = `${reviewRating}|${reviewComment.trim()}`;
    if (nextKey === lastSavedReviewKey) return;
    const timer = window.setTimeout(() => {
      void saveReview();
    }, 700);
    return () => {
      window.clearTimeout(timer);
    };
  }, [badge?.id, reviewHydrated, reviewRating, reviewComment, lastSavedReviewKey]);

  const handleShare = async () => {
    if (!badge) return;
    const text = `Ho completato "${badge.title}" su disciplinaFIT.`;
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

  if (!badge) return null;

  return (
    <div className="fixed inset-0 z-70 bg-zinc-950/95 text-white">
      <div className="h-full flex flex-col items-center px-4 sm:px-6 py-4 sm:py-6 text-center">
        <div className="w-full max-w-3xl flex justify-end mb-2">
          <button
            type="button"
            onClick={onClose}
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
            {badge.imgUrl ? (
              <div className="mt-6 w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden border border-emerald-500/30">
                <img
                  src={badge.imgUrl}
                  alt={badge.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : null}
            <p className="mt-5 text-base sm:text-lg text-zinc-200 max-w-2xl">
              {badge.title}
            </p>
            <p className="mt-2 text-sm text-zinc-300">
              Badge vinto il {new Date(badge.completedAt).toLocaleDateString("it-IT")}
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
              onClick={handleShare}
              className="px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold transition-colors"
            >
              Condividi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
