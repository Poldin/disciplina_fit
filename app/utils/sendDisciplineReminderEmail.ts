/**
 * Backup email per promemoria disciplina (Resend).
 * Fallimenti non devono impattare il flusso principale (push già riuscita).
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatBodyAsHtml(text: string): string {
  const escaped = escapeHtml(text.trim());
  return escaped.replace(/\r\n|\r|\n/g, '<br />');
}

export type DisciplineReminderEmailParams = {
  to: string;
  subject: string;
  disciplineTitle: string;
  bodyText: string;
  openUrl?: string;
  /** Solo HTTPS, come per OneSignal */
  heroImageUrl?: string;
};

function buildReminderEmailHtml(params: DisciplineReminderEmailParams): string {
  const title = escapeHtml(params.disciplineTitle);
  const bodyHtml = formatBodyAsHtml(params.bodyText);
  const openUrl = params.openUrl?.trim();
  const safeHref =
    openUrl && openUrl.startsWith('https://') ? escapeHtml(openUrl) : '';
  const imgUrl = params.heroImageUrl?.trim();
  const heroBlock =
    imgUrl && imgUrl.startsWith('https://')
      ? `<tr>
            <td style="padding:0 40px 24px;">
              <img src="${escapeHtml(imgUrl)}" alt="" width="560" style="display:block;width:100%;max-width:100%;height:auto;border-radius:12px;border:1px solid #e4e4e7;" />
            </td>
          </tr>`
      : '';

  const ctaRow =
    safeHref !== ''
      ? `<tr>
            <td style="padding:0 40px 36px;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="border-radius:12px;background-color:#10b981;">
                    <a href="${safeHref}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">
                      Apri il contenuto
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — disciplinaFIT</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #e4e4e7;overflow:hidden;">
          <tr>
            <td style="background-color:#18181b;padding:28px 40px;">
              <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">disciplinaFIT</p>
              <p style="margin:4px 0 0;font-size:12px;color:#a1a1aa;letter-spacing:0.5px;text-transform:uppercase;">Prenditi cura di te, con disciplina.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 16px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.5px;line-height:1.3;">
                ${title}
              </h1>
              <p style="margin:8px 0 0;font-size:13px;color:#a1a1aa;">
                Promemoria del percorso
              </p>
            </td>
          </tr>
          ${heroBlock}
          <tr>
            <td style="padding:0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#f4f4f5;border-radius:12px;border:2px solid #10b981;padding:24px 20px;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:2px;">
                      Messaggio
                    </p>
                    <p style="margin:12px 0 0;font-size:15px;color:#3f3f46;line-height:1.7;">
                      ${bodyHtml}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${ctaRow}
          <tr>
            <td style="padding:0 40px 32px;">
              <p style="margin:0;font-size:13px;color:#a1a1aa;line-height:1.7;">
                Ti abbiamo inviato anche una notifica sull&apos;app: questa email è un backup se non la vedi.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#fafafa;border-top:1px solid #f4f4f5;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                disciplinaFIT &nbsp;·&nbsp; Non rispondere a questa email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type SendDisciplineReminderEmailResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Invia email via Resend. Non lancia: restituisce esito per logging.
 */
export async function sendDisciplineReminderEmail(
  params: DisciplineReminderEmailParams
): Promise<SendDisciplineReminderEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, reason: 'RESEND_API_KEY missing' };
  }

  const to = params.to?.trim();
  if (!to) {
    return { ok: false, reason: 'Empty recipient' };
  }

  const from =
    process.env.RESEND_FROM?.trim() || 'disciplinaFIT <team@disciplinafit.it>';

  const subject = params.subject?.trim() || 'disciplinaFIT';
  const html = buildReminderEmailHtml(params);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
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
