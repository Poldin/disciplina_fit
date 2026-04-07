"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import PushNotificationToggle from "./PushNotificationToggle";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function getStandalone(): boolean {
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

interface FooterAppActionsProps {
  oneSignalEnabled: boolean;
}

export default function FooterAppActions({
  oneSignalEnabled,
}: FooterAppActionsProps) {
  const { user } = useAuth();
  const [standalone, setStandalone] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [installReady, setInstallReady] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [genericInstallHint, setGenericInstallHint] = useState(false);
  const deferredPromptRef = useRef<InstallPromptEvent | null>(null);

  const refreshStandalone = useCallback(() => {
    setStandalone(getStandalone());
  }, []);

  useEffect(() => {
    setMounted(true);
    refreshStandalone();
    const mq = window.matchMedia("(display-mode: standalone)");
    const onMq = () => refreshStandalone();
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, [refreshStandalone]);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as InstallPromptEvent;
      setInstallReady(true);
    };
    const onInstalled = () => {
      deferredPromptRef.current = null;
      setInstallReady(false);
      refreshStandalone();
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [refreshStandalone]);

  const handleInstallClick = async () => {
    if (standalone) return;
    const ev = deferredPromptRef.current;
    if (ev) {
      setIosHint(false);
      setGenericInstallHint(false);
      try {
        await ev.prompt();
        await ev.userChoice;
      } finally {
        deferredPromptRef.current = null;
        setInstallReady(false);
        refreshStandalone();
      }
      return;
    }
    if (isIOS()) {
      setGenericInstallHint(false);
      setIosHint((v) => !v);
      return;
    }
    setIosHint(false);
    setGenericInstallHint(true);
  };

  if (!mounted) {
    return (
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 bg-zinc-50/80 dark:bg-zinc-800/40 mb-8 animate-pulse min-h-5.5rem" />
    );
  }

  return (
    <div className="mb-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/40 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
        App e notifiche
      </h3>
      <ul className="space-y-3">
        <li className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-700 dark:text-zinc-200">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Sulla schermata Home
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {standalone
                  ? "Stai usando disciplinaFit come app installata."
                  : "Aggiungi la scorciatoia per aprirla come un’app."}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-stretch sm:items-end gap-1 shrink-0">
            <button
              type="button"
              disabled={standalone}
              onClick={() => void handleInstallClick()}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                standalone
                  ? "cursor-not-allowed bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
                  : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              }`}
            >
              {standalone ? "Già aggiunta" : "Aggiungi alla Home"}
            </button>
            {!standalone && iosHint && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-xs text-left sm:text-right">
                Safari: tocca{" "}
                <strong className="text-zinc-800 dark:text-zinc-200">
                  Condividi
                </strong>{" "}
                →{" "}
                <strong className="text-zinc-800 dark:text-zinc-200">
                  Aggiungi alla schermata Home
                </strong>
                .
              </p>
            )}
            {!standalone && genericInstallHint && !isIOS() && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-xs text-left sm:text-right">
                Dal menu del browser (⋮ o ⋯) scegli{" "}
                <strong className="text-zinc-800 dark:text-zinc-200">
                  Installa app
                </strong>{" "}
                o{" "}
                <strong className="text-zinc-800 dark:text-zinc-200">
                  Aggiungi a schermata home
                </strong>
                .
              </p>
            )}
          </div>
        </li>

        {oneSignalEnabled && user && (
          <li className="pt-2 border-t border-zinc-200/80 dark:border-zinc-700/80">
            <PushNotificationToggle oneSignalEnabled={oneSignalEnabled} />
          </li>
        )}
      </ul>
    </div>
  );
}
