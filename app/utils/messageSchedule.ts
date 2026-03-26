import type { SupabaseClient } from '@supabase/supabase-js';

/** Messaggio nel notification_plan (time in formato "HH:mm") */
export interface NotificationMessage {
  time: string;
  message: string;
}

/** Struttura notification_plan: day_1, day_2, ... */
export type NotificationPlan = Record<string, NotificationMessage[]>;

/**
 * Popola la tabella message_schedule con i messaggi del notification_plan.
 * Il giorno 1 = domani (rispetto a nowUtc), giorno 2 = dopodomani, ecc.
 * Tutti gli orari sono interpretati in UTC.
 *
 * @param supabase - Client admin Supabase
 * @param linkUserDisciplineId - ID del record link_user_disciplines
 * @param notificationPlan - Piano notifiche dalla disciplina
 * @param nowUtc - Momento di riferimento in UTC (default: now)
 */
export async function populateMessageSchedule(
  supabase: SupabaseClient,
  linkUserDisciplineId: number,
  notificationPlan: NotificationPlan | null,
  nowUtc: Date = new Date()
): Promise<{ inserted: number; error?: string }> {
  console.log(
    `[populateMessageSchedule] start linkUserDisciplineId=${linkUserDisciplineId} nowUtc=${nowUtc.toISOString()}`
  );
  if (!notificationPlan || typeof notificationPlan !== 'object') {
    console.warn('[populateMessageSchedule] notificationPlan missing or invalid');
    return { inserted: 0 };
  }

  const entries = Object.entries(notificationPlan)
    .filter(([key]) => /^day_\d+$/.test(key))
    .map(([key, msgs]) => {
      const num = parseInt(key.replace('day_', ''), 10);
      return [num, msgs] as [number, NotificationMessage[]];
    })
    .filter(([, msgs]) => Array.isArray(msgs) && msgs.length > 0)
    .sort((a, b) => a[0] - b[0]);

  if (entries.length === 0) {
    console.warn('[populateMessageSchedule] no valid day_X entries found');
    return { inserted: 0 };
  }

  const rows: {
    send_time_utc: string;
    link_user_discipline_id: number;
    day_number: number;
    metadata: { message: string };
  }[] = [];

  // Domani a mezzanotte UTC
  const startDate = new Date(Date.UTC(
    nowUtc.getUTCFullYear(),
    nowUtc.getUTCMonth(),
    nowUtc.getUTCDate() + 1
  ));

  for (const [dayNum, messages] of entries) {
    // day_1 = startDate, day_2 = startDate + 1, ...
    const dayDate = new Date(startDate);
    dayDate.setUTCDate(dayDate.getUTCDate() + (dayNum - 1));

    for (const msg of messages) {
      const sendTime = parseTimeToUtc(dayDate, msg.time);
      if (!sendTime) {
        console.warn(
          `[populateMessageSchedule] skip invalid time day_${dayNum} time=${msg.time}`
        );
        continue;
      }

      rows.push({
        send_time_utc: sendTime.toISOString(),
        link_user_discipline_id: linkUserDisciplineId,
        day_number: dayNum,
        metadata: { message: msg.message },
      });
    }
  }

  if (rows.length === 0) {
    console.warn('[populateMessageSchedule] built 0 rows after parsing');
    return { inserted: 0 };
  }

  console.log(
    `[populateMessageSchedule] inserting rows=${rows.length} firstSend=${rows[0]?.send_time_utc} lastSend=${rows[rows.length - 1]?.send_time_utc}`
  );

  const { error } = await supabase
    .from('message_schedule')
    .insert(rows);

  if (error) {
    console.error('[populateMessageSchedule] insert error:', error);
    return { inserted: 0, error: error.message };
  }

  console.log(`[populateMessageSchedule] completed inserted=${rows.length}`);
  return { inserted: rows.length };
}

/**
 * Converte "HH:mm" nel timestamp UTC del giorno indicato.
 */
function parseTimeToUtc(dayDate: Date, timeStr: string): Date | null {
  const m = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;

  const hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return new Date(Date.UTC(
    dayDate.getUTCFullYear(),
    dayDate.getUTCMonth(),
    dayDate.getUTCDate(),
    hours,
    minutes,
    0,
    0
  ));
}
