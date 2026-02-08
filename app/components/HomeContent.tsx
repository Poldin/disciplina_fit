"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "./Header";
import LoginDialog from "./LoginDialog";
import Footer from "./Footer";
import { useAuth } from "./AuthProvider";
import type { Discipline } from "@/app/utils/types";

interface HomeContentProps {
  disciplines: Discipline[];
}

export default function HomeContent({ disciplines }: HomeContentProps) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const { user, subscription, refreshSubscription } = useAuth();

  // Controlla il risultato del checkout Stripe dall'URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");

    if (checkout === "success") {
      setCheckoutMessage("Abbonamento attivato con successo! Ora puoi partecipare a tutte le discipline.");
      refreshSubscription();
      window.history.replaceState({}, "", "/");

      // Nascondi il messaggio dopo 6 secondi
      const timer = setTimeout(() => {
        setCheckoutMessage(null);
      }, 6000);

      return () => clearTimeout(timer);
    } else if (checkout === "cancel") {
      window.history.replaceState({}, "", "/");
    }
  }, [refreshSubscription]);

  // Gestisce il click su "Gestisci abbonamento"
  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    try {
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore nella creazione della sessione");
      }

      // Redirect al portale Stripe
      window.location.href = data.url;
    } catch (error) {
      console.error("Portal error:", error);
      alert("Errore nel caricamento del portale di gestione. Riprova.");
      setIsLoadingPortal(false);
    }
  };

  // Gestisce il click su "Abbonati" - va direttamente a Stripe Checkout
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

      {/* Phone Number - Solo mobile e se loggato */}
      {user && user.phone && (
        <div className="md:hidden border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="text-sm text-zinc-900 dark:text-zinc-50 font-medium">
                {user.phone}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* User Status Banner - Solo se loggato */}
      {user && (
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {subscription === "active" ? (
                  <>
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        Abbonamento attivo
                      </p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        Hai accesso illimitato a tutte le discipline
                      </p>
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
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        Nessun abbonamento attivo
                      </p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        Abbonati per accedere a tutte le discipline
                      </p>
                    </div>
                  </>
                )}
              </div>

              {subscription === "active" ? (
                <button
                  onClick={handleManageSubscription}
                  disabled={isLoadingPortal}
                  className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingPortal ? "Caricamento..." : "Gestisci abbonamento"}
                </button>
              ) : (
                <button
                  onClick={handleSubscribe}
                  disabled={isLoadingPortal}
                  className="px-4 py-2 text-sm bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingPortal ? "Caricamento..." : "Abbonati a €4,99/mese"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Checkout success message */}
        {checkoutMessage && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
            {checkoutMessage}
          </div>
        )}

        {/* Section Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Scegli la tua disciplina
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Scegli la disciplina che risuona in te e trasforma i tuoi obiettivi in abitudini quotidiane. Non mollare!
          </p>
        </div>

        {/* Challenge Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {disciplines.map((discipline) => (
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
                  {discipline.tag && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      {discipline.tag}
                    </span>
                  )}
                </div>
                
                <p className="text-zinc-600 dark:text-zinc-400 mb-4 text-sm">
                  {discipline.short_desc}
                </p>
                
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
                
                <button className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-50 font-medium rounded-lg transition-colors duration-200">
                  Partecipa
                </button>
              </div>
            </Link>
          ))}
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
              la dieta dimenticata, la promessa di correre ogni mattina svanita. Il problema non sei tu: è che nessuno ti ha mai 
              accompagnato davvero, giorno dopo giorno.
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
                Esplora le nostre challenge e scegli quella che risuona con i tuoi obiettivi. Accesso illimitato a tutte le discipline.
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
                2. Ricevi supporto su WhatsApp
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Ogni giorno ti inviamo messaggi motivazionali per tenerti sulla strada giusta e non mollare mai.
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

          {/* Pricing */}
          <div className="text-center">
            <div className="mb-4">
              <span className="text-5xl font-bold text-zinc-900 dark:text-zinc-50">€4,99</span>
              <span className="text-xl text-zinc-600 dark:text-zinc-400">/mese</span>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Accesso illimitato a tutte le challenge • Messaggi di disciplina WhatsApp quotidiani • Cancella quando vuoi
            </p>
            <button 
              onClick={() => {
                // Step 1: Verifica login
                if (!user) {
                  setIsLoginOpen(true);
                  return;
                }

                // Step 2: Verifica abbonamento - vai direttamente al checkout
                if (subscription !== "active") {
                  handleSubscribe();
                  return;
                }

                // Già abbonato - Nessuna azione necessaria
                // L'utente può semplicemente scegliere le discipline dalla pagina
              }}
              disabled={isLoadingPortal && !!user && subscription !== "active"}
              className="px-8 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingPortal && !!user && subscription !== "active" 
                ? "Caricamento..." 
                : subscription === "active" 
                  ? "Abbonamento già attivo, non mollare!" 
                  : "Abbonati e non mollare!"}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Login Dialog */}
      <LoginDialog isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
}
