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
    .authorization((allow) => [allow.publicApiKey()]),

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
    .authorization((allow) => [allow.publicApiKey()]),

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
    .authorization((allow) => [allow.publicApiKey()]),

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
    .authorization((allow) => [allow.publicApiKey()]),

  BillingConfig: a
    .model({
      configKey: a.string().required(),
      // Photo size assumptions
      avgPhotoSizeAfterProcessingMB: a.float().required(),
      avgOriginalPhotoSizeMB: a.float().required(),
      thumbnailSizeMB: a.float().required(),
      // User behavior assumptions
      avgScansPerAttendee: a.float().required(),
      avgDownloadsPerAttendee: a.float().required(),
      avgPhotoViewsPerAttendee: a.float().required(),
      avgEmailsPerAttendee: a.float().required(),
      avgWhatsappMessagesPerAttendee: a.float().required(),
      // Lambda configuration
      lambdaMemoryGB: a.float().required(),
      lambdaAvgExecutionSeconds: a.float().required(),
      lambdaInvocationsMultiplier: a.float().required(), // Per photo processing
      // DynamoDB configuration
      metadataStorageSizeKB: a.float().required(), // Per photo metadata size
      dynamoDBWriteMultiplier: a.integer().required(), // Write requests per photo
      // S3 configuration
      s3PutRequestsMultiplier: a.integer().required(), // PUT requests per photo (original + processed + thumbnail)
      s3GetRequestsMultiplier: a.integer().required(), // GET requests multiplier (downloads + views)
      // Pricing and overhead
      profitMarginPercent: a.float().required(),
      processingOverhead: a.float().required(),
      storageOverhead: a.float().required(),
      otherServicesOverhead: a.float().required(), // WAF, CloudWatch, etc.
      whatsappCostPerMessage: a.float().required(),
      // Rounding configuration
      priceRoundingUnit: a.integer().required(), // Round to nearest X (e.g., 100)
      // Retention pricing tiers
      retentionTier1Days: a.integer().required(), // 0-X days
      retentionTier1Multiplier: a.float().required(),
      retentionTier2Days: a.integer().required(), // X+1-Y days
      retentionTier2Multiplier: a.float().required(),
      retentionTier3Days: a.integer().required(), // Y+1-Z days
      retentionTier3Multiplier: a.float().required(),
      retentionTier4Days: a.integer().required(), // Z+1-W days
      retentionTier4Multiplier: a.float().required(),
      retentionTier5Days: a.integer().required(), // W+1-V days
      retentionTier5Multiplier: a.float().required(),
      retentionTier6Multiplier: a.float().required(), // V+ days
      // AWS Pricing (ap-south-1 Mumbai region in INR)
      s3StoragePerGBMonth: a.float().required(),
      s3PutRequestPer1000: a.float().required(),
      s3GetRequestPer1000: a.float().required(),
      lambdaRequestPer1M: a.float().required(),
      lambdaComputePerGBSecond: a.float().required(),
      rekognitionDetectFacesPer1000: a.float().required(),
      rekognitionSearchFacesPer1000: a.float().required(),
      dynamoDBWritePer1M: a.float().required(),
      dynamoDBReadPer1M: a.float().required(),
      dynamoDBStoragePerGB: a.float().required(),
      cloudFrontDataTransferPerGB: a.float().required(),
      sesEmailPer1000: a.float().required(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  EventDefaults: a
    .model({
      configKey: a.string().required(),
      defaultEstimatedAttendees: a.integer().required(),
      defaultMaxPhotos: a.integer().required(),
      defaultPhotoResizeWidth: a.integer().required(),
      defaultPhotoResizeHeight: a.integer().required(),
      defaultPhotoQuality: a.integer().required(),
      fallbackPaymentAmount: a.float().required(), // Used when billing calculation fails
    })
    .authorization((allow) => [allow.publicApiKey()]),

  SystemConfig: a
    .model({
      configKey: a.string().required(),
      appName: a.string().required(),
      supportEmail: a.string().required(),
      supportPhone: a.string(),
      maintenanceMode: a.boolean().required(),
      maintenanceMessage: a.string(),
      allowNewRegistrations: a.boolean().required(),
      termsOfServiceUrl: a.string(),
      privacyPolicyUrl: a.string(),
      defaultRetentionPeriodDays: a.integer().required(),
      defaultGracePeriodHours: a.integer().required(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  SecurityConfig: a
    .model({
      configKey: a.string().required(),
      minPasswordLength: a.integer().required(),
      requireUppercase: a.boolean().required(),
      requireLowercase: a.boolean().required(),
      requireNumbers: a.boolean().required(),
      requireSpecialChars: a.boolean().required(),
      passwordExpiryDays: a.integer().required(),
      maxLoginAttempts: a.integer().required(),
      lockoutDurationMinutes: a.integer().required(),
      sessionTimeoutMinutes: a.integer().required(),
      require2FA: a.boolean().required(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  StorageConfig: a
    .model({
      configKey: a.string().required(),
      s3BucketName: a.string().required(),
      s3Region: a.string().required(),
      maxUploadSizeMB: a.integer().required(),
      allowedFileTypes: a.string().array(),
      enableCDN: a.boolean().required(),
      cdnDomain: a.string(),
      storageQuotaPerEventGB: a.integer().required(),
      autoCleanupEnabled: a.boolean().required(),
      cleanupAfterDays: a.integer().required(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  FaceRecognitionConfig: a
    .model({
      configKey: a.string().required(),
      defaultConfidenceThreshold: a.float().required(),
      maxFacesPerPhoto: a.integer().required(),
      minFaceSize: a.integer().required(),
      enableQualityFilter: a.boolean().required(),
      collectionPrefix: a.string().required(),
      autoDeleteCollections: a.boolean().required(),
      rekognitionRegion: a.string().required(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  NotificationConfig: a
    .model({
      configKey: a.string().required(),
      emailProvider: a.string().required(),
      emailFrom: a.string().required(),
      emailFromName: a.string().required(),
      smtpHost: a.string(),
      smtpPort: a.integer(),
      smtpUsername: a.string(),
      smtpPassword: a.string(),
      whatsappEnabled: a.boolean().required(),
      whatsappApiKey: a.string(),
      whatsappPhoneNumber: a.string(),
      sendWelcomeEmails: a.boolean().required(),
      sendEventReminders: a.boolean().required(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  GooglePhotosToken: a
    .model({
      userId: a.string().required(),
      accessToken: a.string().required(),
      refreshToken: a.string().required(),
      expiresAt: a.integer().required(), // Unix timestamp
      scope: a.string().required(),
      tokenType: a.string().required(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .authorization((allow) => [allow.publicApiKey()]),
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
