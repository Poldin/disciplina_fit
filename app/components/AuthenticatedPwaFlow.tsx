"use client";

import { useAuth } from "./AuthProvider";
import PwaNotificationsFlow from "./PwaNotificationsFlow";

const oneSignalEnabled = Boolean(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID);

/**
 * Wrapper che legge l'auth context e passa isLoggedIn a PwaNotificationsFlow.
 * Deve essere montato dentro AuthProvider.
 * Il prompt PWA install è visibile a tutti; il dialog notifiche solo ai loggati.
 */
export default function AuthenticatedPwaFlow() {
  const { user, loading } = useAuth();
  return (
    <PwaNotificationsFlow
      oneSignalEnabled={oneSignalEnabled}
      isLoggedIn={!loading && user !== null}
    />
  );
}
