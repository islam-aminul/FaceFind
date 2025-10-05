import sharp from 'sharp';
import { WatermarkElement } from '@/types';

export interface ProcessImageOptions {
  resize?: {
    width?: number;
    height?: number;
  };
  quality?: number;
  watermark?: {
    elements: WatermarkElement[];
    eventName?: string;
    eventDate?: string;
    photographerName?: string;
    logoBuffer?: Buffer;
  };
}

export class ImageProcessingService {
  async processImage(imageBuffer: Buffer, options: ProcessImageOptions): Promise<{
    processed: Buffer;
    thumbnail: Buffer;
    dimensions: { width: number; height: number };
  }> {
    let image = sharp(imageBuffer);

    // Get original dimensions
    const metadata = await image.metadata();
    const originalWidth = metadata.width || 1920;
    const originalHeight = metadata.height || 1080;

    // Resize if specified
    if (options.resize?.width || options.resize?.height) {
      image = image.resize({
        width: options.resize.width,
        height: options.resize.height,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Apply watermark if specified
    if (options.watermark && options.watermark.elements.length > 0) {
      image = await this.applyWatermark(image, options.watermark, originalWidth, originalHeight);
    }

    // Convert to JPEG with quality setting
    const processedBuffer = await image
      .jpeg({ quality: options.quality || 85 })
      .toBuffer();

    // Create thumbnail (400x400)
    const thumbnailBuffer = await sharp(processedBuffer)
      .resize(400, 400, { fit: 'cover' })
      .jpeg({ quality: 70 })
      .toBuffer();

    // Get final dimensions
    const finalMetadata = await sharp(processedBuffer).metadata();

    return {
      processed: processedBuffer,
      thumbnail: thumbnailBuffer,
      dimensions: {
        width: finalMetadata.width || originalWidth,
        height: finalMetadata.height || originalHeight,
      },
    };
  }

  private async applyWatermark(
    image: sharp.Sharp,
    watermark: NonNullable<ProcessImageOptions['watermark']>,
    width: number,
    height: number
  ): Promise<sharp.Sharp> {
    // Create watermark text SVG
    const watermarkTexts: string[] = [];

    if (watermark.elements.includes(WatermarkElement.EVENT_NAME) && watermark.eventName) {
      watermarkTexts.push(watermark.eventName);
    }

    if (watermark.elements.includes(WatermarkElement.EVENT_DATE) && watermark.eventDate) {
      watermarkTexts.push(watermark.eventDate);
    }

    if (watermark.elements.includes(WatermarkElement.PHOTOGRAPHER_NAME) && watermark.photographerName) {
      watermarkTexts.push(`Photo by ${watermark.photographerName}`);
    }

    if (watermarkTexts.length > 0) {
      const watermarkText = watermarkTexts.join(' | ');
      const fontSize = Math.max(20, Math.floor(width / 40));
      const padding = 20;

      const svgWatermark = Buffer.from(`
        <svg width="${width}" height="${height}">
          <style>
            .watermark {
              font-family: Arial, sans-serif;
              font-size: ${fontSize}px;
              fill: white;
              fill-opacity: 0.7;
              stroke: black;
              stroke-width: 1;
              stroke-opacity: 0.5;
            }
          </style>
          <text x="${padding}" y="${height - padding}" class="watermark">${watermarkText}</text>
        </svg>
      `);

      image = image.composite([
        {
          input: svgWatermark,
          gravity: 'southwest',
        },
      ]);
    }

    // Add logo if provided
    if (watermark.elements.includes(WatermarkElement.LOGO) && watermark.logoBuffer) {
      const logoSize = Math.floor(width / 10);
      const resizedLogo = await sharp(watermark.logoBuffer)
        .resize(logoSize, logoSize, { fit: 'inside' })
        .toBuffer();

      image = image.composite([
        {
          input: resizedLogo,
          gravity: 'northeast',
        },
      ]);
    }

    return image;
  }

  async extractFaceImage(imageBuffer: Buffer, boundingBox: {
    left: number;
    top: number;
    width: number;
    height: number;
  }): Promise<Buffer> {
    const metadata = await sharp(imageBuffer).metadata();
    const imageWidth = metadata.width || 1920;
    const imageHeight = metadata.height || 1080;

    const left = Math.floor(boundingBox.left * imageWidth);
    const top = Math.floor(boundingBox.top * imageHeight);
    const width = Math.floor(boundingBox.width * imageWidth);
    const height = Math.floor(boundingBox.height * imageHeight);

    return await sharp(imageBuffer)
      .extract({ left, top, width, height })
      .toBuffer();
  }
}

export const imageProcessingService = new ImageProcessingService();
