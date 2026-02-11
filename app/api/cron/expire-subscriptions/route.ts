import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/utils/supabase/admin';

/**
 * Cron job: aggiorna le subscription con closing_date scaduta da active → canceled.
 * Da eseguire periodicamente (es. ogni giorno) per gestire casi in cui il webhook
 * Stripe customer.subscription.deleted non è arrivato.
 *
 * Vercel Cron invoca questo endpoint con Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAdmin = createAdminClient();
  const now = new Date().toISOString();

  try {
    // Trova subscription con status attivo e closing_date già passata
    const { data: expired, error } = await supabaseAdmin
      .from('subscriptions')
      .select('id, user_id, closing_date')
      .in('status', ['active', 'trialing', 'past_due'])
      .not('closing_date', 'is', null)
      .lt('closing_date', now);

    if (error) {
      console.error('Cron expire-subscriptions: query error', error);
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }

    if (!expired?.length) {
      return NextResponse.json({ updated: 0, message: 'No expired subscriptions' });
    }

    const ids = expired.map((s) => s.id);

    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'canceled' })
      .in('id', ids);

    if (updateError) {
      console.error('Cron expire-subscriptions: update error', updateError);
      return NextResponse.json(
        { error: 'Update failed', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      updated: expired.length,
      ids,
      message: `Expired ${expired.length} subscription(s)`,
    });
  } catch (err) {
    console.error('Cron expire-subscriptions: error', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
