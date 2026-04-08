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
      .eq('status', 'active')
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
      .update({ stopped_at: new Date().toISOString(), status: 'stopped' })
      .eq('id', existing.id);

    if (stopError) {
      console.error('Stop error:', stopError);
      return NextResponse.json(
        { error: "Errore nel bloccare il percorso" },
        { status: 500 }
      );
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
