const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

export interface WhatsAppMessage {
  to: string;
  eventName: string;
  photoCount: number;
  galleryLink: string;
  downloadLink: string;
  imageUrls?: string[];
}

export class WhatsAppService {
  async sendPhotoNotification(message: WhatsAppMessage): Promise<void> {
    const text = `🎉 *${message.eventName}*\n\nWe found ${message.photoCount} photo${message.photoCount > 1 ? 's' : ''} of you!\n\n📸 View Gallery: ${message.galleryLink}\n📥 Download HD: ${message.downloadLink}\n\nReply STOP to unsubscribe.`;

    await this.sendTextMessage(message.to, text);

    // Send preview images if provided (max 3)
    if (message.imageUrls && message.imageUrls.length > 0) {
      const imagesToSend = message.imageUrls.slice(0, 3);
      for (const imageUrl of imagesToSend) {
        await this.sendImageMessage(message.to, imageUrl);
      }
    }
  }

  async sendGracePeriodReminder(to: string, eventName: string, daysLeft: number, galleryLink: string): Promise<void> {
    const text = `⏰ *Reminder: ${eventName}*\n\nYour event photos will be available for ${daysLeft} more day${daysLeft > 1 ? 's' : ''}.\n\nDownload your photos now: ${galleryLink}\n\nReply STOP to unsubscribe.`;

    await this.sendTextMessage(to, text);
  }

  private async sendTextMessage(to: string, text: string): Promise<void> {
    const url = `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: text,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WhatsApp API error: ${error}`);
    }
  }

  private async sendImageMessage(to: string, imageUrl: string): Promise<void> {
    const url = `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'image',
        image: {
          link: imageUrl,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WhatsApp API error: ${error}`);
    }
  }

  async sendOTP(to: string, otp: string): Promise<void> {
    const text = `Your FaceFind verification code is: ${otp}\n\nThis code will expire in 10 minutes.`;
    await this.sendTextMessage(to, text);
  }
}

export const whatsappService = new WhatsAppService();
