import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { createAdminClient } from '@/app/utils/supabase/admin';
import { populateMessageSchedule } from '@/app/utils/messageSchedule';
import { isSubscriptionRequired } from '@/app/utils/subscriptionRequired';
import type { NotificationPlan } from '@/app/utils/messageSchedule';

export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const body = await request.json();
    const { disciplineId, replaceActive } = body;

    if (!disciplineId) {
      return NextResponse.json(
        { error: 'ID disciplina richiesto' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    if (isSubscriptionRequired()) {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!sub) {
        return NextResponse.json(
          { error: 'Abbonamento attivo richiesto per partecipare' },
          { status: 403 }
        );
      }
    }

    // Verifica se già iscritto con percorso attivo a questa stessa disciplina
    const { data: existing } = await supabaseAdmin
      .from('link_user_disciplines')
      .select('id')
      .eq('user_id', user.id)
      .eq('discipline_id', disciplineId)
      .eq('status', 'active')
      .single();

    if (existing) {
      return NextResponse.json(
        { alreadyJoined: true, message: 'Sei già iscritto a questa disciplina' },
        { status: 200 }
      );
    }

    // Blocca tutte le discipline attive dell'utente (una alla volta)
    // Se replaceActive è true, l'utente ha confermato di voler sostituire la disciplina attiva
    const { data: activeDisciplines } = await supabaseAdmin
      .from('link_user_disciplines')
      .select('id, discipline_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (activeDisciplines && activeDisciplines.length > 0) {
      if (!replaceActive) {
        // C'è già una disciplina attiva e l'utente non ha confermato la sostituzione
        return NextResponse.json(
          { error: 'Hai già una disciplina attiva', code: 'ACTIVE_DISCIPLINE_EXISTS' },
          { status: 409 }
        );
      }

      // Blocca tutte le discipline attive
      const now = new Date().toISOString();
      const activeIds = activeDisciplines.map((d) => d.id);

      await supabaseAdmin
        .from('link_user_disciplines')
        .update({ stopped_at: now, status: 'stopped' })
        .in('id', activeIds);
    }

    const { data: disciplineData } = await supabaseAdmin
      .from('disciplines')
      .select('notification_plan')
      .eq('id', disciplineId)
      .single();

    // Crea un nuovo record (anche se esistono record bloccati precedenti)
    const { data: newLink, error: joinError } = await supabaseAdmin
      .from('link_user_disciplines')
      .insert({
        user_id: user.id,
        discipline_id: disciplineId,
        status: 'active',
      })
      .select('id')
      .single();

    if (joinError || !newLink) {
      console.error('Join error:', joinError);
      return NextResponse.json(
        { error: "Errore nell'iscrizione alla disciplina" },
        { status: 500 }
      );
    }

    // Popola message_schedule con notification_plan (day_number = N di day_N; invii da domani UTC)
    const plan = disciplineData?.notification_plan as NotificationPlan | null;
    if (plan) {
      const nowUtc = new Date();
      const scheduleResult = await populateMessageSchedule(supabaseAdmin, newLink.id, plan, nowUtc);
      console.log('[join-discipline] schedule creation result:', {
        linkUserDisciplineId: newLink.id,
        inserted: scheduleResult.inserted,
        error: scheduleResult.error ?? null,
      });
    } else {
      console.warn('[join-discipline] notification_plan assente, schedule non creata', {
        disciplineId,
        linkUserDisciplineId: newLink.id,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Iscritto con successo!',
    });

  } catch (error) {
    console.error('Join discipline error:', error);
    return NextResponse.json(
      { error: 'Errore del server. Riprova più tardi.' },
      { status: 500 }
    );
  }
}
