"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import Header from "@/app/components/Header";
import LoginDialog from "@/app/components/LoginDialog";
import SubscriptionDialog from "@/app/components/SubscriptionDialog";
import Footer from "@/app/components/Footer";
import { useAuth } from "@/app/components/AuthProvider";
import { createClient } from "@/app/utils/supabase/client";
import type { Discipline } from "@/app/utils/types";

interface DisciplinaContentProps {
  discipline: Discipline;
}

export default function DisciplinaContent({ discipline }: DisciplinaContentProps) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [joined, setJoined] = useState(false);
  const { user, subscriptionInfo, refreshSubscription } = useAuth();

  // Pulisce l'URL dopo il ritorno da Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success" || checkout === "cancel") {
      refreshSubscription();
      window.history.replaceState({}, "", `/disciplina/${discipline.slug}`);
    }
  }, [discipline.slug, refreshSubscription]);

  // Controlla se l'utente è già iscritto a questa disciplina (e il percorso è attivo)
  const checkJoined = useCallback(async () => {
    if (!user) {
      setJoined(false);
      return;
    }

    const supabase = createClient();
    const { data } = await supabase
      .from("link_user_disciplines")
      .select("id")
      .eq("user_id", user.id)
      .eq("discipline_id", discipline.id)
      .is("stopped_at", null) // Solo se il percorso è attivo (non bloccato)
      .single();

    if (data) setJoined(true);
  }, [user, discipline.id]);

  useEffect(() => {
    checkJoined();
  }, [checkJoined]);

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

    // Step 3: Mostra dialog di conferma
    setIsConfirmOpen(true);
  };

  const handleConfirmJoin = async () => {
    // Iscrizione alla disciplina
    setIsConfirmOpen(false);
    setIsJoining(true);
    try {
      const response = await fetch("/api/disciplines/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disciplineId: discipline.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setJoined(true);
    } catch (err) {
      console.error("Join error:", err);
    } finally {
      setIsJoining(false);
    }
  };

  const handleStopDiscipline = async () => {
    if (!confirm("Vuoi davvero bloccare questo percorso?")) {
      return;
    }

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

      setJoined(false);
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

  const ctaButtonClass = joined
    ? "bg-green-600 hover:bg-green-600 text-white cursor-default"
    : "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <Header onLoginClick={() => setIsLoginOpen(true)} />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors mb-8"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Torna alle discipline
        </Link>

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
          {joined && (
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 border border-green-500 dark:border-green-600 rounded-full">
                <div className="w-5 h-5 bg-green-500 dark:bg-green-600 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-green-700 dark:text-green-400 font-semibold text-sm">
                  Iscrizione eseguita, non mollare!
                </span>
              </div>
              <button
                onClick={handleStopDiscipline}
                disabled={isStopping}
                className="px-4 py-2 text-sm border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStopping ? "Blocco..." : "Blocca percorso"}
              </button>
            </div>
          )}

          <div className="flex items-start justify-between mb-4">
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
              {discipline.title}
            </h1>
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
          {!joined && (
            <button
              onClick={handlePartecipa}
              disabled={isJoining}
              className={`w-full sm:w-auto px-8 py-4 font-semibold rounded-lg transition-colors duration-200 text-lg disabled:opacity-80 ${ctaButtonClass}`}
            >
              {getButtonText()}
            </button>
          )}
        </div>

        {/* Description with Markdown */}
        {discipline.long_desc && (
          <div className="prose prose-zinc dark:prose-invert max-w-none">
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-8 border border-zinc-200 dark:border-zinc-800">
              <ReactMarkdown
                components={{
                  h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-8 mb-4" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-6 mb-3" {...props} />,
                  p: ({node, ...props}) => <p className="text-zinc-700 dark:text-zinc-300 mb-4 leading-relaxed" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 mb-4 space-y-2" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal list-inside text-zinc-700 dark:text-zinc-300 mb-4 space-y-2" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-semibold text-zinc-900 dark:text-zinc-50" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-zinc-300 dark:border-zinc-700 pl-4 italic text-zinc-600 dark:text-zinc-400 my-4" {...props} />,
                }}
              >
                {discipline.long_desc}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Bottom CTA o Bollino Iscrizione */}
        {!joined && (
          <div className="mt-12 text-center">
            <button
              onClick={handlePartecipa}
              disabled={isJoining}
              className={`px-8 py-4 font-semibold rounded-lg transition-colors duration-200 text-lg disabled:opacity-80 ${ctaButtonClass}`}
            >
              {getButtonText()}
            </button>
          </div>
        )}
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

      {/* Confirm Dialog */}
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
                onClick={handleConfirmJoin}
                className="flex-1 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold rounded-lg transition-colors"
              >
                Iniziamo!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
