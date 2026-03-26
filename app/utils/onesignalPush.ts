/**
 * Invio push server-side (REST). Richiede ONESIGNAL_REST_API_KEY e NEXT_PUBLIC_ONESIGNAL_APP_ID.
 * Target: external_id = Supabase user id (impostato dal client con OneSignal.login).
 */

const ONESIGNAL_NOTIFICATIONS_URL = 'https://api.onesignal.com/notifications';

const DEFAULT_TITLE = 'disciplinaFit';

export type SendPushResult =
  | { ok: true; messageId: string }
  | { ok: false; reason: string };

function getOneSignalServerConfig(): { appId: string; apiKey: string } {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId?.trim() || !apiKey?.trim()) {
    throw new Error(
      'OneSignal server credentials missing: set NEXT_PUBLIC_ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY'
    );
  }
  return { appId: appId.trim(), apiKey: apiKey.trim() };
}

export type SendPushOptions = {
  /** URL assoluto aperto al tap (web / PWA) */
  url?: string;
};

/**
 * Notifica push al singolo utente (web/app) identificato da external_id.
 */
export async function sendPushToExternalUser(
  externalUserId: string,
  body: string,
  title: string = DEFAULT_TITLE,
  options?: SendPushOptions
): Promise<SendPushResult> {
  const { appId, apiKey } = getOneSignalServerConfig();
  const text = body.trim();
  if (!text) {
    return { ok: false, reason: 'Empty notification body' };
  }

  const payload: Record<string, unknown> = {
    app_id: appId,
    target_channel: 'push',
    include_aliases: { external_id: [externalUserId] },
    headings: { it: title, en: title },
    contents: { it: text, en: text },
  };
  const openUrl = options?.url?.trim();
  if (openUrl) {
    payload.url = openUrl;
  }

  const response = await fetch(ONESIGNAL_NOTIFICATIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as { id?: string };
  if (!response.ok) {
    return { ok: false, reason: `HTTP ${response.status}: ${JSON.stringify(data)}` };
  }

  const id = data.id?.trim();
  if (!id) {
    return {
      ok: false,
      reason: 'No delivery (no message id — user may have no push subscription)',
    };
  }

  return { ok: true, messageId: id };
}
