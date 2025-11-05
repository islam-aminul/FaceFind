/**
 * WhatsApp Integration Service
 *
 * Uses AiSensy API for WhatsApp messaging
 * Features:
 * - Send OTP for phone verification
 * - Send photo match notifications
 * - Send download link reminders
 */

import { fetch } from 'undici';

const AISENSY_API_KEY = process.env.AISENSY_API_KEY;
const AISENSY_BASE_URL = process.env.AISENSY_BASE_URL || 'https://backend.aisensy.com';

// Campaign names configured in AiSensy dashboard
const AISENSY_CAMPAIGN_OTP = process.env.AISENSY_CAMPAIGN_OTP || 'otp_verification';
const AISENSY_CAMPAIGN_PHOTO_MATCH = process.env.AISENSY_CAMPAIGN_PHOTO_MATCH || 'photo_match_notification';
const AISENSY_CAMPAIGN_REMINDER = process.env.AISENSY_CAMPAIGN_REMINDER || 'download_reminder';
const AISENSY_CAMPAIGN_EVENT_START = process.env.AISENSY_CAMPAIGN_EVENT_START || 'event_start_notification';

interface AiSensyMessagePayload {
  apiKey: string;
  campaignName: string;
  destination: string;
  userName: string;
  source?: string;
  media?: {
    url: string;
    filename: string;
  };
  templateParams: string[];
  tags?: string[];
  attributes?: Record<string, any>;
}

export class WhatsAppService {
  private isConfigured(): boolean {
    return !!AISENSY_API_KEY;
  }

  private async sendAiSensyMessage(payload: AiSensyMessagePayload): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('WhatsApp service not configured. Set AISENSY_API_KEY');
      return false;
    }

    try {
      const url = `${AISENSY_BASE_URL}/campaign/t1/api/v2`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          apiKey: AISENSY_API_KEY,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('AiSensy API error:', error);
        return false;
      }

      const data = await response.json();
      console.log('WhatsApp message sent via AiSensy:', data);
      return true;
    } catch (error) {
      console.error('WhatsApp service error:', error);
      return false;
    }
  }

  async sendMessage(to: string, body: string, campaignName: string = AISENSY_CAMPAIGN_PHOTO_MATCH): Promise<boolean> {
    // Format phone number (remove + and any spaces, keep country code)
    const formattedTo = to.replace(/[\s+]/g, '');

    return await this.sendAiSensyMessage({
      apiKey: AISENSY_API_KEY!,
      campaignName,
      destination: formattedTo,
      userName: 'User',
      source: 'FaceFind',
      templateParams: [body],
    });
  }

  async sendOTP(phoneNumber: string, otp: string): Promise<boolean> {
    // AiSensy authentication templates expect OTP code as a parameter
    // The template is pre-configured in AiSensy dashboard
    const formattedPhone = phoneNumber.replace(/[\s+]/g, '');

    return await this.sendAiSensyMessage({
      apiKey: AISENSY_API_KEY!,
      campaignName: AISENSY_CAMPAIGN_OTP,
      destination: formattedPhone,
      userName: 'User',
      source: 'FaceFind',
      templateParams: [otp], // OTP code
    });
  }

  async sendPhotoMatchNotification(
    phoneNumber: string,
    eventName: string,
    photoCount: number,
    sessionUrl: string
  ): Promise<boolean> {
    // Template parameters: eventName, photoCount, sessionUrl
    const formattedPhone = phoneNumber.replace(/[\s+]/g, '');

    return await this.sendAiSensyMessage({
      apiKey: AISENSY_API_KEY!,
      campaignName: AISENSY_CAMPAIGN_PHOTO_MATCH,
      destination: formattedPhone,
      userName: 'User',
      source: 'FaceFind',
      templateParams: [eventName, photoCount.toString(), sessionUrl],
      tags: ['photo_match'],
    });
  }

  async sendDownloadReminder(
    phoneNumber: string,
    eventName: string,
    daysRemaining: number,
    sessionUrl: string
  ): Promise<boolean> {
    // Template parameters: eventName, daysRemaining, sessionUrl
    const formattedPhone = phoneNumber.replace(/[\s+]/g, '');

    return await this.sendAiSensyMessage({
      apiKey: AISENSY_API_KEY!,
      campaignName: AISENSY_CAMPAIGN_REMINDER,
      destination: formattedPhone,
      userName: 'User',
      source: 'FaceFind',
      templateParams: [eventName, daysRemaining.toString(), sessionUrl],
      tags: ['reminder'],
    });
  }

  async sendEventStartNotification(
    phoneNumber: string,
    eventName: string,
    scanUrl: string
  ): Promise<boolean> {
    // Template parameters: eventName, scanUrl
    const formattedPhone = phoneNumber.replace(/[\s+]/g, '');

    return await this.sendAiSensyMessage({
      apiKey: AISENSY_API_KEY!,
      campaignName: AISENSY_CAMPAIGN_EVENT_START,
      destination: formattedPhone,
      userName: 'User',
      source: 'FaceFind',
      templateParams: [eventName, scanUrl],
      tags: ['event_start'],
    });
  }
}

export const whatsappService = new WhatsAppService();

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store OTP in memory (in production, use Redis or DynamoDB with TTL)
 */
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

export function storeOTP(phoneNumber: string, otp: string, expiryMinutes: number = 10): void {
  const expiresAt = Date.now() + expiryMinutes * 60 * 1000;
  otpStore.set(phoneNumber, { otp, expiresAt });

  // Clean up expired OTPs
  setTimeout(() => {
    otpStore.delete(phoneNumber);
  }, expiryMinutes * 60 * 1000);
}

export function verifyOTP(phoneNumber: string, otp: string): boolean {
  const stored = otpStore.get(phoneNumber);

  if (!stored) {
    return false;
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phoneNumber);
    return false;
  }

  if (stored.otp !== otp) {
    return false;
  }

  // OTP is valid, remove it
  otpStore.delete(phoneNumber);
  return true;
}
