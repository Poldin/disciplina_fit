import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppClient } from '@/app/utils/whatsapp';
import { generateOTP, saveOTP, normalizePhoneNumber, isValidPhoneNumber } from '@/app/utils/otp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    // Validazione input
    if (!phone) {
      return NextResponse.json(
        { error: 'Numero di telefono richiesto' },
        { status: 400 }
      );
    }

    // Normalizza e valida il numero
    const normalizedPhone = normalizePhoneNumber(phone);
    
    if (!isValidPhoneNumber(normalizedPhone)) {
      return NextResponse.json(
        { error: 'Numero di telefono non valido' },
        { status: 400 }
      );
    }

    // Genera OTP
    const otpCode = generateOTP();
    console.log('OTP generato:', otpCode, 'per numero:', normalizedPhone);
    
    // Salva nel database
    await saveOTP(normalizedPhone, otpCode);

    const isTesting = process.env.IS_TESTING === 'true';

    // Invia via WhatsApp
    let whatsappFailed = false;
    if (!isTesting) {
      try {
        const whatsappClient = getWhatsAppClient();
        console.log('Invio WhatsApp a:', normalizedPhone);
        const result = await whatsappClient.sendOTP(normalizedPhone, otpCode);
        console.log('WhatsApp API Response:', JSON.stringify(result, null, 2));
      } catch (whatsappError) {
        console.error('WhatsApp send error:', whatsappError);
        whatsappFailed = true;
      }
    }

    const showOtp = isTesting || whatsappFailed;

    return NextResponse.json({
      success: true,
      message: showOtp
        ? 'Modalità test: usa il codice mostrato qui sotto.'
        : 'Codice OTP inviato via WhatsApp',
      phone: normalizedPhone,
      ...(showOtp && { debugOtp: otpCode }),
    });

  } catch (error) {
    console.error('Request OTP error:', error);
    return NextResponse.json(
      { error: 'Errore del server. Riprova più tardi.' },
      { status: 500 }
    );
  }
}
