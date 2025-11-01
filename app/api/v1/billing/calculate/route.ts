import { NextRequest, NextResponse } from 'next/server';
import { calculateEventBilling } from '@/lib/utils/billing-calculator';

/**
 * POST /api/v1/billing/calculate
 * Calculate billing estimate for event parameters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      estimatedAttendees,
      maxPhotos,
      retentionPeriodDays,
      confidenceThreshold,
      photoResizeWidth,
      photoResizeHeight,
    } = body;

    // Validate required parameters
    if (!estimatedAttendees || !maxPhotos || !retentionPeriodDays) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          message: 'estimatedAttendees, maxPhotos, and retentionPeriodDays are required',
        },
        { status: 400 }
      );
    }

    // Calculate billing estimate
    const estimate = await calculateEventBilling({
      estimatedAttendees: Number(estimatedAttendees),
      maxPhotos: Number(maxPhotos),
      retentionPeriodDays: Number(retentionPeriodDays),
      confidenceThreshold: confidenceThreshold ? Number(confidenceThreshold) : undefined,
      photoResizeWidth: photoResizeWidth ? Number(photoResizeWidth) : undefined,
      photoResizeHeight: photoResizeHeight ? Number(photoResizeHeight) : undefined,
    });

    return NextResponse.json({
      success: true,
      estimate,
    });
  } catch (error: any) {
    console.error('Error calculating billing:', error);
    return NextResponse.json(
      {
        error: 'Failed to calculate billing',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
