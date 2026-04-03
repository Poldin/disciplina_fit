"use client";

import { useCallback, useState } from "react";
import { useAuth } from "./AuthProvider";

export default function FeedbackImproveButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setOpen(false);
    setMessage("");
    setContactEmail("");
    setIsLoading(false);
    setError(null);
    setSuccessMessage(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const pageUrl =
        typeof window !== "undefined" ? window.location.href : undefined;
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          pageUrl,
          ...(user ? {} : { contactEmail: contactEmail.trim() }),
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Invio non riuscito");
      }

      setSuccessMessage("Grazie! Il tuo messaggio è stato inviato.");
      setTimeout(() => {
        handleClose();
      }, 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nell'invio");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors underline-offset-4 hover:underline"
      >
        Aiutaci a migliorare
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden
          />

          <div
            className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white px-4 py-8 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-dialog-title"
          >
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-200"
              aria-label="Chiudi"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="mb-6">
              <h2
                id="feedback-dialog-title"
                className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50"
              >
                Aiutaci a migliorare
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Condividi pensieri, suggerimenti o segnalazioni di problemi: leggiamo tutto con
                attenzione.
              </p>
            </div>

            {error ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            ) : null}

            {successMessage ? (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
                {successMessage}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-5">
              {!user ? (
                <div>
                  <label
                    htmlFor="feedback-contact-email"
                    className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-50"
                  >
                    La tua email
                  </label>
                  <input
                    type="email"
                    id="feedback-contact-email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="tu@esempio.com"
                    required
                    autoComplete="email"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 transition-all placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-100"
                  />
                  <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Serve solo per poterti rispondere se necessario.
                  </p>
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="feedback-message"
                  className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-50"
                >
                  Messaggio
                </label>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={6}
                  minLength={15}
                  maxLength={5000}
                  placeholder="Scrivi qui…"
                  className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 transition-all placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-100"
                />
                <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Minimo 15 caratteri · {message.length}/5000
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-zinc-300 px-4 py-3 font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={
                    isLoading ||
                    message.trim().length < 15 ||
                    (!user && !contactEmail.trim())
                  }
                  className="rounded-lg bg-zinc-900 px-4 py-3 font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {isLoading ? "Invio in corso…" : "Invia"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
