import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_BUCKET, S3_FOLDERS } from './config';

// Re-export S3_FOLDERS for use in other modules
export { S3_FOLDERS };

export class S3Service {
  async uploadFile(
    key: string,
    body: Buffer,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: metadata,
        ServerSideEncryption: 'AES256',
      })
    );

    return `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;
  }

  async getPresignedUrl(key: string, expiresIn: number = 86400): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  }

  async deleteFile(key: string): Promise<void> {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      })
    );
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
        })
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  async getFileSize(key: string): Promise<number> {
    const result = await s3Client.send(
      new HeadObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      })
    );
    return result.ContentLength || 0;
  }

  generatePhotoKey(eventId: string, photoId: string, folder: string, extension: string): string {
    return `${folder}/${eventId}/${photoId}.${extension}`;
  }

  generateQRCodeKey(eventId: string): string {
    return `${S3_FOLDERS.QR_CODES}/${eventId}.png`;
  }

  generateEventAssetKey(eventId: string, assetType: 'logo' | 'welcome', filename: string): string {
    return `${S3_FOLDERS.EVENT_ASSETS}/${eventId}/${assetType}/${filename}`;
  }
}

export const s3Service = new S3Service();

/**
 * Helper function to upload file to S3
 */
export async function uploadToS3(params: {
  key: string;
  body: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const url = await s3Service.uploadFile(
      params.key,
      params.body,
      params.contentType,
      params.metadata
    );
    return { success: true, url };
  } catch (error: any) {
    console.error('S3 upload error:', error);
    return { success: false, error: error.message };
  }
}
