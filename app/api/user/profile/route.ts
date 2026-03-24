import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

const MAX_NAME_LENGTH = 50;

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const body = await request.json();
    const { user_name: userName } = body;

    if (typeof userName !== 'string') {
      return NextResponse.json(
        { error: 'Nome richiesto' },
        { status: 400 }
      );
    }

    const trimmed = userName.trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: 'Il nome non può essere vuoto' },
        { status: 400 }
      );
    }

    if (trimmed.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Il nome non può superare ${MAX_NAME_LENGTH} caratteri` },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('profiles')
      .update({ user_name: trimmed })
      .eq('id', user.id);

    if (error) {
      console.error('Profile update error:', error);
      return NextResponse.json(
        { error: "Errore nell'aggiornamento del profilo" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Nome salvato!',
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Errore del server. Riprova più tardi.' },
      { status: 500 }
    );
  }
}
