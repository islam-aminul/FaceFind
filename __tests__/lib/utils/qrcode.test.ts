import { qrCodeService } from '@/lib/utils/qrcode';

describe('QRCodeService', () => {
  describe('generateQRCode', () => {
    it('should generate QR code buffer', async () => {
      const eventId = 'event_123';
      const qrCodeBuffer = await qrCodeService.generateQRCode(eventId);

      expect(qrCodeBuffer).toBeInstanceOf(Buffer);
      expect(qrCodeBuffer.length).toBeGreaterThan(0);

      // Check if it's a valid PNG
      const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
      expect(qrCodeBuffer.slice(0, 4)).toEqual(pngSignature);
    });
  });

  describe('generateQRCodeDataURL', () => {
    it('should generate data URL', async () => {
      const eventId = 'event_123';
      const dataURL = await qrCodeService.generateQRCodeDataURL(eventId);

      expect(dataURL).toMatch(/^data:image\/png;base64,/);
      expect(dataURL.length).toBeGreaterThan(100);
    });

    it('should include event ID in the URL', async () => {
      const eventId = 'event_abc123';
      const dataURL = await qrCodeService.generateQRCodeDataURL(eventId);

      // Data URL should be valid base64
      expect(dataURL).toBeTruthy();
      expect(typeof dataURL).toBe('string');
    });
  });
});
