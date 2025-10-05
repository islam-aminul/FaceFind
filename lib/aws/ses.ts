import { SendEmailCommand } from '@aws-sdk/client-ses';
import { sesClient } from './config';

const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@facefind.com';

export class SESService {
  async sendEmail(
    to: string[],
    subject: string,
    htmlBody: string,
    textBody?: string
  ): Promise<void> {
    await sesClient.send(
      new SendEmailCommand({
        Source: FROM_EMAIL,
        Destination: {
          ToAddresses: to,
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8',
            },
            Text: textBody
              ? {
                  Data: textBody,
                  Charset: 'UTF-8',
                }
              : undefined,
          },
        },
      })
    );
  }

  async sendInvitationEmail(email: string, role: string, tempPassword: string): Promise<void> {
    const subject = 'Welcome to FaceFind - Your Account Details';
    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to FaceFind!</h2>
          <p>An account has been created for you as a <strong>${role}</strong>.</p>
          <p>Here are your login credentials:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> ${tempPassword}</p>
          </div>
          <p>Please log in at <a href="${process.env.NEXT_PUBLIC_APP_URL}">${process.env.NEXT_PUBLIC_APP_URL}</a> and change your password immediately.</p>
          <p>If you have any questions, please contact our support team.</p>
          <br>
          <p>Best regards,<br>The FaceFind Team</p>
        </body>
      </html>
    `;
    const textBody = `Welcome to FaceFind!\n\nAn account has been created for you as a ${role}.\n\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nPlease log in and change your password immediately.`;

    await this.sendEmail([email], subject, htmlBody, textBody);
  }

  async sendPhotographerAssignmentEmail(
    photographerEmail: string,
    photographerName: string,
    eventName: string,
    eventDate: string
  ): Promise<void> {
    const subject = `New Event Assignment: ${eventName}`;
    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Event Assignment</h2>
          <p>Hi ${photographerName},</p>
          <p>You have been assigned to photograph the following event:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
            <p><strong>Event:</strong> ${eventName}</p>
            <p><strong>Date:</strong> ${eventDate}</p>
          </div>
          <p>Log in to your dashboard to view event details and start uploading photos.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/photographer" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Go to Dashboard</a></p>
          <br>
          <p>Best regards,<br>The FaceFind Team</p>
        </body>
      </html>
    `;

    await this.sendEmail([photographerEmail], subject, htmlBody);
  }

  async sendSuspensionEmail(email: string, name: string): Promise<void> {
    const subject = 'Account Suspended - FaceFind';
    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Account Suspended</h2>
          <p>Hi ${name},</p>
          <p>Your FaceFind photographer account has been suspended.</p>
          <p>If you believe this is a mistake, please contact our support team.</p>
          <br>
          <p>Best regards,<br>The FaceFind Team</p>
        </body>
      </html>
    `;

    await this.sendEmail([email], subject, htmlBody);
  }

  async sendReactivationEmail(email: string, name: string): Promise<void> {
    const subject = 'Account Reactivated - FaceFind';
    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Account Reactivated</h2>
          <p>Hi ${name},</p>
          <p>Your FaceFind photographer account has been reactivated.</p>
          <p>You can now log in and access your dashboard.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/photographer" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Go to Dashboard</a></p>
          <br>
          <p>Best regards,<br>The FaceFind Team</p>
        </body>
      </html>
    `;

    await this.sendEmail([email], subject, htmlBody);
  }
}

export const emailService = new SESService();
