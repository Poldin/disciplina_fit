/**
 * WhatsApp Business API Client
 * Documentazione: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

interface WhatsAppMessageResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

export class WhatsAppClient {
  private token: string;
  private phoneNumberId: string;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor() {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_NUMBER_ID;

    if (!token || !phoneNumberId) {
      throw new Error('WhatsApp credentials not configured');
    }

    this.token = token;
    this.phoneNumberId = phoneNumberId;
  }

  /**
   * Invia un messaggio di testo via WhatsApp
   */
  async sendTextMessage(to: string, text: string): Promise<WhatsAppMessageResponse> {
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace(/\+/g, ''), // Rimuove il + dal numero
        type: 'text',
        text: {
          body: text,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`WhatsApp API Error: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  /**
   * Invia OTP via WhatsApp
   */
  async sendOTP(phoneNumber: string, otpCode: string): Promise<WhatsAppMessageResponse> {
    const message = `🔐 *disciplinaFit*\n\nIl tuo codice di verifica è: *${otpCode}*\n\nValido per 5 minuti.\n\nNon condividere questo codice con nessuno.`;
    
    return this.sendTextMessage(phoneNumber, message);
  }

  /**
   * Invia messaggio di benvenuto a nuovo utente
   */
  async sendWelcomeMessage(phoneNumber: string): Promise<WhatsAppMessageResponse> {
    const message = `🎉 *Benvenuto in disciplinaFit!*\n\nSei pronto a prenderti cura di te, con disciplina?\n\nInizia subito la tua prima challenge!`;
    
    return this.sendTextMessage(phoneNumber, message);
  }
}

// Export factory function invece di singleton per evitare errori a build time
export function getWhatsAppClient(): WhatsAppClient {
  return new WhatsAppClient();
}
