import { createClient } from '@supabase/supabase-js';

/**
 * Client Supabase con Service Role Key
 * Da usare SOLO lato server per operazioni admin:
 * - Creare utenti
 * - Bypassare RLS
 * - Operazioni dal webhook Stripe
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
