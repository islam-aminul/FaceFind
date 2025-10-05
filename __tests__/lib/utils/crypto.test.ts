import { cryptoService } from '@/lib/utils/crypto';

describe('CryptoService', () => {
  describe('hashFaceTemplate', () => {
    it('should generate consistent hash for same input', () => {
      const input = 'test-face-template';
      const hash1 = cryptoService.hashFaceTemplate(input);
      const hash2 = cryptoService.hashFaceTemplate(input);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = cryptoService.hashFaceTemplate('template1');
      const hash2 = cryptoService.hashFaceTemplate('template2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const originalText = '+91 9876543210';
      const encrypted = cryptoService.encrypt(originalText);
      const decrypted = cryptoService.decrypt(encrypted);

      expect(decrypted).toBe(originalText);
      expect(encrypted).not.toBe(originalText);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const text = 'secret message';
      const encrypted1 = cryptoService.encrypt(text);
      const encrypted2 = cryptoService.encrypt(text);

      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same value
      expect(cryptoService.decrypt(encrypted1)).toBe(text);
      expect(cryptoService.decrypt(encrypted2)).toBe(text);
    });
  });

  describe('password hashing', () => {
    it('should hash password', async () => {
      const password = 'SecurePassword123!';
      const hash = await cryptoService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should verify correct password', async () => {
      const password = 'SecurePassword123!';
      const hash = await cryptoService.hashPassword(password);
      const isValid = await cryptoService.verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'SecurePassword123!';
      const hash = await cryptoService.hashPassword(password);
      const isValid = await cryptoService.verifyPassword('WrongPassword', hash);

      expect(isValid).toBe(false);
    });
  });

  describe('generateTempPassword', () => {
    it('should generate password of correct length', () => {
      const password = cryptoService.generateTempPassword();

      expect(password).toHaveLength(12);
    });

    it('should generate different passwords', () => {
      const password1 = cryptoService.generateTempPassword();
      const password2 = cryptoService.generateTempPassword();

      expect(password1).not.toBe(password2);
    });

    it('should contain mixed characters', () => {
      const password = cryptoService.generateTempPassword();

      // Should contain at least some variety
      expect(password).toMatch(/[a-zA-Z]/);
      expect(password).toMatch(/[0-9!@#$%^&*]/);
    });
  });
});
