import { NextRequest, NextResponse } from 'next/server';
import { sendDueScheduledMessages } from '@/app/utils/sendScheduledMessages';

/**
 * Endpoint server triggerabile dall'esterno:
 * invia notifiche push (OneSignal) per le righe message_schedule non ancora inviate
 * con send_time_utc <= now (UTC), poi marca is_sent=true sui successi.
 *
 * Protezione: Authorization: Bearer <SCHEDULE_TRIGGER_SECRET>
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.SCHEDULE_TRIGGER_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    console.warn('[external/send-scheduled-messages] unauthorized request', {
      hasExpectedSecret: Boolean(expectedSecret),
      authHeaderPresent: Boolean(authHeader),
      authHeaderPrefix: authHeader ? authHeader.slice(0, 7) : null, // e.g. "Bearer "
      authHeaderLen: authHeader ? authHeader.length : 0,
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
