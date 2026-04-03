import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    messageId?: string;
    messageContent?: string;
    reporterName?: string | null;
    reason?: string | null;
    pageUrl?: string | null;
  };

  const { messageId, messageContent, reporterName, reason, pageUrl } = body;

  if (!messageId || !messageContent) {
    return NextResponse.json({ ok: false, reason: "Missing fields" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: "Email not configured" }, { status: 500 });
  }

  const from =
    process.env.RESEND_FROM?.trim() || "disciplinaFIT <team@disciplinafit.it>";

  const reasonBlock =
    reason?.trim()
      ? `<p style="margin:16px 0 0;font-size:13px;color:#52525b;"><strong>Motivazione</strong><br />${escapeHtml(reason.trim())}</p>`
      : `<p style="margin:16px 0 0;font-size:13px;color:#a1a1aa;"><em>Nessuna motivazione fornita</em></p>`;

  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafafa;color:#18181b;">
  <p style="margin:0 0 12px;font-size:16px;font-weight:700;">🚨 Segnalazione commento — disciplinaFIT</p>
  <div style="background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:20px;">
    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#52525b;">Commento segnalato</p>
    <p style="margin:0;font-size:15px;line-height:1.5;background:#f4f4f5;border-radius:8px;padding:12px;">${escapeHtml(messageContent)}</p>
    ${reasonBlock}
    <p style="margin:16px 0 0;font-size:13px;color:#71717a;">
      <strong>ID messaggio</strong>: ${escapeHtml(messageId)}<br />
      <strong>Segnalato da</strong>: ${escapeHtml(reporterName ?? "Utente anonimo")} (${escapeHtml(user.id)})<br />
      ${pageUrl ? `<strong>Pagina</strong>: ${escapeHtml(pageUrl)}` : ""}
    </p>
  </div>
</body>
</html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: ["oloapiccoli@gmail.com"],
        subject: "[disciplinaFIT] Segnalazione commento",
        html,
      }),
    });

    const data = (await response.json()) as { message?: string };
    if (!response.ok) {
      console.error("[chat/report] Resend error:", data);
      return NextResponse.json({ ok: false, reason: "Email failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[chat/report] fetch error:", err);
    return NextResponse.json({ ok: false, reason: "Network error" }, { status: 500 });
  }
}
