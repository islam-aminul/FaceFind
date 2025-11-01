import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import '@/lib/amplify-config';

const client = generateClient<Schema>({
  authMode: 'apiKey',
});

const DEFAULT_CONFIG_KEY = 'default';

// Cache settings for 5 minutes to reduce database queries
const CACHE_DURATION = 5 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = {
  storage: null as CacheEntry<any> | null,
  faceRecognition: null as CacheEntry<any> | null,
  billing: null as CacheEntry<any> | null,
  eventDefaults: null as CacheEntry<any> | null,
  system: null as CacheEntry<any> | null,
  security: null as CacheEntry<any> | null,
  notification: null as CacheEntry<any> | null,
};

function isCacheValid<T>(cacheEntry: CacheEntry<T> | null): boolean {
  if (!cacheEntry) return false;
  return Date.now() - cacheEntry.timestamp < CACHE_DURATION;
}

export interface StorageConfigType {
  configKey: string;
  s3BucketName: string;
  s3Region: string;
  maxUploadSizeMB: number;
  allowedFileTypes: string[];
  enableCDN: boolean;
  cdnDomain?: string;
  storageQuotaPerEventGB: number;
  autoCleanupEnabled: boolean;
  cleanupAfterDays: number;
}

export interface FaceRecognitionConfigType {
  configKey: string;
  defaultConfidenceThreshold: number;
  maxFacesPerPhoto: number;
  minFaceSize: number;
  enableQualityFilter: boolean;
  collectionPrefix: string;
  autoDeleteCollections: boolean;
  rekognitionRegion: string;
}

export interface BillingConfigType {
  configKey: string;
  // Photo size assumptions
  avgPhotoSizeAfterProcessingMB: number;
  avgOriginalPhotoSizeMB: number;
  thumbnailSizeMB: number;
  // User behavior assumptions
  avgScansPerAttendee: number;
  avgDownloadsPerAttendee: number;
  avgPhotoViewsPerAttendee: number;
  avgEmailsPerAttendee: number;
  avgWhatsappMessagesPerAttendee: number;
  // Lambda configuration
  lambdaMemoryGB: number;
  lambdaAvgExecutionSeconds: number;
  lambdaInvocationsMultiplier: number;
  // DynamoDB configuration
  metadataStorageSizeKB: number;
  dynamoDBWriteMultiplier: number;
  // S3 configuration
  s3PutRequestsMultiplier: number;
  s3GetRequestsMultiplier: number;
  // Pricing and overhead
  profitMarginPercent: number;
  processingOverhead: number;
  storageOverhead: number;
  otherServicesOverhead: number;
  whatsappCostPerMessage: number;
  // Rounding configuration
  priceRoundingUnit: number;
  // Retention pricing tiers
  retentionTier1Days: number;
  retentionTier1Multiplier: number;
  retentionTier2Days: number;
  retentionTier2Multiplier: number;
  retentionTier3Days: number;
  retentionTier3Multiplier: number;
  retentionTier4Days: number;
  retentionTier4Multiplier: number;
  retentionTier5Days: number;
  retentionTier5Multiplier: number;
  retentionTier6Multiplier: number;
  // AWS Pricing
  s3StoragePerGBMonth: number;
  s3PutRequestPer1000: number;
  s3GetRequestPer1000: number;
  lambdaRequestPer1M: number;
  lambdaComputePerGBSecond: number;
  rekognitionDetectFacesPer1000: number;
  rekognitionSearchFacesPer1000: number;
  dynamoDBWritePer1M: number;
  dynamoDBReadPer1M: number;
  dynamoDBStoragePerGB: number;
  cloudFrontDataTransferPerGB: number;
  sesEmailPer1000: number;
}

export interface EventDefaultsType {
  configKey: string;
  defaultEstimatedAttendees: number;
  defaultMaxPhotos: number;
  defaultPhotoResizeWidth: number;
  defaultPhotoResizeHeight: number;
  defaultPhotoQuality: number;
  fallbackPaymentAmount: number;
}

export interface SystemConfigType {
  configKey: string;
  appName: string;
  supportEmail: string;
  supportPhone?: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  allowNewRegistrations: boolean;
  termsOfServiceUrl?: string;
  privacyPolicyUrl?: string;
  defaultRetentionPeriodDays: number;
  defaultGracePeriodHours: number;
}

export interface SecurityConfigType {
  configKey: string;
  minPasswordLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  passwordExpiryDays: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  sessionTimeoutMinutes: number;
  require2FA: boolean;
}

export interface NotificationConfigType {
  configKey: string;
  emailProvider: string;
  emailFrom: string;
  emailFromName: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  whatsappEnabled: boolean;
  whatsappApiKey?: string;
  whatsappPhoneNumber?: string;
  sendWelcomeEmails: boolean;
  sendEventReminders: boolean;
}

class SettingsService {
  /**
   * Get Storage Configuration
   */
  async getStorageConfig(): Promise<StorageConfigType> {
    if (isCacheValid(cache.storage)) {
      return cache.storage!.data;
    }

    try {
      const result = await client.models.StorageConfig.list({
        filter: { configKey: { eq: DEFAULT_CONFIG_KEY } },
      });

      if (result.data && result.data.length > 0) {
        const config = result.data[0] as any;
        cache.storage = { data: config, timestamp: Date.now() };
        return config;
      }
    } catch (error) {
      console.error('Error fetching storage config:', error);
    }

    // Return defaults if not found
    const defaultConfig: StorageConfigType = {
      configKey: DEFAULT_CONFIG_KEY,
      s3BucketName: process.env.S3_BUCKET_NAME || process.env.NEXT_PUBLIC_S3_BUCKET || 'facefind-photos',
      s3Region: process.env.S3_REGION || process.env.AWS_REGION || 'ap-south-1',
      maxUploadSizeMB: 10,
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/jpg'],
      enableCDN: false,
      cdnDomain: '',
      storageQuotaPerEventGB: 100,
      autoCleanupEnabled: true,
      cleanupAfterDays: 90,
    };

    cache.storage = { data: defaultConfig, timestamp: Date.now() };
    return defaultConfig;
  }

  /**
   * Get Face Recognition Configuration
   */
  async getFaceRecognitionConfig(): Promise<FaceRecognitionConfigType> {
    if (isCacheValid(cache.faceRecognition)) {
      return cache.faceRecognition!.data;
    }

    try {
      const result = await client.models.FaceRecognitionConfig.list({
        filter: { configKey: { eq: DEFAULT_CONFIG_KEY } },
      });

      if (result.data && result.data.length > 0) {
        const config = result.data[0] as any;
        cache.faceRecognition = { data: config, timestamp: Date.now() };
        return config;
      }
    } catch (error) {
      console.error('Error fetching face recognition config:', error);
    }

    // Return defaults if not found
    const defaultConfig: FaceRecognitionConfigType = {
      configKey: DEFAULT_CONFIG_KEY,
      defaultConfidenceThreshold: 85,
      maxFacesPerPhoto: 50,
      minFaceSize: 50,
      enableQualityFilter: true,
      collectionPrefix: 'facefind',
      autoDeleteCollections: false,
      rekognitionRegion: process.env.REKOGNITION_REGION || process.env.AWS_REGION || 'ap-south-1',
    };

    cache.faceRecognition = { data: defaultConfig, timestamp: Date.now() };
    return defaultConfig;
  }

  /**
   * Get Billing Configuration
   */
  async getBillingConfig(): Promise<BillingConfigType> {
    if (isCacheValid(cache.billing)) {
      return cache.billing!.data;
    }

    try {
      const result = await client.models.BillingConfig.list({
        filter: { configKey: { eq: DEFAULT_CONFIG_KEY } },
      });

      // If there are GraphQL errors, it means the database record is incomplete/corrupted
      // Fall back to defaults instead of using the incomplete record
      if (result.errors && result.errors.length > 0) {
        console.warn('BillingConfig record has validation errors, using defaults');
      } else if (result.data && result.data.length > 0) {
        const config = result.data[0] as any;
        cache.billing = { data: config, timestamp: Date.now() };
        return config;
      }
    } catch (error) {
      console.error('Error fetching billing config:', error);
    }

    // Return defaults if not found
    const defaultConfig: BillingConfigType = {
      configKey: DEFAULT_CONFIG_KEY,
      // Photo size assumptions
      avgPhotoSizeAfterProcessingMB: 5,
      avgOriginalPhotoSizeMB: 8,
      thumbnailSizeMB: 0.2,
      // User behavior assumptions
      avgScansPerAttendee: 3,
      avgDownloadsPerAttendee: 3,
      avgPhotoViewsPerAttendee: 15,
      avgEmailsPerAttendee: 2, // Invitation + reminder
      avgWhatsappMessagesPerAttendee: 2, // Welcome message + photo ready notification
      // Lambda configuration
      lambdaMemoryGB: 0.512,
      lambdaAvgExecutionSeconds: 3,
      lambdaInvocationsMultiplier: 2, // Upload processing + face detection
      // DynamoDB configuration
      metadataStorageSizeKB: 10, // ~10KB per photo record
      dynamoDBWriteMultiplier: 5, // Photo records + metadata
      // S3 configuration
      s3PutRequestsMultiplier: 3, // Original + processed + thumbnail
      s3GetRequestsMultiplier: 2, // Downloads + views
      // Pricing and overhead
      profitMarginPercent: 40,
      processingOverhead: 1.2,
      storageOverhead: 1.1,
      otherServicesOverhead: 0.1, // 10% for WAF, CloudWatch, etc.
      whatsappCostPerMessage: 0.25, // ₹0.25 per WhatsApp message
      // Rounding configuration
      priceRoundingUnit: 100, // Round to nearest 100
      // Retention pricing tiers
      retentionTier1Days: 7,
      retentionTier1Multiplier: 1.0,
      retentionTier2Days: 14,
      retentionTier2Multiplier: 1.15,
      retentionTier3Days: 30,
      retentionTier3Multiplier: 1.30,
      retentionTier4Days: 60,
      retentionTier4Multiplier: 1.50,
      retentionTier5Days: 90,
      retentionTier5Multiplier: 1.75,
      retentionTier6Multiplier: 2.0, // 90+ days
      // AWS Pricing (ap-south-1 Mumbai region, as of 2024, in INR)
      s3StoragePerGBMonth: 1.84,
      s3PutRequestPer1000: 0.038,
      s3GetRequestPer1000: 0.003,
      lambdaRequestPer1M: 16.67,
      lambdaComputePerGBSecond: 0.00001389,
      rekognitionDetectFacesPer1000: 83.33,
      rekognitionSearchFacesPer1000: 83.33,
      dynamoDBWritePer1M: 104.17,
      dynamoDBReadPer1M: 20.83,
      dynamoDBStoragePerGB: 2.08,
      cloudFrontDataTransferPerGB: 7.29,
      sesEmailPer1000: 8.33,
    };

    cache.billing = { data: defaultConfig, timestamp: Date.now() };
    return defaultConfig;
  }

  /**
   * Get Event Defaults Configuration
   */
  async getEventDefaults(): Promise<EventDefaultsType> {
    if (isCacheValid(cache.eventDefaults)) {
      return cache.eventDefaults!.data;
    }

    try {
      const result = await client.models.EventDefaults.list({
        filter: { configKey: { eq: DEFAULT_CONFIG_KEY } },
      });

      if (result.data && result.data.length > 0) {
        const config = result.data[0] as any;
        cache.eventDefaults = { data: config, timestamp: Date.now() };
        return config;
      }
    } catch (error) {
      console.error('Error fetching event defaults config:', error);
    }

    // Return defaults if not found
    const defaultConfig: EventDefaultsType = {
      configKey: DEFAULT_CONFIG_KEY,
      defaultEstimatedAttendees: 100,
      defaultMaxPhotos: 1000,
      defaultPhotoResizeWidth: 2560,
      defaultPhotoResizeHeight: 1440,
      defaultPhotoQuality: 85,
      fallbackPaymentAmount: 15000, // ₹15,000 fallback
    };

    cache.eventDefaults = { data: defaultConfig, timestamp: Date.now() };
    return defaultConfig;
  }

  /**
   * Get System Configuration
   */
  async getSystemConfig(): Promise<SystemConfigType> {
    if (isCacheValid(cache.system)) {
      return cache.system!.data;
    }

    try {
      const result = await client.models.SystemConfig.list({
        filter: { configKey: { eq: DEFAULT_CONFIG_KEY } },
      });

      if (result.data && result.data.length > 0) {
        const config = result.data[0] as any;
        cache.system = { data: config, timestamp: Date.now() };
        return config;
      }
    } catch (error) {
      console.error('Error fetching system config:', error);
    }

    // Return defaults if not found
    const defaultConfig: SystemConfigType = {
      configKey: DEFAULT_CONFIG_KEY,
      appName: 'FaceFind',
      supportEmail: 'support@facefind.com',
      supportPhone: '',
      maintenanceMode: false,
      maintenanceMessage: '',
      allowNewRegistrations: true,
      termsOfServiceUrl: '',
      privacyPolicyUrl: '',
      defaultRetentionPeriodDays: 7,
      defaultGracePeriodHours: 3,
    };

    cache.system = { data: defaultConfig, timestamp: Date.now() };
    return defaultConfig;
  }

  /**
   * Get Security Configuration
   */
  async getSecurityConfig(): Promise<SecurityConfigType> {
    if (isCacheValid(cache.security)) {
      return cache.security!.data;
    }

    try {
      const result = await client.models.SecurityConfig.list({
        filter: { configKey: { eq: DEFAULT_CONFIG_KEY } },
      });

      if (result.data && result.data.length > 0) {
        const config = result.data[0] as any;
        cache.security = { data: config, timestamp: Date.now() };
        return config;
      }
    } catch (error) {
      console.error('Error fetching security config:', error);
    }

    // Return defaults if not found
    const defaultConfig: SecurityConfigType = {
      configKey: DEFAULT_CONFIG_KEY,
      minPasswordLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      passwordExpiryDays: 90,
      maxLoginAttempts: 5,
      lockoutDurationMinutes: 15,
      sessionTimeoutMinutes: 60,
      require2FA: false,
    };

    cache.security = { data: defaultConfig, timestamp: Date.now() };
    return defaultConfig;
  }

  /**
   * Get Notification Configuration
   */
  async getNotificationConfig(): Promise<NotificationConfigType> {
    if (isCacheValid(cache.notification)) {
      return cache.notification!.data;
    }

    try {
      const result = await client.models.NotificationConfig.list({
        filter: { configKey: { eq: DEFAULT_CONFIG_KEY } },
      });

      if (result.data && result.data.length > 0) {
        const config = result.data[0] as any;
        cache.notification = { data: config, timestamp: Date.now() };
        return config;
      }
    } catch (error) {
      console.error('Error fetching notification config:', error);
    }

    // Return defaults if not found
    const defaultConfig: NotificationConfigType = {
      configKey: DEFAULT_CONFIG_KEY,
      emailProvider: 'SES',
      emailFrom: 'noreply@facefind.com',
      emailFromName: 'FaceFind',
      smtpHost: '',
      smtpPort: 587,
      smtpUsername: '',
      smtpPassword: '',
      whatsappEnabled: false,
      whatsappApiKey: '',
      whatsappPhoneNumber: '',
      sendWelcomeEmails: true,
      sendEventReminders: true,
    };

    cache.notification = { data: defaultConfig, timestamp: Date.now() };
    return defaultConfig;
  }

  /**
   * Get all configurations at once
   */
  async getAllConfigs() {
    const [storage, faceRecognition, billing, eventDefaults, system, security, notification] = await Promise.all([
      this.getStorageConfig(),
      this.getFaceRecognitionConfig(),
      this.getBillingConfig(),
      this.getEventDefaults(),
      this.getSystemConfig(),
      this.getSecurityConfig(),
      this.getNotificationConfig(),
    ]);

    return {
      storage,
      faceRecognition,
      billing,
      eventDefaults,
      system,
      security,
      notification,
    };
  }

  /**
   * Clear cache (useful after settings updates)
   */
  clearCache() {
    cache.storage = null;
    cache.faceRecognition = null;
    cache.billing = null;
    cache.eventDefaults = null;
    cache.system = null;
    cache.security = null;
    cache.notification = null;
  }

  /**
   * Clear specific cache entry
   */
  clearCacheEntry(key: keyof typeof cache) {
    cache[key] = null;
  }
}

export const settingsService = new SettingsService();
