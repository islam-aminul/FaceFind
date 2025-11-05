import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_BUCKET, S3_FOLDERS } from './config';

// Re-export S3_FOLDERS for use in other modules
export { S3_FOLDERS };

export interface PresignedUploadUrl {
  uploadUrl: string;
  key: string;
  photoId: string;
}

export class S3Service {
  async uploadFile(
    key: string,
    body: Buffer,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    try {
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
    } catch (error: any) {
      console.error('S3 upload error in uploadFile:', error);
      throw new Error(`S3 upload failed: ${error.message}`);
    }
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

  async getObject(key: string): Promise<Buffer> {
    try {
      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
        })
      );

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      if (response.Body) {
        const stream = response.Body as any;
        for await (const chunk of stream) {
          chunks.push(Buffer.from(chunk));
        }
      }

      return Buffer.concat(chunks);
    } catch (error: any) {
      console.error('S3 getObject error:', error);
      throw new Error(`Failed to get object from S3: ${error.message}`);
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

  /**
   * Generate presigned URL for photo upload
   * Allows frontend to upload directly to S3
   */
  async getPresignedUploadUrl(
    eventId: string,
    photoId: string,
    filename: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<PresignedUploadUrl> {
    const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const key = this.generatePhotoKey(eventId, photoId, S3_FOLDERS.ORIGINALS, extension);

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
      Metadata: {
        eventId,
        photoId,
        originalFilename: filename,
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    return {
      uploadUrl,
      key,
      photoId,
    };
  }

  /**
   * Generate multiple presigned URLs for batch upload
   */
  async getPresignedUploadUrls(
    eventId: string,
    files: Array<{ filename: string; contentType: string }>
  ): Promise<PresignedUploadUrl[]> {
    const urls = [];

    for (const file of files) {
      const photoId = crypto.randomUUID();
      const url = await this.getPresignedUploadUrl(
        eventId,
        photoId,
        file.filename,
        file.contentType
      );
      urls.push(url);
    }

    return urls;
  }

  /**
   * Get public URL for a photo
   */
  getPublicUrl(key: string): string {
    return `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;
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
