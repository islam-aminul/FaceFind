import { NextRequest, NextResponse } from 'next/server';
import { settingsService } from '@/lib/services/settings-service';

/**
 * GET /api/v1/settings/defaults
 * Fetch default configuration values for event creation forms
 */
export async function GET(request: NextRequest) {
  try {
    // Get all relevant configurations
    const [storageConfig, faceRecognitionConfig, systemConfig, eventDefaults] = await Promise.all([
      settingsService.getStorageConfig(),
      settingsService.getFaceRecognitionConfig(),
      settingsService.getSystemConfig(),
      settingsService.getEventDefaults(),
    ]);

    return NextResponse.json({
      success: true,
      defaults: {
        // Storage settings
        maxUploadSizeMB: storageConfig.maxUploadSizeMB,
        allowedFileTypes: storageConfig.allowedFileTypes,

        // Face recognition settings
        confidenceThreshold: faceRecognitionConfig.defaultConfidenceThreshold,
        maxFacesPerPhoto: faceRecognitionConfig.maxFacesPerPhoto,
        minFaceSize: faceRecognitionConfig.minFaceSize,

        // System defaults
        retentionPeriodDays: systemConfig.defaultRetentionPeriodDays,
        gracePeriodHours: systemConfig.defaultGracePeriodHours,

        // Event defaults (now configurable)
        estimatedAttendees: eventDefaults.defaultEstimatedAttendees,
        maxPhotos: eventDefaults.defaultMaxPhotos,
        photoResizeWidth: eventDefaults.defaultPhotoResizeWidth,
        photoResizeHeight: eventDefaults.defaultPhotoResizeHeight,
        photoQuality: eventDefaults.defaultPhotoQuality,
        fallbackPaymentAmount: eventDefaults.fallbackPaymentAmount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching default settings:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch default settings',
        message: error.message
      },
      { status: 500 }
    );
  }
}
