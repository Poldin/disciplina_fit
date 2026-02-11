import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 400 giorni — il massimo consentito dai browser moderni (Chrome cap)
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                maxAge: COOKIE_MAX_AGE,
              })
            );
          } catch {
            // setAll viene chiamato da un Server Component.
            // Si può ignorare se il middleware gestisce il refresh della sessione.
          }
        },
      },
    }
  );
}
