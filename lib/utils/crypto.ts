import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

export class CryptoService {
  // Hash face template data
  hashFaceTemplate(templateData: string): string {
    return crypto.createHash('sha256').update(templateData).digest('hex');
  }

  // Encrypt sensitive data (phone numbers)
  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex').slice(0, 32),
      iv
    );

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  // Decrypt sensitive data
  decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex').slice(0, 32),
      iv
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Hash passwords
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  // Verify password
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  // Generate temporary password
  generateTempPassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return password;
  }

  // Generate device fingerprint (client-side would send this)
  generateDeviceFingerprint(userAgent: string, ip: string): string {
    return crypto
      .createHash('sha256')
      .update(`${userAgent}${ip}${Date.now()}`)
      .digest('hex');
  }
}

export const cryptoService = new CryptoService();
