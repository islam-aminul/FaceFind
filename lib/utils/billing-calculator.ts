/**
 * Billing Calculator for FaceFind Events
 * Calculates estimated AWS costs + profit margin based on event configuration
 */

// AWS Service Pricing (ap-south-1 Mumbai region - as of 2024, in INR)
const AWS_PRICING = {
  // S3 Storage: ₹1.84 per GB/month
  s3StoragePerGBMonth: 1.84,

  // S3 API Requests
  s3PutRequestPer1000: 0.038, // ₹0.038 per 1,000 PUT requests
  s3GetRequestPer1000: 0.003, // ₹0.003 per 1,000 GET requests

  // Lambda (assuming 512MB memory, 3 second average execution)
  lambdaRequestPer1M: 16.67, // ₹16.67 per 1M requests
  lambdaComputePerGBSecond: 0.00001389, // ₹0.00001389 per GB-second

  // Rekognition Face Detection
  rekognitionDetectFacesPer1000: 83.33, // ₹83.33 per 1,000 images

  // Rekognition Face Search
  rekognitionSearchFacesPer1000: 83.33, // ₹83.33 per 1,000 searches

  // DynamoDB (On-demand pricing)
  dynamoDBWritePer1M: 104.17, // ₹104.17 per 1M write request units
  dynamoDBReadPer1M: 20.83, // ₹20.83 per 1M read request units
  dynamoDBStoragePerGB: 2.08, // ₹2.08 per GB/month

  // CloudFront Data Transfer
  cloudFrontDataTransferPerGB: 7.29, // ₹7.29 per GB (first 10TB)

  // SES (Email)
  sesEmailPer1000: 8.33, // ₹8.33 per 1,000 emails
};

// Configuration defaults
const CONFIG = {
  avgPhotoSizeAfterProcessingMB: 5, // Average processed photo size (configurable)
  avgOriginalPhotoSizeMB: 8, // Average original photo size
  thumbnailSizeMB: 0.2, // Thumbnail size

  avgScansPerAttendee: 3, // Average number of face scans per attendee (configurable)
  avgDownloadsPerAttendee: 3, // Average photo downloads per attendee
  avgPhotoViewsPerAttendee: 15, // Average photo views per attendee

  lambdaMemoryGB: 0.512, // 512MB
  lambdaAvgExecutionSeconds: 3, // 3 seconds average

  profitMarginPercent: 40, // 40% profit margin (configurable)

  // Overhead multipliers
  processingOverhead: 1.2, // 20% overhead for processing variations
  storageOverhead: 1.1, // 10% overhead for metadata and redundancy
};

export interface BillingEstimate {
  breakdown: {
    storage: number;
    lambda: number;
    rekognition: number;
    dynamodb: number;
    cloudfront: number;
    email: number;
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
 * Calculate retention period pricing multiplier
 * Longer retention = higher risk + more storage cost
 */
function getRetentionPricingMultiplier(retentionDays: number): number {
  if (retentionDays <= 7) return 1.0;       // Base price: 0-7 days
  if (retentionDays <= 14) return 1.15;     // +15%: 8-14 days
  if (retentionDays <= 30) return 1.30;     // +30%: 15-30 days
  if (retentionDays <= 60) return 1.50;     // +50%: 31-60 days
  if (retentionDays <= 90) return 1.75;     // +75%: 61-90 days
  return 2.0;                                // +100%: 90+ days
}

/**
 * Calculate billing estimate for an event
 */
export function calculateEventBilling(params: {
  estimatedAttendees: number;
  maxPhotos: number;
  retentionPeriodDays: number;
  confidenceThreshold?: number;
  photoResizeWidth?: number;
  photoResizeHeight?: number;
}): BillingEstimate {
  const {
    estimatedAttendees,
    maxPhotos,
    retentionPeriodDays,
  } = params;

  // Calculate total storage needed
  const storageInMonths = retentionPeriodDays / 30;

  // Photos storage (original + processed + thumbnail)
  const totalPhotoStorageGB = (
    (maxPhotos * CONFIG.avgOriginalPhotoSizeMB) + // Original
    (maxPhotos * CONFIG.avgPhotoSizeAfterProcessingMB) + // Processed
    (maxPhotos * CONFIG.thumbnailSizeMB) // Thumbnail
  ) / 1024 * CONFIG.storageOverhead;

  // Metadata storage (DynamoDB)
  const metadataStorageGB = (maxPhotos * 0.01) / 1024; // ~10KB per photo record

  // S3 Storage Cost
  const s3StorageCost = totalPhotoStorageGB * AWS_PRICING.s3StoragePerGBMonth * storageInMonths;

  // S3 API Requests
  const s3PutRequests = maxPhotos * 3; // Original + processed + thumbnail
  const s3GetRequests = estimatedAttendees * CONFIG.avgDownloadsPerAttendee * 2; // Downloads + views
  const s3ApiCost = (
    (s3PutRequests / 1000 * AWS_PRICING.s3PutRequestPer1000) +
    (s3GetRequests / 1000 * AWS_PRICING.s3GetRequestPer1000)
  );

  const totalStorageCost = s3StorageCost + s3ApiCost;

  // Lambda Processing Cost
  const lambdaInvocations = maxPhotos * 2; // Upload processing + face detection
  const lambdaRequestCost = (lambdaInvocations / 1000000) * AWS_PRICING.lambdaRequestPer1M;
  const lambdaComputeCost = lambdaInvocations * CONFIG.lambdaMemoryGB *
    CONFIG.lambdaAvgExecutionSeconds * AWS_PRICING.lambdaComputePerGBSecond;
  const totalLambdaCost = (lambdaRequestCost + lambdaComputeCost) * CONFIG.processingOverhead;

  // Rekognition Cost
  const faceDetectionCost = (maxPhotos / 1000) * AWS_PRICING.rekognitionDetectFacesPer1000;
  const totalScans = estimatedAttendees * CONFIG.avgScansPerAttendee;
  const faceSearchCost = (totalScans / 1000) * AWS_PRICING.rekognitionSearchFacesPer1000;
  const totalRekognitionCost = faceDetectionCost + faceSearchCost;

  // DynamoDB Cost
  const writeRequests = maxPhotos * 5; // Photo records + metadata
  const readRequests = estimatedAttendees * CONFIG.avgPhotoViewsPerAttendee;
  const dynamoDBWriteCost = (writeRequests / 1000000) * AWS_PRICING.dynamoDBWritePer1M;
  const dynamoDBReadCost = (readRequests / 1000000) * AWS_PRICING.dynamoDBReadPer1M;
  const dynamoDBStorageCost = metadataStorageGB * AWS_PRICING.dynamoDBStoragePerGB * storageInMonths;
  const totalDynamoDBCost = dynamoDBWriteCost + dynamoDBReadCost + dynamoDBStorageCost;

  // CloudFront Data Transfer (for photo delivery)
  const dataTransferGB = (estimatedAttendees * CONFIG.avgDownloadsPerAttendee *
    CONFIG.avgPhotoSizeAfterProcessingMB) / 1024;
  const cloudFrontCost = dataTransferGB * AWS_PRICING.cloudFrontDataTransferPerGB;

  // Email Cost (SES - notifications)
  const emailsSent = estimatedAttendees * 2; // Invitation + reminder
  const emailCost = (emailsSent / 1000) * AWS_PRICING.sesEmailPer1000;

  // Other costs (WAF, CloudWatch, misc)
  const otherCost = (totalStorageCost + totalLambdaCost + totalRekognitionCost) * 0.1; // 10% overhead

  // Total AWS Cost (before retention multiplier)
  const baseAWSCost =
    totalStorageCost +
    totalLambdaCost +
    totalRekognitionCost +
    totalDynamoDBCost +
    cloudFrontCost +
    emailCost +
    otherCost;

  // Apply retention period multiplier for longer storage commitments
  const retentionMultiplier = getRetentionPricingMultiplier(retentionPeriodDays);
  const totalAWSCost = baseAWSCost * retentionMultiplier;

  // Add profit margin
  const profitMargin = totalAWSCost * (CONFIG.profitMarginPercent / 100);
  const estimatedPrice = Math.ceil((totalAWSCost + profitMargin) / 100) * 100; // Round to nearest 100

  return {
    breakdown: {
      storage: Math.round(totalStorageCost * 100) / 100,
      lambda: Math.round(totalLambdaCost * 100) / 100,
      rekognition: Math.round(totalRekognitionCost * 100) / 100,
      dynamodb: Math.round(totalDynamoDBCost * 100) / 100,
      cloudfront: Math.round(cloudFrontCost * 100) / 100,
      email: Math.round(emailCost * 100) / 100,
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
export function getPricingConfig() {
  return CONFIG;
}

/**
 * Update pricing configuration (for admin settings)
 */
export function updatePricingConfig(updates: Partial<typeof CONFIG>) {
  Object.assign(CONFIG, updates);
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
    `Other Services: ${formatINR(estimate.breakdown.other)}`,
  ];
}
