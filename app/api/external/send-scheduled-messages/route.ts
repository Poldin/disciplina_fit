import { NextResponse } from 'next/server';
import { sendDueScheduledMessages } from '@/app/utils/sendScheduledMessages';

/**
 * Endpoint server triggerabile dall'esterno (es. cron Supabase):
 * invia notifiche push (OneSignal) per le righe message_schedule non ancora inviate
 * con send_time_utc <= now (UTC), poi marca is_sent=true sui successi.
 *
 * TODO: ripristinare verifica Authorization (Bearer / secret) prima della produzione pubblica.
 */
export async function POST() {
  try {
    console.log('[external/send-scheduled-messages] trigger accepted');
    const result = await sendDueScheduledMessages(new Date());
    console.log('[external/send-scheduled-messages] result:', result);
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error('[external/send-scheduled-messages] error:', error);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
