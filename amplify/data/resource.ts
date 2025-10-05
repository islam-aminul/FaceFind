import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  User: a
    .model({
      email: a.string().required(),
      role: a.enum(['ADMIN', 'ORGANIZER', 'PHOTOGRAPHER']),
      firstName: a.string().required(),
      lastName: a.string().required(),
      phone: a.string(),
      companyName: a.string(),
      portfolioUrl: a.string(),
      specialization: a.string(),
      bio: a.string(),
      status: a.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']),
    })
    .authorization((allow) => [allow.authenticated()]),

  Event: a
    .model({
      eventName: a.string().required(),
      organizerId: a.string().required(),
      startDateTime: a.datetime().required(),
      endDateTime: a.datetime().required(),
      gracePeriodDays: a.integer().required(),
      retentionPeriodDays: a.integer().required(),
      location: a.string().required(),
      estimatedAttendees: a.integer().required(),
      maxPhotos: a.integer().required(),
      confidenceThreshold: a.float().required(),
      photoResizeWidth: a.integer(),
      photoResizeHeight: a.integer(),
      photoQuality: a.integer().required(),
      watermarkElements: a.string().array(),
      eventLogoUrl: a.string(),
      welcomeMessage: a.string(),
      welcomePictureUrl: a.string(),
      qrCodeUrl: a.string(),
      paymentStatus: a.enum(['PENDING', 'PAID']),
      paymentAmount: a.float().required(),
      status: a.enum(['CREATED', 'PAID', 'ACTIVE', 'GRACE_PERIOD', 'DOWNLOAD_PERIOD', 'ARCHIVED']),
      rekognitionCollectionId: a.string().required(),
    })
    .authorization((allow) => [allow.authenticated()]),

  Photo: a
    .model({
      eventId: a.string().required(),
      photographerId: a.string().required(),
      photographerName: a.string(),
      originalUrl: a.string().required(),
      processedUrl: a.string().required(),
      thumbnailUrl: a.string().required(),
      fileSize: a.integer().required(),
      dimensionsWidth: a.integer().required(),
      dimensionsHeight: a.integer().required(),
      capturedAt: a.datetime(),
      status: a.enum(['UPLOADING', 'PROCESSING', 'LIVE', 'FLAGGED', 'DELETED']),
      faceCount: a.integer().required(),
      rekognitionFaceIds: a.string().array(),
      flaggedBy: a.string(),
      flagReason: a.string(),
    })
    .authorization((allow) => [allow.authenticated()]),

  Session: a
    .model({
      eventId: a.string().required(),
      faceTemplateHash: a.string().required(),
      matchedPhotoIds: a.string().array(),
      deviceFingerprint: a.string().required(),
      phoneNumber: a.string(),
      whatsappConsent: a.boolean().required(),
      expiresAt: a.integer().required(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  PhotographerAssignment: a
    .model({
      eventId: a.string().required(),
      photographerId: a.string().required(),
      assignedAt: a.datetime().required(),
    })
    .authorization((allow) => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
