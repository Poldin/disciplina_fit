/**
 * Etichetta orario per messaggio da message_schedule (it-IT, fuso locale del browser).
 * is_sent + sent_at → invio effettivo; altrimenti send_time_utc → previsto.
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
    return `Invio effettivo: ${d.toLocaleString("it-IT", opts)}`;
  }

  if (!sendTimeUtc) return null;
  const d = new Date(sendTimeUtc);
  if (Number.isNaN(d.getTime())) return null;
  return `Invio previsto: ${d.toLocaleString("it-IT", opts)}`;
}
