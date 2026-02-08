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

    // Gestisci body opzionale (può essere vuoto dalla home page)
    let disciplineSlug: string | undefined;
    try {
      const body = await request.json();
      disciplineSlug = body.disciplineSlug;
    } catch {
      // Body vuoto o non JSON - va bene, disciplineSlug sarà undefined
      disciplineSlug = undefined;
    }

    const supabaseAdmin = createAdminClient();

    // Controlla se ha già un abbonamento attivo
    const { data: activeSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (activeSub) {
      return NextResponse.json(
        { error: 'Hai già un abbonamento attivo' },
        { status: 400 }
      );
    }

    // Cerca Stripe Customer ID esistente nel profilo
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('metadata')
      .eq('id', user.id)
      .single();

    let customerId = (profile?.metadata as Record<string, string> | null)?.stripe_customer_id;

    if (!customerId) {
      // Crea nuovo Stripe Customer
      const customer = await stripe.customers.create({
        phone: user.phone || undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Salva customer ID nel profilo
      await supabaseAdmin
        .from('profiles')
        .update({
          metadata: {
            ...(profile?.metadata as Record<string, unknown> || {}),
            stripe_customer_id: customerId,
          },
        })
        .eq('id', user.id);
    }

    // URL di ritorno
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const returnPath = disciplineSlug
      ? `/disciplina/${disciplineSlug}`
      : '/';

    // Crea sessione Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${origin}${returnPath}?checkout=success`,
      cancel_url: `${origin}${returnPath}?checkout=cancel`,
      metadata: {
        supabase_user_id: user.id,
        discipline_slug: disciplineSlug || '',
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error('Create checkout session error:', error);
    return NextResponse.json(
      { error: 'Errore nella creazione della sessione di pagamento' },
      { status: 500 }
    );
  }
}
