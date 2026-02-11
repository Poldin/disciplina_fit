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
    const { disciplineId } = body;

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

    // Verifica se già iscritto con percorso attivo
    const { data: existing } = await supabaseAdmin
      .from('link_user_disciplines')
      .select('id')
      .eq('user_id', user.id)
      .eq('discipline_id', disciplineId)
      .is('stopped_at', null) // Solo percorsi attivi
      .single();

    if (existing) {
      return NextResponse.json(
        { alreadyJoined: true, message: 'Sei già iscritto a questa disciplina' },
        { status: 200 }
      );
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
