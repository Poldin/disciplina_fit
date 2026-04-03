import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";
import { sendFeedbackEmail } from "@/app/utils/sendFeedbackEmail";

const MIN_LEN = 15;
const MAX_LEN = 5000;
const MAX_URL = 2048;

function isValidEmail(s: string): boolean {
  const t = s.trim();
  if (t.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const { message, pageUrl, contactEmail } = body as {
    message?: unknown;
    pageUrl?: unknown;
    contactEmail?: unknown;
  };

  if (typeof message !== "string") {
    return NextResponse.json({ error: "Messaggio non valido" }, { status: 400 });
  }

  const trimmed = message.trim();
  if (trimmed.length < MIN_LEN) {
    return NextResponse.json(
      { error: `Il messaggio deve avere almeno ${MIN_LEN} caratteri` },
      { status: 400 }
    );
  }
  if (trimmed.length > MAX_LEN) {
    return NextResponse.json({ error: "Messaggio troppo lungo" }, { status: 400 });
  }

  let safePageUrl: string | null = null;
  if (typeof pageUrl === "string" && pageUrl.trim()) {
    try {
      const u = new URL(pageUrl.trim().slice(0, MAX_URL));
      const hostOk =
        u.hostname === "www.disciplinafit.it" || u.hostname === "disciplinafit.it";
      const localOk =
        u.hostname === "localhost" || u.hostname === "127.0.0.1";
      if (u.protocol === "https:" && hostOk) {
        safePageUrl = u.href;
      } else if (u.protocol === "http:" && localOk) {
        safePageUrl = u.href;
      }
    } catch {
      /* ignore */
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let replyTo: string | null = null;
  let userEmail: string | null = null;

  if (user) {
    userEmail = user.email ?? null;
    replyTo = userEmail;
  } else {
    if (typeof contactEmail !== "string" || !isValidEmail(contactEmail)) {
      return NextResponse.json(
        {
          error:
            "Per inviare un messaggio senza essere collegato, indica un indirizzo email valido.",
        },
        { status: 400 }
      );
    }
    replyTo = contactEmail.trim();
  }

  const result = await sendFeedbackEmail({
    message: trimmed,
    replyTo,
    userId: user?.id ?? null,
    userEmail,
    pageUrl: safePageUrl,
  });

  if (!result.ok) {
    console.error("[feedback]", result.reason);
    return NextResponse.json(
      { error: "Invio non riuscito. Riprova tra poco." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
