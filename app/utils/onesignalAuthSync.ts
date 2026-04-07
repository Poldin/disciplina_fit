"use client";

type OneSignalSdk = {
  login: (externalId: string) => Promise<void>;
};

/**
 * Allinea external_id OneSignal con l’utente Supabase così le notifiche REST raggiungono il dispositivo giusto.
 */
export function syncOneSignalAuthUser(userId: string | null) {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) return;

  const w = window as Window & {
    OneSignalDeferred?: Array<(OneSignal: OneSignalSdk) => void | Promise<void>>;
  };
  w.OneSignalDeferred = w.OneSignalDeferred || [];
  w.OneSignalDeferred.push(async function (OneSignal: OneSignalSdk) {
    try {
      if (userId) {
        await OneSignal.login(userId);
      }
      // Il logout dall'app non de-linka la subscription OneSignal:
      // l'utente controlla le notifiche solo tramite il toggle esplicito.
    } catch (e) {
      console.warn("[OneSignal] sync auth user failed:", e);
    }
  });
}
