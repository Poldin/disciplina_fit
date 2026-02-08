import { type NextRequest } from "next/server";
import { updateSession } from "@/app/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match tutte le route tranne:
     * - _next/static (file statici)
     * - _next/image (ottimizzazione immagini)
     * - favicon.ico, sitemap.xml, robots.txt (file metadata)
     * - File statici con estensioni comuni
     * - api/stripe/webhook (webhook di Stripe - no auth middleware)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
