/**
 * Se `NEXT_PUBLIC_SUBSCRIPTION_REQUIRED=false`, gli utenti autenticati accedono alle
 * discipline senza Stripe. Default: abbonamento richiesto (comportamento attuale).
 */
export function isSubscriptionRequired(): boolean {
  const v = process.env.NEXT_PUBLIC_SUBSCRIPTION_REQUIRED;
  if (typeof v === "string" && v.toLowerCase() === "false") {
    return false;
  }
  return true;
}
