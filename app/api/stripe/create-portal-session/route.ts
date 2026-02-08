import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { createAdminClient } from '@/app/utils/supabase/admin';
import { stripe } from '@/app/utils/stripe';

export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    // Cerca lo Stripe Customer ID
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .not('stripe_customer_id', 'is', null)
      .single();

    if (!sub?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Nessun abbonamento trovato' },
        { status: 404 }
      );
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000';

    // Crea sessione portale Stripe per gestire abbonamento
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: origin,
    });

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error('Create portal session error:', error);
    return NextResponse.json(
      { error: 'Errore nella creazione della sessione' },
      { status: 500 }
    );
  }
}
