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

    // Verifica se iscritto e attivo
    const { data: existing } = await supabaseAdmin
      .from('link_user_disciplines')
      .select('id')
      .eq('user_id', user.id)
      .eq('discipline_id', disciplineId)
      .is('stopped_at', null)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Non sei iscritto a questa disciplina o il percorso è già bloccato' },
        { status: 404 }
      );
    }

    // Blocca il percorso impostando stopped_at
    const { error: stopError } = await supabaseAdmin
      .from('link_user_disciplines')
      .update({ stopped_at: new Date().toISOString() })
      .eq('id', existing.id);

    if (stopError) {
      console.error('Stop error:', stopError);
      return NextResponse.json(
        { error: "Errore nel bloccare il percorso" },
        { status: 500 }
      );
    }

    // Decrementa il contatore partecipanti
    const { data: discipline } = await supabaseAdmin
      .from('disciplines')
      .select('subscribers')
      .eq('id', disciplineId)
      .single();

    if (discipline && discipline.subscribers && discipline.subscribers > 0) {
      await supabaseAdmin
        .from('disciplines')
        .update({ subscribers: discipline.subscribers - 1 })
        .eq('id', disciplineId);
    }

    return NextResponse.json({
      success: true,
      message: 'Percorso bloccato con successo',
    });

  } catch (error) {
    console.error('Stop discipline error:', error);
    return NextResponse.json(
      { error: 'Errore del server. Riprova più tardi.' },
      { status: 500 }
    );
  }
}
