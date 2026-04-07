/**
 * Storico invii push/email in message_schedule.metadata.delivery_log
 */

export type ScheduleDeliveryLogEntry = {
  channel: 'push' | 'email';
  status: 'success' | 'error' | 'skipped';
  /** ISO 8601 UTC */
  at: string;
  /** Errore, eccezione, motivo skip, note operative */
  note?: string;
  /** OneSignal notification id se push riuscita */
  onesignal_id?: string;
};

export function appendScheduleDeliveryLog(
  currentMetadata: unknown,
  entries: ScheduleDeliveryLogEntry[]
): Record<string, unknown> {
  const base =
    currentMetadata &&
    typeof currentMetadata === 'object' &&
    !Array.isArray(currentMetadata)
      ? { ...(currentMetadata as Record<string, unknown>) }
      : {};
  const prev = Array.isArray(base.delivery_log)
    ? [...(base.delivery_log as ScheduleDeliveryLogEntry[])]
    : [];
  base.delivery_log = [...prev, ...entries];
  return base;
}
