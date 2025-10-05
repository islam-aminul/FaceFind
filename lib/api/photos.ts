import { db, generateId, TABLES } from '../aws/dynamodb';
import { s3Service, S3_FOLDERS } from '../aws/s3';
import { rekognitionService } from '../aws/rekognition';
import { imageProcessingService } from '../utils/image-processing';
import { whatsappService } from '../utils/whatsapp';
import { cryptoService } from '../utils/crypto';
import { Photo, PhotoStatus, Event, Session } from '@/types';

export class PhotoService {
  async uploadPhoto(
    eventId: string,
    photographerId: string,
    imageBuffer: Buffer,
    fileName: string,
    capturedAt?: string
  ): Promise<Photo> {
    const photoId = generateId('photo');

    // Get event details
    const event = await db.get<Event>(TABLES.EVENTS, { eventId });
    if (!event) throw new Error('Event not found');

    // Check upload limit
    const stats = await this.getEventPhotoStats(eventId);
    if (stats.totalPhotos >= event.maxPhotos) {
      throw new Error('Event photo limit reached');
    }

    // Upload original to S3
    const originalKey = s3Service.generatePhotoKey(
      eventId,
      photoId,
      S3_FOLDERS.ORIGINALS,
      'jpg'
    );
    const originalUrl = await s3Service.uploadFile(originalKey, imageBuffer, 'image/jpeg');

    // Process image (resize, watermark, thumbnail)
    const photographer = await db.get<any>(TABLES.USERS, { userId: photographerId });
    const processedData = await imageProcessingService.processImage(imageBuffer, {
      resize: {
        width: event.photoResizeWidth,
        height: event.photoResizeHeight,
      },
      quality: event.photoQuality,
      watermark: {
        elements: event.watermarkElements,
        eventName: event.eventName,
        eventDate: new Date(event.startDateTime).toLocaleDateString(),
        photographerName: photographer ? `${photographer.firstName} ${photographer.lastName}` : undefined,
      },
    });

    // Upload processed and thumbnail
    const processedKey = s3Service.generatePhotoKey(
      eventId,
      photoId,
      S3_FOLDERS.PROCESSED,
      'jpg'
    );
    const thumbnailKey = s3Service.generatePhotoKey(
      eventId,
      photoId,
      S3_FOLDERS.THUMBNAILS,
      'jpg'
    );

    const [processedUrl, thumbnailUrl] = await Promise.all([
      s3Service.uploadFile(processedKey, processedData.processed, 'image/jpeg'),
      s3Service.uploadFile(thumbnailKey, processedData.thumbnail, 'image/jpeg'),
    ]);

    // Index faces in Rekognition
    const faceIndexResult = await rekognitionService.indexFaces(
      event.rekognitionCollectionId,
      processedData.processed,
      photoId
    );

    const rekognitionFaceIds = faceIndexResult.faceRecords.map((f) => f.faceId);

    // Create photo record
    const photo: Photo = {
      photoId,
      eventId,
      photographerId,
      photographerName: photographer ? `${photographer.firstName} ${photographer.lastName}` : undefined,
      originalUrl,
      processedUrl,
      thumbnailUrl,
      fileSize: processedData.processed.length,
      dimensions: processedData.dimensions,
      capturedAt,
      uploadedAt: new Date().toISOString(),
      status: PhotoStatus.LIVE,
      faceCount: faceIndexResult.faceRecords.length,
      rekognitionFaceIds,
      updatedAt: new Date().toISOString(),
    };

    await db.create(TABLES.PHOTOS, photo);

    // Store face templates
    for (const faceRecord of faceIndexResult.faceRecords) {
      const faceTemplate = {
        faceId: generateId('face'),
        photoId,
        eventId,
        rekognitionFaceId: faceRecord.faceId,
        boundingBox: {
          width: faceRecord.boundingBox.Width,
          height: faceRecord.boundingBox.Height,
          left: faceRecord.boundingBox.Left,
          top: faceRecord.boundingBox.Top,
        },
        confidence: faceRecord.confidence,
        faceTemplateHash: cryptoService.hashFaceTemplate(faceRecord.faceId),
        expiresAt: this.calculateExpiryTimestamp(event),
        createdAt: new Date().toISOString(),
      };

      await db.create(TABLES.FACE_TEMPLATES, faceTemplate);
    }

    // Notify attendees who match (async - don't wait)
    this.notifyMatchingAttendees(eventId, photoId).catch(console.error);

    return photo;
  }

  async getPhotoById(photoId: string): Promise<Photo | null> {
    return await db.get<Photo>(TABLES.PHOTOS, { photoId });
  }

  async getEventPhotos(eventId: string): Promise<Photo[]> {
    return await db.query<Photo>(
      TABLES.PHOTOS,
      'eventId-index',
      'eventId = :eventId AND #status <> :deletedStatus',
      { ':eventId': eventId, ':deletedStatus': PhotoStatus.DELETED },
      { '#status': 'status' }
    );
  }

  async getPhotographerPhotos(photographerId: string, eventId?: string): Promise<Photo[]> {
    if (eventId) {
      const photos = await this.getEventPhotos(eventId);
      return photos.filter((p) => p.photographerId === photographerId);
    }

    return await db.query<Photo>(
      TABLES.PHOTOS,
      'photographerId-index',
      'photographerId = :photographerId',
      { ':photographerId': photographerId }
    );
  }

  async deletePhoto(photoId: string): Promise<void> {
    const photo = await this.getPhotoById(photoId);
    if (!photo) throw new Error('Photo not found');

    // Delete from Rekognition
    if (photo.rekognitionFaceIds.length > 0) {
      const event = await db.get<Event>(TABLES.EVENTS, { eventId: photo.eventId });
      if (event) {
        await rekognitionService.deleteFaces(
          event.rekognitionCollectionId,
          photo.rekognitionFaceIds
        );
      }
    }

    // Mark as deleted (soft delete)
    await db.update<Photo>(TABLES.PHOTOS, { photoId }, { status: PhotoStatus.DELETED });
  }

  async flagPhoto(photoId: string, flaggedBy: string, reason: string): Promise<Photo> {
    return await db.update<Photo>(TABLES.PHOTOS, { photoId }, {
      status: PhotoStatus.FLAGGED,
      flaggedBy,
      flagReason: reason,
    });
  }

  async unflagPhoto(photoId: string): Promise<Photo> {
    return await db.update<Photo>(TABLES.PHOTOS, { photoId }, {
      status: PhotoStatus.LIVE,
      flaggedBy: undefined,
      flagReason: undefined,
    });
  }

  async getEventPhotoStats(eventId: string): Promise<{
    totalPhotos: number;
    photosByPhotographer: Record<string, number>;
  }> {
    const photos = await this.getEventPhotos(eventId);

    const photosByPhotographer: Record<string, number> = {};
    photos.forEach((photo) => {
      photosByPhotographer[photo.photographerId] =
        (photosByPhotographer[photo.photographerId] || 0) + 1;
    });

    return {
      totalPhotos: photos.length,
      photosByPhotographer,
    };
  }

  private async notifyMatchingAttendees(eventId: string, photoId: string): Promise<void> {
    // Get all sessions with WhatsApp consent for this event
    const sessions = await db.query<Session>(
      TABLES.SESSIONS,
      'eventId-index',
      'eventId = :eventId',
      { ':eventId': eventId }
    );

    const sessionsWithWhatsApp = sessions.filter(
      (s) => s.whatsappConsent && s.phoneNumber
    );

    // For each session, check if the new photo matches
    for (const session of sessionsWithWhatsApp) {
      if (session.matchedPhotoIds.includes(photoId)) {
        const event = await db.get<Event>(TABLES.EVENTS, { eventId });
        if (!event) continue;

        const photo = await this.getPhotoById(photoId);
        if (!photo) continue;

        // Get presigned URL for thumbnail
        const thumbnailUrl = await s3Service.getPresignedUrl(
          photo.thumbnailUrl.split('.com/')[1]
        );

        const phoneNumber = cryptoService.decrypt(session.phoneNumber!);

        await whatsappService.sendPhotoNotification({
          to: phoneNumber,
          eventName: event.eventName,
          photoCount: 1,
          galleryLink: `${process.env.NEXT_PUBLIC_APP_URL}/event/${eventId}`,
          downloadLink: `${process.env.NEXT_PUBLIC_APP_URL}/event/${eventId}/download`,
          imageUrls: [thumbnailUrl],
        });
      }
    }
  }

  private calculateExpiryTimestamp(event: Event): number {
    const endDate = new Date(event.endDateTime);
    const expiryDate = new Date(
      endDate.getTime() + event.gracePeriodDays * 24 * 60 * 60 * 1000
    );
    return Math.floor(expiryDate.getTime() / 1000);
  }
}

export const photoService = new PhotoService();
