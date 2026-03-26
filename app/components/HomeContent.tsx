"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Header from "./Header";
import LoginDialog from "./LoginDialog";
import Footer from "./Footer";
import { useAuth } from "./AuthProvider";
import { createClient } from "@/app/utils/supabase/client";
import { listNotificationPlanDayPreviews } from "@/app/utils/notificationPlanDisplay";
import type { Discipline } from "@/app/utils/types";

interface HomeContentProps {
  disciplines: Discipline[];
}

export default function HomeContent({ disciplines }: HomeContentProps) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [joinedDisciplineIds, setJoinedDisciplineIds] = useState<Set<string>>(new Set());
  const [activeDiscipline, setActiveDiscipline] = useState<Discipline | null>(null);
  const [sentDayNumbers, setSentDayNumbers] = useState<number[]>([]);
  const { user, subscriptionInfo, refreshSubscription } = useAuth();

  const activeProgress = useMemo(() => {
    if (!activeDiscipline) return null;
    const planDays = listNotificationPlanDayPreviews(activeDiscipline.notification_plan);
    const sent = new Set(sentDayNumbers);
    const segmentDayNumbers: number[] =
      planDays.length > 0
        ? planDays.map((d) => d.dayNumber)
        : activeDiscipline.lenght_days && activeDiscipline.lenght_days > 0
          ? Array.from({ length: activeDiscipline.lenght_days }, (_, i) => i + 1)
          : [];

    if (segmentDayNumbers.length === 0) return null;

    const completed = segmentDayNumbers.filter((d) => sent.has(d)).length;
    const total = segmentDayNumbers.length;
    const remaining = Math.max(0, total - completed);
    const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

    return { completed, total, remaining, pct, segmentDayNumbers, sent };
  }, [activeDiscipline, sentDayNumbers]);

  // Pulisce l'URL dopo il ritorno da Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success" || checkout === "cancel") {
      refreshSubscription();
      window.history.replaceState({}, "", "/");
    }
  }, [refreshSubscription]);

  // Carica la disciplina attiva dell'utente (una sola alla volta)
  useEffect(() => {
    const fetchActiveDiscipline = async () => {
      if (!user) {
        setJoinedDisciplineIds(new Set());
        setActiveDiscipline(null);
        return;
      }

      const supabase = createClient();
      const { data } = await supabase
        .from("link_user_disciplines")
        .select(
          "discipline_id, disciplines(id, title, slug, img_url, short_desc, lenght_days, notification_plan)"
        )
        .eq("user_id", user.id)
        .is("stopped_at", null) // Solo percorsi attivi (non bloccati)
        .limit(1)
        .single();

      if (data) {
        setJoinedDisciplineIds(new Set([data.discipline_id]));
        // Il join restituisce un oggetto (perché è una relazione many-to-one)
        const disc = data.disciplines as unknown as Discipline;
        setActiveDiscipline(disc ?? null);
      } else {
        setJoinedDisciplineIds(new Set());
        setActiveDiscipline(null);
      }
    };

    fetchActiveDiscipline();
  }, [user]);

  useEffect(() => {
    if (!user || !activeDiscipline) {
      setSentDayNumbers([]);
      return;
    }
    let cancelled = false;
    void fetch(
      `/api/disciplines/sent-days?disciplineId=${encodeURIComponent(activeDiscipline.id)}`
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
  }, [user, activeDiscipline?.id]);

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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
                    </p>
                  ) : activeDiscipline.lenght_days ? (
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Section Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Prenditi cura di te, con disciplina.
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-2">
            Prendersi cura di sé, del proprio equilibrio fisico, richiede scelte da perseguire nel tempo con disciplina.
          </p>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Scegli la disciplina che risuona in te e trasforma i tuoi obiettivi in abitudini quotidiane. Non mollare!
          </p>
        </div>

        {/* Discipline Cards Grid */}
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
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-500 dark:border-green-600"
                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-50"
                }`}>
                  {joinedDisciplineIds.has(discipline.id) ? "In esecuzione" : "Partecipa"}
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
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Accesso illimitato a tutte le discipline • Notifiche e informazioni di supporto quotidiani • Cancella quando vuoi
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-6 max-w-sm mx-auto leading-relaxed">
              Perchè devo pagare un abbonamento? Perchè chi investe, arriva fino in fondo.
            </p>
            <button 
              onClick={() => {
                // Step 1: Verifica login
                if (!user) {
                  setIsLoginOpen(true);
                  return;
                }

                // Step 2: Verifica abbonamento - vai direttamente al checkout
                if (!subscriptionInfo?.hasAccess) {
                  handleSubscribe();
                  return;
                }

                // Già abbonato - Nessuna azione necessaria
                // L'utente può semplicemente scegliere le discipline dalla pagina
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
