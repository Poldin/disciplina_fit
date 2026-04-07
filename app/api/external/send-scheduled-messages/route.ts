import { NextResponse } from 'next/server';
import { sendDueScheduledMessages } from '@/app/utils/sendScheduledMessages';

/**
 * Endpoint server triggerabile dall'esterno (es. cron Supabase):
 * per ogni message_schedule in scadenza tenta push (OneSignal) e email (Resend) in modo indipendente;
 * marca is_sent=true se almeno un canale ha successo.
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
