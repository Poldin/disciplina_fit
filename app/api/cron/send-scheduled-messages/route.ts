import { NextRequest, NextResponse } from 'next/server';
import { sendDueScheduledMessages } from '@/app/utils/sendScheduledMessages';

/**
 * Cron job: invia tutti i messaggi in message_schedule non ancora inviati
 * con send_time_utc <= now (UTC), poi marca is_sent=true sui successi.
 *
 * Vercel Cron invoca questo endpoint con Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendDueScheduledMessages(new Date());
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error('Cron send-scheduled-messages error:', error);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
