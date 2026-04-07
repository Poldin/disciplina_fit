/**
 * Sblocco giorni percorso: stesso calendario del `send_time_utc` in message_schedule
 * (allineato a populateMessageSchedule, che usa giorni/orari UTC).
 *
 * Il giorno è accessibile quando la data UTC corrente è >= alla data UTC del primo
 * invio programmato per quel day_number (solo giorno, non l'ora esatta).
 */
export function utcCalendarDayKey(d: Date): number {
  return (
    d.getUTCFullYear() * 10_000 +
    (d.getUTCMonth() + 1) * 100 +
    d.getUTCDate()
  );
}

export function isScheduleDayUnlockedByUtcCalendar(
  sendTimeUtcIso: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (sendTimeUtcIso == null || sendTimeUtcIso === "") return false;
  const send = new Date(sendTimeUtcIso);
  if (Number.isNaN(send.getTime())) return false;
  return utcCalendarDayKey(now) >= utcCalendarDayKey(send);
}
