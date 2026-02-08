import { createClient } from '@/app/utils/supabase/server';

/**
 * Genera un codice OTP casuale di 6 cifre
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Salva l'OTP nel database con scadenza
 */
export async function saveOTP(phone: string, otpCode: string): Promise<void> {
  const supabase = await createClient();
  
  // Scadenza: 5 minuti
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5);

  // Invalida tutti gli OTP precedenti per questo numero
  await supabase
    .from('otp_verifications')
    .update({ verified: true })
    .eq('phone', phone)
    .eq('verified', false);

  // Inserisci nuovo OTP
  const { error } = await supabase
    .from('otp_verifications')
    .insert({
      phone,
      otp_code: otpCode,
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    throw new Error(`Failed to save OTP: ${error.message}`);
  }
}

/**
 * Verifica l'OTP fornito dall'utente
 */
export async function verifyOTP(phone: string, otpCode: string): Promise<boolean> {
  const supabase = await createClient();

  // Cerca OTP valido
  const { data, error } = await supabase
    .from('otp_verifications')
    .select('*')
    .eq('phone', phone)
    .eq('otp_code', otpCode)
    .eq('verified', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    // Incrementa tentativi falliti se l'OTP esiste
    const { data: otpRecord } = await supabase
      .from('otp_verifications')
      .select('id, attempts')
      .eq('phone', phone)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpRecord) {
      await supabase
        .from('otp_verifications')
        .update({ attempts: (otpRecord.attempts || 0) + 1 })
        .eq('id', otpRecord.id);
    }

    return false;
  }

  // Segna come verificato
  await supabase
    .from('otp_verifications')
    .update({ verified: true })
    .eq('id', data.id);

  return true;
}

/**
 * Pulisce gli OTP scaduti (da eseguire periodicamente)
 */
export async function cleanupExpiredOTPs(): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('otp_verifications')
    .delete()
    .lt('expires_at', new Date().toISOString());
}

/**
 * Normalizza il numero di telefono nel formato internazionale
 */
export function normalizePhoneNumber(phone: string): string {
  // Rimuove spazi, trattini, parentesi
  let normalized = phone.replace(/[\s\-\(\)]/g, '');
  
  // Se inizia con 00, sostituisci con +
  if (normalized.startsWith('00')) {
    normalized = '+' + normalized.substring(2);
  }
  
  // Se non inizia con +, aggiungi +39 (Italia)
  if (!normalized.startsWith('+')) {
    normalized = '+39' + normalized;
  }
  
  return normalized;
}

/**
 * Valida il formato del numero di telefono
 */
export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  // Formato: +[codice paese][numero] (min 10 cifre totali)
  return /^\+\d{10,15}$/.test(normalized);
}
