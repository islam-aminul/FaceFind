import QRCode from 'qrcode';

export class QRCodeService {
  async generateQRCode(eventId: string): Promise<Buffer> {
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/event/${eventId}`;

    const qrCodeBuffer = await QRCode.toBuffer(url, {
      errorCorrectionLevel: 'H',
      type: 'png',
      width: 500,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return qrCodeBuffer;
  }

  async generateQRCodeDataURL(eventId: string): Promise<string> {
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/event/${eventId}`;

    return await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'H',
      width: 500,
      margin: 2,
    });
  }
}

export const qrCodeService = new QRCodeService();
