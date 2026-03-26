"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";

type SubscriptionSectionProps = {
  /** Titolo della sezione (es. "Abbonamento") */
  title?: string;
};

export default function SubscriptionSection({ title = "Abbonamento" }: SubscriptionSectionProps) {
  const { user, subscription, subscriptionInfo } = useAuth();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    try {
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore nella creazione della sessione");
      window.location.href = data.url;
    } catch (error) {
      console.error("Portal error:", error);
      alert("Errore nel caricamento del portale di gestione. Riprova.");
      setIsLoadingPortal(false);
    }
  };

  const handleSubscribe = async () => {
    setIsLoadingPortal(true);
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore nella creazione del pagamento");
      window.location.href = data.url;
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Errore nel caricamento del pagamento. Riprova.");
      setIsLoadingPortal(false);
    }
  };

  if (!user) return null;

  return (
    <section className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-6">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">{title}</h2>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {subscriptionInfo?.hasAccess ? (
            <>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Abbonamento attivo</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {subscriptionInfo.closingDate
                    ? `Abbonamento disattivato, valido fino al ${new Date(subscriptionInfo.closingDate).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}`
                    : "Hai accesso illimitato a tutte le discipline"}
                </p>
              </div>
            </>
          ) : subscription === "incomplete" ? (
            <>
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Abbonamento da attivare</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">Completa il pagamento per attivare l&apos;accesso</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Nessun abbonamento attivo</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">Abbonati per accedere a tutte le discipline</p>
              </div>
            </>
          )}
        </div>

        <div className="shrink-0">
          {subscriptionInfo?.hasAccess ? (
            <button
              type="button"
              onClick={handleManageSubscription}
              disabled={isLoadingPortal}
              className="w-full sm:w-auto px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingPortal ? "Caricamento..." : "Gestisci abbonamento"}
            </button>
          ) : subscription === "incomplete" ? (
            <button
              type="button"
              onClick={handleManageSubscription}
              disabled={isLoadingPortal}
              className="w-full sm:w-auto px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingPortal ? "Caricamento..." : "Completa il pagamento"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={isLoadingPortal}
              className="w-full sm:w-auto px-4 py-2 text-sm bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingPortal ? "Caricamento..." : "Abbonati a €4,99/mese"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
