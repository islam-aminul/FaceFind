import { db, generateId, TABLES } from '../aws/dynamodb';
import { rekognitionService } from '../aws/rekognition';
import { cryptoService } from '../utils/crypto';
import { Event, Session, Photo, FaceScanRequest, FaceScanResponse } from '@/types';

export class FaceRecognitionService {
  async scanFace(request: FaceScanRequest): Promise<FaceScanResponse> {
    // Get event
    const event = await db.get<Event>(TABLES.EVENTS, { eventId: request.eventId });
    if (!event) throw new Error('Event not found');

    // Decode base64 image
    const imageBuffer = Buffer.from(request.faceImageData, 'base64');

    // Search for matching faces
    const matches = await rekognitionService.searchFacesByImage(
      event.rekognitionCollectionId,
      imageBuffer,
      event.confidenceThreshold
    );

    // Get unique photo IDs from matches
    const photoIds = [...new Set(matches.map((m) => m.externalImageId))];

    // Fetch matched photos
    const matchedPhotos: Photo[] = [];
    for (const photoId of photoIds) {
      const photo = await db.get<Photo>(TABLES.PHOTOS, { photoId });
      if (photo) matchedPhotos.push(photo);
    }

    // Create or update session
    const faceTemplateHash = matches.length > 0
      ? cryptoService.hashFaceTemplate(matches[0].faceId)
      : cryptoService.hashFaceTemplate(Date.now().toString());

    // Check if session already exists for this device
    const existingSessions = await db.query<Session>(
      TABLES.SESSIONS,
      'eventId-index',
      'eventId = :eventId',
      { ':eventId': request.eventId }
    );

    const deviceSession = existingSessions.find(
      (s) => s.deviceFingerprint === request.deviceFingerprint
    );

    let sessionId: string;

    if (deviceSession) {
      // Update existing session
      sessionId = deviceSession.sessionId;
      await db.update<Session>(
        TABLES.SESSIONS,
        { sessionId },
        {
          faceTemplateHash,
          matchedPhotoIds: photoIds,
        }
      );
    } else {
      // Create new session
      sessionId = generateId('session');
      const expiryTimestamp = this.calculateSessionExpiry(event);

      const session: Session = {
        sessionId,
        eventId: request.eventId,
        faceTemplateHash,
        matchedPhotoIds: photoIds,
        deviceFingerprint: request.deviceFingerprint,
        whatsappConsent: false,
        createdAt: new Date().toISOString(),
        expiresAt: expiryTimestamp,
      };

      await db.create(TABLES.SESSIONS, session);
    }

    return {
      sessionId,
      matchedPhotos,
      totalMatches: matchedPhotos.length,
    };
  }

  async getSessionPhotos(sessionId: string): Promise<Photo[]> {
    const session = await db.get<Session>(TABLES.SESSIONS, { sessionId });
    if (!session) throw new Error('Session not found');

    const photos: Photo[] = [];
    for (const photoId of session.matchedPhotoIds) {
      const photo = await db.get<Photo>(TABLES.PHOTOS, { photoId });
      if (photo) photos.push(photo);
    }

    return photos;
  }

  async updateSessionWhatsApp(
    sessionId: string,
    phoneNumber: string,
    consent: boolean
  ): Promise<Session> {
    const encryptedPhone = cryptoService.encrypt(phoneNumber);

    return await db.update<Session>(
      TABLES.SESSIONS,
      { sessionId },
      {
        phoneNumber: encryptedPhone,
        whatsappConsent: consent,
      }
    );
  }

  async getSession(sessionId: string): Promise<Session | null> {
    return await db.get<Session>(TABLES.SESSIONS, { sessionId });
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await db.delete(TABLES.SESSIONS, { sessionId });
  }

  private calculateSessionExpiry(event: Event): number {
    const endDate = new Date(event.endDateTime);
    const expiryDate = new Date(
      endDate.getTime() + event.gracePeriodDays * 24 * 60 * 60 * 1000
    );
    return Math.floor(expiryDate.getTime() / 1000);
  }

  async getEventSessions(eventId: string): Promise<Session[]> {
    return await db.query<Session>(
      TABLES.SESSIONS,
      'eventId-index',
      'eventId = :eventId',
      { ':eventId': eventId }
    );
  }
}

export const faceRecognitionService = new FaceRecognitionService();
