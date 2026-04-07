"use client";

import { useEffect, useRef, useState } from "react";

type OneSignalSdk = {
  User: {
    PushSubscription: {
      optIn: () => Promise<void>;
      optOut: () => Promise<void>;
      optedIn: boolean;
      addEventListener: (
        event: "change",
        listener: (event: { current: { optedIn: boolean } }) => void
      ) => void;
      removeEventListener: (
        event: "change",
        listener: (event: { current: { optedIn: boolean } }) => void
      ) => void;
    };
  };
};

function pushOneSignalTask(
  task: (OneSignal: OneSignalSdk) => void | Promise<void>
) {
  const w = window as Window & {
    OneSignalDeferred?: Array<
      (OneSignal: OneSignalSdk) => void | Promise<void>
    >;
  };
  w.OneSignalDeferred = w.OneSignalDeferred || [];
  w.OneSignalDeferred.push(async function (OneSignal: OneSignalSdk) {
    await task(OneSignal);
  });
}

interface PushNotificationToggleProps {
  oneSignalEnabled: boolean;
}

export default function PushNotificationToggle({
  oneSignalEnabled,
}: PushNotificationToggleProps) {
  const [pushOptedIn, setPushOptedIn] = useState<boolean | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const listenerRef = useRef<
    ((event: { current: { optedIn: boolean } }) => void) | null
  >(null);

  useEffect(() => {
    if (!oneSignalEnabled) return;

    const listener = (event: { current: { optedIn: boolean } }) => {
      setPushOptedIn(event.current.optedIn);
    };
    listenerRef.current = listener;

    pushOneSignalTask(async (OneSignal) => {
      setPushOptedIn(OneSignal.User.PushSubscription.optedIn);
      OneSignal.User.PushSubscription.addEventListener("change", listener);
    });

    return () => {
      if (!listenerRef.current) return;
      const captured = listenerRef.current;
      pushOneSignalTask(async (OneSignal) => {
        OneSignal.User.PushSubscription.removeEventListener(
          "change",
          captured
        );
      });
    };
  }, [oneSignalEnabled]);

  const perm =
    typeof Notification !== "undefined" ? Notification.permission : "denied";

  const handleToggle = async () => {
    if (!oneSignalEnabled || pushBusy || pushOptedIn === null) return;
    if (perm === "denied") return;

    setPushBusy(true);
    const nextOn = !pushOptedIn;
    pushOneSignalTask(async (OneSignal) => {
      try {
        if (nextOn) {
          await OneSignal.User.PushSubscription.optIn();
        } else {
          await OneSignal.User.PushSubscription.optOut();
        }
      } finally {
        setPushBusy(false);
      }
    });
  };

  if (!oneSignalEnabled) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
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
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Notifiche
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {perm === "denied"
              ? "Hai bloccato le notifiche per questo sito nelle impostazioni del browser."
              : pushOptedIn === null
                ? "Caricamento…"
                : pushOptedIn
                  ? "Ricevi promemoria e aggiornamenti."
                  : "Attivale per non perdere i messaggi importanti."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:justify-end shrink-0">
        {perm === "denied" ? (
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Non disponibile
          </span>
        ) : pushOptedIn === null ? (
          <span className="h-7 w-12 rounded-full bg-zinc-200 dark:bg-zinc-600 animate-pulse" />
        ) : (
          <button
            type="button"
            role="switch"
            aria-checked={pushOptedIn}
            disabled={pushBusy}
            onClick={() => void handleToggle()}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900 disabled:opacity-50 ${
              pushOptedIn
                ? "bg-emerald-600 dark:bg-emerald-500"
                : "bg-zinc-300 dark:bg-zinc-600"
            }`}
          >
            <span
              className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                pushOptedIn ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        )}
      </div>
    </div>
  );
}
