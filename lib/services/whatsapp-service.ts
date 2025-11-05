/**
 * WhatsApp Integration Service
 *
 * Uses Twilio API for WhatsApp messaging
 * Features:
 * - Send OTP for phone verification
 * - Send photo match notifications
 * - Send download link reminders
 */

import { fetch } from 'undici';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Twilio sandbox number

interface WhatsAppMessage {
  to: string;
  body: string;
}

export class WhatsAppService {
  private isConfigured(): boolean {
    return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN);
  }

  async sendMessage(to: string, body: string): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('WhatsApp service not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
      return false;
    }

    try {
      // Format phone number for WhatsApp (add whatsapp: prefix if not present)
      const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

      const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

      const params = new URLSearchParams({
        From: TWILIO_WHATSAPP_NUMBER,
        To: formattedTo,
        Body: body,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('WhatsApp send error:', error);
        return false;
      }

      const data = await response.json();
      console.log('WhatsApp message sent:', data.sid);
      return true;
    } catch (error) {
      console.error('WhatsApp service error:', error);
      return false;
    }
  }

  async sendOTP(phoneNumber: string, otp: string): Promise<boolean> {
    const message = `Your FaceFind verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this message.`;

    return await this.sendMessage(phoneNumber, message);
  }

  async sendPhotoMatchNotification(
    phoneNumber: string,
    eventName: string,
    photoCount: number,
    sessionUrl: string
  ): Promise<boolean> {
    const message = `🎉 Great news! We found ${photoCount} photo${photoCount > 1 ? 's' : ''} of you at ${eventName}!\n\nView and download your photos:\n${sessionUrl}\n\nThis link will be available until the event retention period ends.`;

    return await this.sendMessage(phoneNumber, message);
  }

  async sendDownloadReminder(
    phoneNumber: string,
    eventName: string,
    daysRemaining: number,
    sessionUrl: string
  ): Promise<boolean> {
    const message = `⏰ Reminder: Your photos from ${eventName} will be deleted in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}!\n\nDownload them now:\n${sessionUrl}\n\nDon't miss out on your memories!`;

    return await this.sendMessage(phoneNumber, message);
  }

  async sendEventStartNotification(
    phoneNumber: string,
    eventName: string,
    scanUrl: string
  ): Promise<boolean> {
    const message = `📸 ${eventName} is now live!\n\nScan your face to find your photos:\n${scanUrl}\n\nEnjoy the event!`;

    return await this.sendMessage(phoneNumber, message);
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
