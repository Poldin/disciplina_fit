"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_PWA_DISMISSED = "df-pwa-install-dismissed-at";
const STORAGE_NOTIF_DISMISSED = "df-notifications-prompt-dismissed-at";
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

type OneSignalSdk = {
  User: { PushSubscription: { optIn: () => Promise<void> } };
};

/** Chromium “Add to Home Screen” / install prompt. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isDismissedWithin(key: string, windowMs: number): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const t = Number.parseInt(raw, 10);
    if (Number.isNaN(t)) return false;
    return Date.now() - t < windowMs;
  } catch {
    return false;
  }
}

function setDismissed(key: string) {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isLikelyMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function pushOneSignalTask(task: (OneSignal: OneSignalSdk) => Promise<void>) {
  const w = window as Window & {
    OneSignalDeferred?: Array<(OneSignal: OneSignalSdk) => void | Promise<void>>;
  };
  w.OneSignalDeferred = w.OneSignalDeferred || [];
  w.OneSignalDeferred.push(async function (OneSignal: OneSignalSdk) {
    await task(OneSignal);
  });
}

type Phase = "idle" | "pwa" | "notifications";

interface PwaNotificationsFlowProps {
  oneSignalEnabled: boolean;
  /** Se false o undefined il dialog notifiche non viene mostrato (utente non loggato). */
  isLoggedIn?: boolean;
}

export default function PwaNotificationsFlow({
  oneSignalEnabled,
  isLoggedIn,
}: PwaNotificationsFlowProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [installReady, setInstallReady] = useState(false);
  const deferredPromptRef = useRef<InstallPromptEvent | null>(null);
  const oneSignalEnabledRef = useRef(oneSignalEnabled);
  oneSignalEnabledRef.current = oneSignalEnabled;
  const isLoggedInRef = useRef(isLoggedIn);
  isLoggedInRef.current = isLoggedIn;

  const tryOpenNotificationsRef = useRef<() => void>(() => {});

  tryOpenNotificationsRef.current = () => {
    if (!oneSignalEnabledRef.current) {
      setPhase("idle");
      return;
    }
    // Il dialog notifiche richiede login: senza utente loggato non ha senso
    // chiedere il consenso perché la subscription resterebbe anonima.
    if (!isLoggedInRef.current) {
      setPhase("idle");
      return;
    }
    if (typeof Notification === "undefined") {
      setPhase("idle");
      return;
    }
    if (Notification.permission === "denied") {
      setPhase("idle");
      return;
    }
    if (Notification.permission === "granted") {
      setPhase("idle");
      return;
    }
    if (isDismissedWithin(STORAGE_NOTIF_DISMISSED, DISMISS_COOLDOWN_MS)) {
      setPhase("idle");
      return;
    }
    setPhase("notifications");
  };

  useEffect(() => {
    const maybeStartFlow = () => {
      const standalone = isStandalone();
      const mobile = isLikelyMobile();

      if (mobile && !standalone) {
        if (isDismissedWithin(STORAGE_PWA_DISMISSED, DISMISS_COOLDOWN_MS)) {
          tryOpenNotificationsRef.current();
          return;
        }
        setPhase("pwa");
        return;
      }

      tryOpenNotificationsRef.current();
    };

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as InstallPromptEvent;
      setInstallReady(true);
    };
    const onInstalled = () => {
      deferredPromptRef.current = null;
      setInstallReady(false);
      setPhase("idle");
      tryOpenNotificationsRef.current();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    const t = window.setTimeout(maybeStartFlow, 1400);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Quando l'utente si logga (isLoggedIn passa da false a true) proviamo a
  // mostrare il prompt notifiche, nel caso in cui il timer iniziale fosse
  // già scaduto prima del login.
  useEffect(() => {
    if (isLoggedIn) {
      tryOpenNotificationsRef.current();
    }
  }, [isLoggedIn]);

  const finishPwaStep = () => {
    setDismissed(STORAGE_PWA_DISMISSED);
    setPhase("idle");
    window.setTimeout(() => tryOpenNotificationsRef.current(), 400);
  };

  const handlePwaInstall = async () => {
    const ev = deferredPromptRef.current;
    if (!ev) return;
    try {
      await ev.prompt();
      await ev.userChoice;
    } finally {
      deferredPromptRef.current = null;
      setInstallReady(false);
    }
  };

  const closeNotifications = (dismiss: boolean) => {
    if (dismiss) setDismissed(STORAGE_NOTIF_DISMISSED);
    setPhase("idle");
  };

  const handleEnableNotifications = () => {
    pushOneSignalTask(async (OneSignal) => {
      await OneSignal.User.PushSubscription.optIn();
    });
    closeNotifications(false);
  };

  if (phase === "idle") return null;

  return (
    <>
      {phase === "pwa" && (
        <div className="fixed inset-0 z-100 flex items-center justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Chiudi"
            onClick={finishPwaStep}
          />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md mx-2 p-8 border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={finishPwaStep}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="pr-8">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                Aggiungi disciplinaFit alla Home
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                Così apri l’app come quelle native e, su iPhone, potrai ricevere
                le notifiche quando saranno attive.
              </p>

              {isIOS() ? (
                <ol className="text-sm text-zinc-700 dark:text-zinc-300 space-y-3 mb-6 list-decimal list-inside">
                  <li>
                    Tocca il pulsante <strong>Condividi</strong>{" "}
                    <span className="whitespace-nowrap">(□↑)</span> nella barra
                    di Safari.
                  </li>
                  <li>
                    Scegli <strong>Aggiungi alla schermata Home</strong>.
                  </li>
                  <li>Tocca <strong>Aggiungi</strong>.</li>
                </ol>
              ) : (
                <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-6">
                  {installReady ? (
                    <>
                      Il browser è pronto per installare l’app. Tocca il
                      pulsante qui sotto, oppure usa il menu del browser
                      (Installa app / Aggiungi a schermata home).
                    </>
                  ) : (
                    <>
                      Cerca nel menu del browser (⋮ o ⋯) l’opzione{" "}
                      <strong>Installa app</strong> o{" "}
                      <strong>Aggiungi a schermata home</strong>.
                    </>
                  )}
                </p>
              )}

              <div className="flex flex-col gap-2">
                {!isIOS() && installReady && (
                  <button
                    type="button"
                    onClick={() => {
                      void handlePwaInstall();
                    }}
                    className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold rounded-lg transition-colors"
                  >
                    Installa l’app
                  </button>
                )}
                <button
                  type="button"
                  onClick={finishPwaStep}
                  className="w-full py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
                >
                  Continua
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === "notifications" && oneSignalEnabled && (
        <div className="fixed inset-0 z-100 flex items-center justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Chiudi"
            onClick={() => closeNotifications(true)}
          />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md mx-2 p-8 border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => closeNotifications(true)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="pr-8">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                Resta sulla disciplina
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                Attiva le notifiche per promemoria e aggiornamenti. Puoi
                disattivarle quando vuoi dalle impostazioni del browser.
              </p>

              <button
                type="button"
                onClick={handleEnableNotifications}
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold rounded-lg transition-colors"
              >
                Attiva notifiche
              </button>
              <button
                type="button"
                onClick={() => closeNotifications(true)}
                className="w-full mt-2 py-2 text-sm text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Non ora
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
