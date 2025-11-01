/**
 * Billing Calculator for FaceFind Events
 * Calculates estimated AWS costs + profit margin based on event configuration
 * All pricing, multipliers, and tiers are now fully configurable through settings
 */

import { settingsService, type BillingConfigType } from '@/lib/services/settings-service';

export interface BillingEstimate {
  breakdown: {
    storage: number;
    lambda: number;
    rekognition: number;
    dynamodb: number;
    cloudfront: number;
    email: number;
    whatsapp: number;
    other: number;
  };
  totalAWSCost: number;
  profitMargin: number;
  estimatedPrice: number;
  configurations: {
    estimatedAttendees: number;
    maxPhotos: number;
    retentionPeriodDays: number;
    avgPhotoSizeMB: number;
    totalStorageGB: number;
    retentionMultiplier: number;
  };
}

/**
 * Calculate retention period pricing multiplier based on configurable tiers
 */
function getRetentionPricingMultiplier(retentionDays: number, config: BillingConfigType): number {
  if (retentionDays <= config.retentionTier1Days) return config.retentionTier1Multiplier;
  if (retentionDays <= config.retentionTier2Days) return config.retentionTier2Multiplier;
  if (retentionDays <= config.retentionTier3Days) return config.retentionTier3Multiplier;
  if (retentionDays <= config.retentionTier4Days) return config.retentionTier4Multiplier;
  if (retentionDays <= config.retentionTier5Days) return config.retentionTier5Multiplier;
  return config.retentionTier6Multiplier;
}

/**
 * Calculate billing estimate for an event
 */
export async function calculateEventBilling(params: {
  estimatedAttendees: number;
  maxPhotos: number;
  retentionPeriodDays: number;
  confidenceThreshold?: number;
  photoResizeWidth?: number;
  photoResizeHeight?: number;
}): Promise<BillingEstimate> {
  const {
    estimatedAttendees,
    maxPhotos,
    retentionPeriodDays,
  } = params;

  // Get billing configuration from database
  const CONFIG = await settingsService.getBillingConfig();

  // Safety check - this should never happen due to fallback in settingsService
  if (!CONFIG) {
    throw new Error('Failed to get billing configuration - config is null');
  }

  // Calculate total storage needed
  const storageInMonths = retentionPeriodDays / 30;

  // Photos storage (original + processed + thumbnail)
  const totalPhotoStorageGB = (
    (maxPhotos * CONFIG.avgOriginalPhotoSizeMB) + // Original
    (maxPhotos * CONFIG.avgPhotoSizeAfterProcessingMB) + // Processed
    (maxPhotos * CONFIG.thumbnailSizeMB) // Thumbnail
  ) / 1024 * CONFIG.storageOverhead;

  // Metadata storage (DynamoDB)
  const metadataStorageGB = (maxPhotos * CONFIG.metadataStorageSizeKB) / (1024 * 1024);

  // S3 Storage Cost
  const s3StorageCost = totalPhotoStorageGB * CONFIG.s3StoragePerGBMonth * storageInMonths;

  // S3 API Requests
  const s3PutRequests = maxPhotos * CONFIG.s3PutRequestsMultiplier;
  const s3GetRequests = estimatedAttendees * CONFIG.avgDownloadsPerAttendee * CONFIG.s3GetRequestsMultiplier;
  const s3ApiCost = (
    (s3PutRequests / 1000 * CONFIG.s3PutRequestPer1000) +
    (s3GetRequests / 1000 * CONFIG.s3GetRequestPer1000)
  );

  const totalStorageCost = s3StorageCost + s3ApiCost;

  // Lambda Processing Cost
  const lambdaInvocations = maxPhotos * CONFIG.lambdaInvocationsMultiplier;
  const lambdaRequestCost = (lambdaInvocations / 1000000) * CONFIG.lambdaRequestPer1M;
  const lambdaComputeCost = lambdaInvocations * CONFIG.lambdaMemoryGB *
    CONFIG.lambdaAvgExecutionSeconds * CONFIG.lambdaComputePerGBSecond;
  const totalLambdaCost = (lambdaRequestCost + lambdaComputeCost) * CONFIG.processingOverhead;

  // Rekognition Cost
  const faceDetectionCost = (maxPhotos / 1000) * CONFIG.rekognitionDetectFacesPer1000;
  const totalScans = estimatedAttendees * CONFIG.avgScansPerAttendee;
  const faceSearchCost = (totalScans / 1000) * CONFIG.rekognitionSearchFacesPer1000;
  const totalRekognitionCost = faceDetectionCost + faceSearchCost;

  // DynamoDB Cost
  const writeRequests = maxPhotos * CONFIG.dynamoDBWriteMultiplier;
  const readRequests = estimatedAttendees * CONFIG.avgPhotoViewsPerAttendee;
  const dynamoDBWriteCost = (writeRequests / 1000000) * CONFIG.dynamoDBWritePer1M;
  const dynamoDBReadCost = (readRequests / 1000000) * CONFIG.dynamoDBReadPer1M;
  const dynamoDBStorageCost = metadataStorageGB * CONFIG.dynamoDBStoragePerGB * storageInMonths;
  const totalDynamoDBCost = dynamoDBWriteCost + dynamoDBReadCost + dynamoDBStorageCost;

  // CloudFront Data Transfer (for photo delivery)
  const dataTransferGB = (estimatedAttendees * CONFIG.avgDownloadsPerAttendee *
    CONFIG.avgPhotoSizeAfterProcessingMB) / 1024;
  const cloudFrontCost = dataTransferGB * CONFIG.cloudFrontDataTransferPerGB;

  // Email Cost (SES - notifications)
  const emailsSent = estimatedAttendees * CONFIG.avgEmailsPerAttendee;
  const emailCost = (emailsSent / 1000) * CONFIG.sesEmailPer1000;

  // WhatsApp Cost
  const whatsappMessages = estimatedAttendees * CONFIG.avgWhatsappMessagesPerAttendee;
  const whatsappCost = whatsappMessages * CONFIG.whatsappCostPerMessage;

  // Other costs (WAF, CloudWatch, misc)
  const otherCost = (totalStorageCost + totalLambdaCost + totalRekognitionCost) * CONFIG.otherServicesOverhead;

  // Total AWS Cost (before retention multiplier)
  const baseAWSCost =
    totalStorageCost +
    totalLambdaCost +
    totalRekognitionCost +
    totalDynamoDBCost +
    cloudFrontCost +
    emailCost +
    whatsappCost +
    otherCost;

  // Apply retention period multiplier for longer storage commitments
  const retentionMultiplier = getRetentionPricingMultiplier(retentionPeriodDays, CONFIG);
  const totalAWSCost = baseAWSCost * retentionMultiplier;

  // Add profit margin
  const profitMargin = totalAWSCost * (CONFIG.profitMarginPercent / 100);
  const estimatedPrice = Math.ceil((totalAWSCost + profitMargin) / CONFIG.priceRoundingUnit) * CONFIG.priceRoundingUnit;

  return {
    breakdown: {
      storage: Math.round(totalStorageCost * 100) / 100,
      lambda: Math.round(totalLambdaCost * 100) / 100,
      rekognition: Math.round(totalRekognitionCost * 100) / 100,
      dynamodb: Math.round(totalDynamoDBCost * 100) / 100,
      cloudfront: Math.round(cloudFrontCost * 100) / 100,
      email: Math.round(emailCost * 100) / 100,
      whatsapp: Math.round(whatsappCost * 100) / 100,
      other: Math.round(otherCost * 100) / 100,
    },
    totalAWSCost: Math.round(totalAWSCost * 100) / 100,
    profitMargin: Math.round(profitMargin * 100) / 100,
    estimatedPrice,
    configurations: {
      estimatedAttendees,
      maxPhotos,
      retentionPeriodDays,
      avgPhotoSizeMB: CONFIG.avgPhotoSizeAfterProcessingMB,
      totalStorageGB: Math.round(totalPhotoStorageGB * 100) / 100,
      retentionMultiplier,
    },
  };
}

/**
 * Get pricing configuration (for admin settings)
 */
export async function getPricingConfig(): Promise<BillingConfigType> {
  return await settingsService.getBillingConfig();
}

/**
 * Clear cached billing config (call after settings updates)
 */
export function clearBillingConfigCache() {
  settingsService.clearCacheEntry('billing');
}

/**
 * Format currency in INR
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get cost breakdown summary for display
 */
export function getCostSummary(estimate: BillingEstimate): string[] {
  return [
    `Storage (S3): ${formatINR(estimate.breakdown.storage)}`,
    `Processing (Lambda): ${formatINR(estimate.breakdown.lambda)}`,
    `Face Recognition: ${formatINR(estimate.breakdown.rekognition)}`,
    `Database: ${formatINR(estimate.breakdown.dynamodb)}`,
    `Data Transfer: ${formatINR(estimate.breakdown.cloudfront)}`,
    `Email: ${formatINR(estimate.breakdown.email)}`,
    `WhatsApp: ${formatINR(estimate.breakdown.whatsapp)}`,
    `Other Services: ${formatINR(estimate.breakdown.other)}`,
  ];
}
