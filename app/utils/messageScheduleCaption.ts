/**
 * Orario messaggio da message_schedule (it-IT, fuso locale del browser).
 * Inviato: solo data e ora. Non inviato: "Previsto: …".
 */
export function messageScheduleCaption(
  isSent: boolean,
  sendTimeUtc: string | null | undefined,
  sentAt: string | null | undefined
): string | null {
  const opts: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  if (isSent) {
    const iso = sentAt ?? sendTimeUtc;
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString("it-IT", opts);
  }

  if (!sendTimeUtc) return null;
  const d = new Date(sendTimeUtc);
  if (Number.isNaN(d.getTime())) return null;
  return `Previsto: ${d.toLocaleString("it-IT", opts)}`;
}
