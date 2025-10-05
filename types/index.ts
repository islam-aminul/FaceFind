// User Roles
export enum UserRole {
  ADMIN = 'ADMIN',
  ORGANIZER = 'ORGANIZER',
  PHOTOGRAPHER = 'PHOTOGRAPHER',
}

// User Status
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
}

// Event States
export enum EventStatus {
  CREATED = 'CREATED',
  PAID = 'PAID',
  ACTIVE = 'ACTIVE',
  GRACE_PERIOD = 'GRACE_PERIOD',
  DOWNLOAD_PERIOD = 'DOWNLOAD_PERIOD',
  ARCHIVED = 'ARCHIVED',
}

// Payment Status
export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

// Photo Status
export enum PhotoStatus {
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  LIVE = 'LIVE',
  FLAGGED = 'FLAGGED',
  DELETED = 'DELETED',
}

// Watermark Elements
export enum WatermarkElement {
  EVENT_NAME = 'EVENT_NAME',
  EVENT_DATE = 'EVENT_DATE',
  PHOTOGRAPHER_NAME = 'PHOTOGRAPHER_NAME',
  LOGO = 'LOGO',
}

// Data Models
export interface User {
  userId: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string;
  companyName?: string;
  portfolioUrl?: string;
  specialization?: string;
  bio?: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  eventId: string;
  eventName: string;
  organizerId: string;
  organizerName?: string;
  startDateTime: string;
  endDateTime: string;
  gracePeriodDays: number;
  retentionPeriodDays: number;
  location: string;
  estimatedAttendees: number;
  maxPhotos: number;
  confidenceThreshold: number;
  photoResizeWidth?: number;
  photoResizeHeight?: number;
  photoQuality: number;
  watermarkElements: WatermarkElement[];
  eventLogoUrl?: string;
  welcomeMessage?: string;
  welcomePictureUrl?: string;
  qrCodeUrl?: string;
  paymentStatus: PaymentStatus;
  paymentAmount: number;
  status: EventStatus;
  rekognitionCollectionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  photoId: string;
  eventId: string;
  photographerId: string;
  photographerName?: string;
  originalUrl: string;
  processedUrl: string;
  thumbnailUrl: string;
  fileSize: number;
  dimensions: {
    width: number;
    height: number;
  };
  capturedAt?: string;
  uploadedAt: string;
  status: PhotoStatus;
  faceCount: number;
  rekognitionFaceIds: string[];
  flaggedBy?: string;
  flagReason?: string;
  updatedAt: string;
}

export interface FaceTemplate {
  faceId: string;
  photoId: string;
  eventId: string;
  rekognitionFaceId: string;
  boundingBox: {
    width: number;
    height: number;
    left: number;
    top: number;
  };
  confidence: number;
  faceTemplateHash: string;
  expiresAt: number; // TTL timestamp
  createdAt: string;
}

export interface Session {
  sessionId: string;
  eventId: string;
  faceTemplateHash: string;
  matchedPhotoIds: string[];
  deviceFingerprint: string;
  phoneNumber?: string;
  whatsappConsent: boolean;
  createdAt: string;
  expiresAt: number; // TTL timestamp
}

export interface Billing {
  billingId: string;
  eventId: string;
  estimatedAttendees: number;
  estimatedPhotos: number;
  actualAttendees: number;
  actualPhotos: number;
  retentionDays: number;
  calculatedAmount: number;
  paymentStatus: PaymentStatus;
  paymentDate?: string;
  paymentReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  logId: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
}

// API Request/Response Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface CreateEventRequest {
  eventName: string;
  organizerId: string;
  startDateTime: string;
  endDateTime: string;
  gracePeriodDays: number;
  retentionPeriodDays: number;
  location: string;
  estimatedAttendees: number;
  maxPhotos: number;
  confidenceThreshold: number;
  photoResizeWidth?: number;
  photoResizeHeight?: number;
  photoQuality: number;
  watermarkElements: WatermarkElement[];
  eventLogoUrl?: string;
  welcomeMessage?: string;
  welcomePictureUrl?: string;
  paymentAmount: number;
}

export interface CreateUserRequest {
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string;
  companyName?: string;
  portfolioUrl?: string;
  specialization?: string;
  bio?: string;
}

export interface FaceScanRequest {
  eventId: string;
  faceImageData: string; // Base64 encoded
  deviceFingerprint: string;
}

export interface FaceScanResponse {
  sessionId: string;
  matchedPhotos: Photo[];
  totalMatches: number;
}

export interface PhotoUploadRequest {
  eventId: string;
  photos: {
    fileName: string;
    fileSize: number;
    capturedAt?: string;
  }[];
}

export interface PhotographerAssignment {
  eventId: string;
  photographerId: string;
  assignedAt: string;
}

export interface DashboardStats {
  totalEvents: number;
  activeEvents: number;
  totalUsers: {
    admins: number;
    organizers: number;
    photographers: number;
  };
  totalPhotos: number;
  storageUsed: number;
  flaggedContent: number;
  revenue: {
    total: number;
    thisMonth: number;
  };
}

export interface PhotographerPortfolio {
  photographer: User;
  stats: {
    totalEvents: number;
    totalPhotos: number;
    averagePhotosPerEvent: number;
    memberSince: string;
  };
}
