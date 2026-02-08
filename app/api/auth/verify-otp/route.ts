import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { createAdminClient } from '@/app/utils/supabase/admin';
import { verifyOTP, normalizePhoneNumber } from '@/app/utils/otp';
import { getWhatsAppClient } from '@/app/utils/whatsapp';
import { createHmac } from 'crypto';

/**
 * Genera una email interna deterministica dal numero di telefono.
 * L'utente non la vede mai: serve solo come identificatore per Supabase Auth.
 */
function getInternalEmail(phone: string): string {
  // +393461234567 → 393461234567@phone.disciplinafit.app
  return `${phone.replace(/\+/g, '')}@phone.disciplinafit.app`;
}

/**
 * Genera una password deterministica dal numero di telefono.
 * Sicura perché solo il server conosce la chiave (SUPABASE_SERVICE_ROLE_KEY).
 * L'utente non deve mai conoscere questa password: il login avviene solo via OTP.
 */
function getDeterministicPassword(phone: string): string {
  return createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!)
    .update(phone)
    .digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, otp } = body;

    // Validazione input
    if (!phone || !otp) {
      return NextResponse.json(
        { error: 'Numero di telefono e codice OTP richiesti' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhoneNumber(phone);

    // Verifica OTP
    const isValid = await verifyOTP(normalizedPhone, otp);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Codice OTP non valido o scaduto' },
        { status: 401 }
      );
    }

    // OTP valido - Procedi con autenticazione
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();
    const email = getInternalEmail(normalizedPhone);
    const password = getDeterministicPassword(normalizedPhone);

    // Cerca utente esistente per numero di telefono
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone', normalizedPhone)
      .single();

    let isNewUser = false;

    if (!existingProfile) {
      // === NUOVO UTENTE ===
      isNewUser = true;

      // Crea utente via Admin API con email interna (non richiede provider Phone)
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        password,
        user_metadata: { phone: normalizedPhone },
      });

      if (createError || !authData.user) {
        console.error('Create user error:', createError);
        return NextResponse.json(
          { error: "Errore nella creazione dell'account" },
          { status: 500 }
        );
      }

      // Forza la conferma email (bypass impostazione "Confirm email" di Supabase)
      await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
        email_confirm: true,
      });

      // Crea profilo
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authData.user.id,
          phone: normalizedPhone,
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }

      // Invia messaggio di benvenuto via WhatsApp
      const isTesting = process.env.IS_TESTING === 'true';
      if (!isTesting) {
        try {
          const whatsappClient = getWhatsAppClient();
          await whatsappClient.sendWelcomeMessage(normalizedPhone);
        } catch (welcomeError) {
          console.error('Welcome message error:', welcomeError);
        }
      }
    } else {
      // === UTENTE ESISTENTE ===
      // Aggiorna password, email e conferma per allinearli allo schema corrente
      await supabaseAdmin.auth.admin.updateUserById(existingProfile.id, {
        email,
        email_confirm: true,
        password,
      });
    }

    // Login con email interna (non richiede provider Phone attivo)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('Sign in error:', signInError);
      return NextResponse.json(
        { error: "Errore nell'accesso. Riprova." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isNewUser,
      message: isNewUser ? 'Account creato con successo!' : 'Login effettuato!',
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Errore del server. Riprova più tardi.' },
      { status: 500 }
    );
  }
}
