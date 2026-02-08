"use client";

import { useState } from "react";

interface SubscriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  disciplineSlug?: string;
}

export default function SubscriptionDialog({ isOpen, onClose, disciplineSlug }: SubscriptionDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disciplineSlug }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore nella creazione del pagamento");
      }

      // Redirect a Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto");
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setIsLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 border border-zinc-200 dark:border-zinc-800">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-zinc-900 dark:text-zinc-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Non sei ancora abbonato
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Per iscriverti alle discipline hai bisogno di un abbonamento attivo. Accesso illimitato a tutte le challenge!
          </p>
        </div>

        {/* Price Card */}
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-6 mb-6">
          <div className="text-center mb-4">
            <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">€4,99</span>
            <span className="text-zinc-600 dark:text-zinc-400">/mese</span>
          </div>
          <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Tutte le discipline incluse
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Messaggi WhatsApp quotidiani
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Cancella quando vuoi
            </li>
          </ul>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleSubscribe}
          disabled={isLoading}
          className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Reindirizzamento a Stripe..." : "Abbonati ora"}
        </button>

        <p className="text-xs text-zinc-500 dark:text-zinc-500 text-center mt-4">
          Pagamento sicuro tramite Stripe. Puoi cancellare in qualsiasi momento.
        </p>
      </div>
    </div>
  );
}
