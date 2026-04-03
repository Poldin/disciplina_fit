/**
 * Invio feedback / segnalazioni tramite Resend.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatBodyAsHtml(text: string): string {
  const escaped = escapeHtml(text.trim());
  return escaped.replace(/\r\n|\r|\n/g, "<br />");
}

const DEFAULT_FEEDBACK_TO = "oloapiccoli@gmail.com";

export type SendFeedbackEmailParams = {
  message: string;
  /** Email per reply-to (utente loggato o campo contatto) */
  replyTo?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  pageUrl?: string | null;
};

export type SendFeedbackEmailResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function sendFeedbackEmail(
  params: SendFeedbackEmailParams
): Promise<SendFeedbackEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, reason: "RESEND_API_KEY missing" };
  }

  const to =
    process.env.FEEDBACK_TO_EMAIL?.trim() || DEFAULT_FEEDBACK_TO;
  if (!to) {
    return { ok: false, reason: "Empty recipient" };
  }

  const from =
    process.env.RESEND_FROM?.trim() || "disciplinaFIT <team@disciplinafit.it>";

  const messageHtml = formatBodyAsHtml(params.message);
  const pageUrl = params.pageUrl?.trim();
  const pageBlock =
    pageUrl && pageUrl.length <= 2048
      ? `<p style="margin:16px 0 0;font-size:13px;color:#71717a;"><strong>Pagina</strong><br />${escapeHtml(pageUrl)}</p>`
      : "";

  const metaLines: string[] = [];
  if (params.userId) {
    metaLines.push(`<strong>User ID</strong>: ${escapeHtml(params.userId)}`);
  }
  if (params.userEmail) {
    metaLines.push(`<strong>Email account</strong>: ${escapeHtml(params.userEmail)}`);
  }
  const metaBlock =
    metaLines.length > 0
      ? `<p style="margin:16px 0 0;font-size:13px;color:#71717a;">${metaLines.join("<br />")}</p>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafafa;color:#18181b;">
  <p style="margin:0 0 12px;font-size:16px;font-weight:700;">Feedback da disciplinaFIT</p>
  <div style="background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:20px;">
    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#52525b;">Messaggio</p>
    <p style="margin:0;font-size:15px;line-height:1.5;">${messageHtml}</p>
    ${metaBlock}
    ${pageBlock}
  </div>
</body>
</html>`;

  const replyTo = params.replyTo?.trim();
  const payload: Record<string, unknown> = {
    from,
    to: [to],
    subject: "[disciplinaFIT] Aiutaci a migliorare",
    html,
  };
  if (replyTo && replyTo.includes("@")) {
    payload.reply_to = replyTo;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { message?: string };
    if (!response.ok) {
      return {
        ok: false,
        reason: `HTTP ${response.status}: ${JSON.stringify(data)}`,
      };
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: msg };
  }
}
