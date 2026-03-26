/**
 * URL pubblico del sito (notifiche, link assoluti). Nessuno slash finale.
 */
export function getPublicSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, '');
    return `https://${host}`;
  }
  return 'http://localhost:3000';
}
