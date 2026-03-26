import { NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { createAdminClient } from '@/app/utils/supabase/admin';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json({ success: true, isNewUser: false });
    }

    // Crea il profilo; la colonna phone (NOT NULL UNIQUE) ospita l'email
    // finché lo schema non viene aggiornato con una colonna email dedicata.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: user.id,
        user_id: user.id,
        phone: user.email,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return NextResponse.json(
        { error: "Errore nella creazione del profilo" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, isNewUser: true });

  } catch (error) {
    console.error('Ensure profile error:', error);
    return NextResponse.json(
      { error: 'Errore del server. Riprova più tardi.' },
      { status: 500 }
    );
  }
}
