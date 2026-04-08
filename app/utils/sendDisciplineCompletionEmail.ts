function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type DisciplineCompletionEmailParams = {
  to: string;
  disciplineTitle: string;
};

export type SendDisciplineCompletionEmailResult =
  | { ok: true }
  | { ok: false; reason: string };

function buildCompletionEmailHtml(params: DisciplineCompletionEmailParams): string {
  const title = escapeHtml(params.disciplineTitle);
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Complimenti! — disciplinaFIT</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e4e4e7;overflow:hidden;">
          <tr>
            <td style="background-color:#18181b;padding:28px 40px;">
              <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">disciplinaFIT</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 16px;">
              <p style="margin:0;font-size:12px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:2px;">Traguardo raggiunto</p>
              <h1 style="margin:10px 0 0;font-size:28px;line-height:1.25;color:#18181b;">Percorso concluso. Ce l'hai fatta!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 30px;">
              <p style="margin:0;font-size:16px;line-height:1.7;color:#3f3f46;">
                Hai completato <strong>${title}</strong>.
                Complimenti per la costanza: il badge resta nel tuo profilo come segno del percorso concluso.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#fafafa;border-top:1px solid #f4f4f5;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">disciplinaFIT · Non rispondere a questa email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendDisciplineCompletionEmail(
  params: DisciplineCompletionEmailParams
): Promise<SendDisciplineCompletionEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, reason: "RESEND_API_KEY missing" };

  const to = params.to?.trim();
  if (!to) return { ok: false, reason: "Empty recipient" };

  const from =
    process.env.RESEND_FROM?.trim() || "disciplinaFIT <team@disciplinafit.it>";

  const html = buildCompletionEmailHtml(params);
  const subject = `Complimenti! Hai completato ${params.disciplineTitle}`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
      }),
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
