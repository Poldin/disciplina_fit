import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/app/utils/stripe';
import { createAdminClient } from '@/app/utils/supabase/admin';
import Stripe from 'stripe';

/**
 * Estrae la data di fine periodo corrente da una subscription Stripe.
 * In Stripe SDK v20+, current_period_end è su SubscriptionItem, non su Subscription.
 */
function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  const item = subscription.items?.data?.[0];
  if (item?.current_period_end) {
    return new Date(item.current_period_end * 1000).toISOString();
  }
  return null;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();

  try {
    switch (event.type) {
      // Checkout completato: l'utente ha pagato
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const subscriptionId = session.subscription as string;

        if (userId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const closingDate = getSubscriptionPeriodEnd(subscription);

          // Verifica se esiste già un record subscription per questo utente
          const { data: existingSub } = await supabaseAdmin
            .from('subscriptions')
            .select('id')
            .eq('user_id', userId)
            .single();

          if (existingSub) {
            // Aggiorna subscription esistente
            await supabaseAdmin
              .from('subscriptions')
              .update({
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: subscriptionId,
                status: subscription.status,
                closing_date: closingDate,
              })
              .eq('user_id', userId);
          } else {
            // Crea nuovo record subscription
            await supabaseAdmin
              .from('subscriptions')
              .insert({
                user_id: userId,
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: subscriptionId,
                status: subscription.status,
                closing_date: closingDate,
              });
          }
        }
        break;
      }

      // Subscription aggiornata (rinnovo, cambio piano, ecc.)
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        const closingDate = getSubscriptionPeriodEnd(subscription);

        if (userId) {
          await supabaseAdmin
            .from('subscriptions')
            .update({
              status: subscription.status,
              closing_date: closingDate,
            })
            .eq('stripe_subscription_id', subscription.id);
        }
        break;
      }

      // Subscription cancellata
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'canceled',
          })
          .eq('stripe_subscription_id', subscription.id);
        break;
      }

      // Pagamento fattura fallito
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        // In Stripe v20+, subscription è in parent.subscription_details
        const subDetails = invoice.parent?.subscription_details;
        const subscriptionId = typeof subDetails?.subscription === 'string'
          ? subDetails.subscription
          : subDetails?.subscription?.id;

        if (subscriptionId) {
          await supabaseAdmin
            .from('subscriptions')
            .update({
              status: 'past_due',
            })
            .eq('stripe_subscription_id', subscriptionId);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
