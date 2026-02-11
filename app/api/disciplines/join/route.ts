import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { createAdminClient } from '@/app/utils/supabase/admin';

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

    // Verifica abbonamento con accesso (active, trialing, past_due)
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

    // Verifica se già iscritto con percorso attivo a questa stessa disciplina
    const { data: existing } = await supabaseAdmin
      .from('link_user_disciplines')
      .select('id')
      .eq('user_id', user.id)
      .eq('discipline_id', disciplineId)
      .is('stopped_at', null)
      .single();

    if (existing) {
      return NextResponse.json(
        { alreadyJoined: true, message: 'Sei già iscritto a questa disciplina' },
        { status: 200 }
      );
    }

    // Blocca tutte le discipline attive dell'utente (una alla volta)
    // Se replaceActive è true, l'utente ha confermato di voler sostituire la challenge attiva
    const { data: activeDisciplines } = await supabaseAdmin
      .from('link_user_disciplines')
      .select('id, discipline_id')
      .eq('user_id', user.id)
      .is('stopped_at', null);

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
        .update({ stopped_at: now })
        .in('id', activeIds);

      // Decrementa i contatori partecipanti delle discipline bloccate
      for (const active of activeDisciplines) {
        const { data: disc } = await supabaseAdmin
          .from('disciplines')
          .select('subscribers')
          .eq('id', active.discipline_id)
          .single();

        if (disc && disc.subscribers && disc.subscribers > 0) {
          await supabaseAdmin
            .from('disciplines')
            .update({ subscribers: disc.subscribers - 1 })
            .eq('id', active.discipline_id);
        }
      }
    }

    // Crea un nuovo record (anche se esistono record bloccati precedenti)
    const { error: joinError } = await supabaseAdmin
      .from('link_user_disciplines')
      .insert({
        user_id: user.id,
        discipline_id: disciplineId,
      });

    if (joinError) {
      console.error('Join error:', joinError);
      return NextResponse.json(
        { error: "Errore nell'iscrizione alla disciplina" },
        { status: 500 }
      );
    }

    // Incrementa il contatore partecipanti
    const { data: discipline } = await supabaseAdmin
      .from('disciplines')
      .select('subscribers')
      .eq('id', disciplineId)
      .single();

    if (discipline) {
      await supabaseAdmin
        .from('disciplines')
        .update({ subscribers: (discipline.subscribers || 0) + 1 })
        .eq('id', disciplineId);
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
