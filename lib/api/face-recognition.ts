import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { rekognitionService } from '../services/rekognition-service';
import { cryptoService } from '../utils/crypto';
import { FaceScanRequest, FaceScanResponse } from '@/types';

const client = generateClient<Schema>();

export class FaceRecognitionService {
  async scanFace(request: FaceScanRequest): Promise<FaceScanResponse> {
    // Get event
    const { data: event, errors: eventErrors } = await client.models.Event.get({
      id: request.eventId
    });

    if (eventErrors || !event) {
      throw new Error('Event not found');
    }

    // Decode base64 image
    const imageBuffer = Buffer.from(request.faceImageData, 'base64');

    // Search for matching faces
    const matches = await rekognitionService.searchFacesByImage(
      event.rekognitionCollectionId,
      imageBuffer,
      event.confidenceThreshold
    );

    // Get unique photo IDs from matches
    const photoIds = [...new Set(matches.map((m) => m.photoId).filter(Boolean))];

    // Fetch matched photos (only LIVE photos)
    const matchedPhotos = [];
    for (const photoId of photoIds) {
      if (!photoId) continue;

      const { data: photo, errors: photoErrors } = await client.models.Photo.get({
        id: photoId
      });

      if (!photoErrors && photo && photo.status === 'LIVE') {
        matchedPhotos.push({
          photoId: photo.id,
          eventId: photo.eventId,
          photographerId: photo.photographerId,
          photographerName: photo.photographerName || '',
          originalUrl: photo.originalUrl,
          processedUrl: photo.processedUrl,
          thumbnailUrl: photo.thumbnailUrl,
          fileSize: photo.fileSize,
          dimensionsWidth: photo.dimensionsWidth,
          dimensionsHeight: photo.dimensionsHeight,
          capturedAt: photo.capturedAt || new Date().toISOString(),
          status: photo.status as 'LIVE',
          faceCount: photo.faceCount,
          rekognitionFaceIds: photo.rekognitionFaceIds || [],
        });
      }
    }

    // Create or update session
    const faceTemplateHash = matches.length > 0
      ? cryptoService.hashFaceTemplate(matches[0].faceId)
      : cryptoService.hashFaceTemplate(Date.now().toString());

    // Check if session already exists for this device
    const { data: existingSessions } = await client.models.Session.list({
      filter: {
        and: [
          { eventId: { eq: request.eventId } },
          { deviceFingerprint: { eq: request.deviceFingerprint } }
        ]
      }
    });

    const deviceSession = existingSessions && existingSessions.length > 0
      ? existingSessions[0]
      : null;

    let sessionId: string;

    if (deviceSession) {
      // Update existing session
      sessionId = deviceSession.id;
      await client.models.Session.update({
        id: sessionId,
        faceTemplateHash,
        matchedPhotoIds: photoIds as string[],
      });
    } else {
      // Create new session
      const expiryTimestamp = this.calculateSessionExpiry(event);

      const { data: newSession, errors: sessionErrors } = await client.models.Session.create({
        eventId: request.eventId,
        faceTemplateHash,
        matchedPhotoIds: photoIds as string[],
        deviceFingerprint: request.deviceFingerprint,
        whatsappConsent: false,
        expiresAt: expiryTimestamp,
      });

      if (sessionErrors || !newSession) {
        throw new Error('Failed to create session');
      }

      sessionId = newSession.id;
    }

    return {
      sessionId,
      matchedPhotos,
      totalMatches: matchedPhotos.length,
    };
  }

  async getSessionPhotos(sessionId: string) {
    const { data: session, errors: sessionErrors } = await client.models.Session.get({
      id: sessionId
    });

    if (sessionErrors || !session) {
      throw new Error('Session not found');
    }

    const photos = [];
    for (const photoId of session.matchedPhotoIds || []) {
      const { data: photo, errors: photoErrors } = await client.models.Photo.get({
        id: photoId
      });

      if (!photoErrors && photo && photo.status === 'LIVE') {
        photos.push(photo);
      }
    }

    return photos;
  }

  async updateSessionWhatsApp(
    sessionId: string,
    phoneNumber: string,
    consent: boolean
  ) {
    const encryptedPhone = cryptoService.encrypt(phoneNumber);

    const { data, errors } = await client.models.Session.update({
      id: sessionId,
      phoneNumber: encryptedPhone,
      whatsappConsent: consent,
    });

    if (errors) {
      throw new Error('Failed to update session');
    }

    return data;
  }

  async getSession(sessionId: string) {
    const { data, errors } = await client.models.Session.get({ id: sessionId });

    if (errors) {
      return null;
    }

    return data;
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await client.models.Session.delete({ id: sessionId });
  }

  private calculateSessionExpiry(event: any): number {
    const endDate = new Date(event.endDateTime);
    const expiryDate = new Date(
      endDate.getTime() + event.gracePeriodDays * 24 * 60 * 60 * 1000
    );
    return Math.floor(expiryDate.getTime() / 1000);
  }

  async getEventSessions(eventId: string) {
    const { data } = await client.models.Session.list({
      filter: { eventId: { eq: eventId } }
    });

    return data || [];
  }
}

export const faceRecognitionService = new FaceRecognitionService();
