import { db, generateId, TABLES } from '../aws/dynamodb';
import { rekognitionService } from '../aws/rekognition';
import { s3Service } from '../aws/s3';
import { qrCodeService } from '../utils/qrcode';
import { emailService } from '../aws/ses';
import { Event, EventStatus, PaymentStatus, CreateEventRequest, PhotographerAssignment } from '@/types';

export class EventService {
  async createEvent(data: CreateEventRequest): Promise<Event> {
    const eventId = generateId('event');
    const rekognitionCollectionId = `facefind-event-${eventId}`;

    const event: Event = {
      eventId,
      eventName: data.eventName,
      organizerId: data.organizerId,
      startDateTime: data.startDateTime,
      endDateTime: data.endDateTime,
      gracePeriodDays: data.gracePeriodDays,
      retentionPeriodDays: data.retentionPeriodDays,
      location: data.location,
      estimatedAttendees: data.estimatedAttendees,
      maxPhotos: data.maxPhotos,
      confidenceThreshold: data.confidenceThreshold,
      photoResizeWidth: data.photoResizeWidth,
      photoResizeHeight: data.photoResizeHeight,
      photoQuality: data.photoQuality,
      watermarkElements: data.watermarkElements,
      eventLogoUrl: data.eventLogoUrl,
      welcomeMessage: data.welcomeMessage,
      welcomePictureUrl: data.welcomePictureUrl,
      paymentStatus: PaymentStatus.PENDING,
      paymentAmount: data.paymentAmount,
      status: EventStatus.CREATED,
      rekognitionCollectionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create Rekognition collection
    await rekognitionService.createCollection(rekognitionCollectionId);

    // Generate and upload QR code
    const qrCodeBuffer = await qrCodeService.generateQRCode(eventId);
    const qrCodeKey = s3Service.generateQRCodeKey(eventId);
    const qrCodeUrl = await s3Service.uploadFile(qrCodeKey, qrCodeBuffer, 'image/png');

    event.qrCodeUrl = qrCodeUrl;

    await db.create(TABLES.EVENTS, event);

    return event;
  }

  async getEventById(eventId: string): Promise<Event | null> {
    return await db.get<Event>(TABLES.EVENTS, { eventId });
  }

  async updateEvent(eventId: string, updates: Partial<Event>): Promise<Event> {
    return await db.update<Event>(TABLES.EVENTS, { eventId }, updates);
  }

  async markEventAsPaid(eventId: string): Promise<Event> {
    return await this.updateEvent(eventId, {
      paymentStatus: PaymentStatus.PAID,
      status: EventStatus.PAID,
    });
  }

  async assignPhotographer(eventId: string, photographerId: string): Promise<void> {
    // Check for overlapping events
    const photographerEvents = await this.getPhotographerEvents(photographerId);

    const event = await this.getEventById(eventId);
    if (!event) throw new Error('Event not found');

    const eventStart = new Date(event.startDateTime);
    const eventEnd = new Date(event.endDateTime);

    const hasOverlap = photographerEvents.some((e) => {
      const eStart = new Date(e.startDateTime);
      const eEnd = new Date(e.endDateTime);

      return (
        (eventStart >= eStart && eventStart <= eEnd) ||
        (eventEnd >= eStart && eventEnd <= eEnd) ||
        (eStart >= eventStart && eStart <= eventEnd)
      );
    });

    if (hasOverlap) {
      throw new Error('Photographer has overlapping events');
    }

    // Create assignment
    const assignment: PhotographerAssignment = {
      eventId,
      photographerId,
      assignedAt: new Date().toISOString(),
    };

    await db.create(TABLES.PHOTOGRAPHER_ASSIGNMENTS, {
      assignmentId: generateId('assignment'),
      ...assignment,
    });

    // Send notification email
    const photographer = await db.get<any>(TABLES.USERS, { userId: photographerId });
    if (photographer) {
      await emailService.sendPhotographerAssignmentEmail(
        photographer.email,
        photographer.firstName,
        event.eventName,
        new Date(event.startDateTime).toLocaleDateString()
      );
    }
  }

  async getPhotographerEvents(photographerId: string): Promise<Event[]> {
    const assignments = await db.query<PhotographerAssignment>(
      TABLES.PHOTOGRAPHER_ASSIGNMENTS,
      'photographerId-index',
      'photographerId = :photographerId',
      { ':photographerId': photographerId }
    );

    const eventIds = assignments.map((a) => a.eventId);

    const events: Event[] = [];
    for (const eventId of eventIds) {
      const event = await this.getEventById(eventId);
      if (event) events.push(event);
    }

    return events;
  }

  async getOrganizerEvents(organizerId: string): Promise<Event[]> {
    return await db.query<Event>(
      TABLES.EVENTS,
      'organizerId-index',
      'organizerId = :organizerId',
      { ':organizerId': organizerId }
    );
  }

  async getAllEvents(): Promise<Event[]> {
    return await db.scan<Event>(TABLES.EVENTS);
  }

  async updateEventStatus(eventId: string, status: EventStatus): Promise<Event> {
    return await this.updateEvent(eventId, { status });
  }

  async getEventStats(eventId: string): Promise<{
    totalPhotos: number;
    totalAttendees: number;
    uploadProgress: number;
  }> {
    const event = await this.getEventById(eventId);
    if (!event) throw new Error('Event not found');

    const photos = await db.query<any>(
      TABLES.PHOTOS,
      'eventId-index',
      'eventId = :eventId',
      { ':eventId': eventId }
    );

    const sessions = await db.query<any>(
      TABLES.SESSIONS,
      'eventId-index',
      'eventId = :eventId',
      { ':eventId': eventId }
    );

    return {
      totalPhotos: photos.length,
      totalAttendees: sessions.length,
      uploadProgress: event.maxPhotos > 0 ? (photos.length / event.maxPhotos) * 100 : 0,
    };
  }

  async deleteEvent(eventId: string): Promise<void> {
    const event = await this.getEventById(eventId);
    if (!event) throw new Error('Event not found');

    // Delete Rekognition collection
    await rekognitionService.deleteCollection(event.rekognitionCollectionId);

    // Delete from database
    await db.delete(TABLES.EVENTS, { eventId });
  }
}

export const eventService = new EventService();
