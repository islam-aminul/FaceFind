import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import '@/lib/amplify-config';

const client = generateClient<Schema>({
  authMode: 'apiKey',
});

const DEFAULT_CONFIG_KEY = 'default';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to fetch existing config
    const result = await client.models.BillingConfig.list({
      filter: { configKey: { eq: DEFAULT_CONFIG_KEY } },
    });

    if (result.errors) {
      console.error('BillingConfig fetch errors:', result.errors);
      return NextResponse.json(
        { error: 'Failed to fetch billing config', details: result.errors },
        { status: 500 }
      );
    }

    // If config exists, return it
    if (result.data && result.data.length > 0) {
      return NextResponse.json({
        success: true,
        config: result.data[0],
      });
    }

    // If no config exists, return default values
    const defaultConfig = {
      configKey: DEFAULT_CONFIG_KEY,
      avgPhotoSizeAfterProcessingMB: 5,
      avgOriginalPhotoSizeMB: 8,
      thumbnailSizeMB: 0.2,
      avgScansPerAttendee: 3,
      avgDownloadsPerAttendee: 3,
      avgPhotoViewsPerAttendee: 15,
      lambdaMemoryGB: 0.512,
      lambdaAvgExecutionSeconds: 3,
      profitMarginPercent: 40,
      processingOverhead: 1.2,
      storageOverhead: 1.1,
    };

    return NextResponse.json({
      success: true,
      config: defaultConfig,
    });
  } catch (error: any) {
    console.error('BillingConfig fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch billing config' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Extract config fields
    const {
      avgPhotoSizeAfterProcessingMB,
      avgOriginalPhotoSizeMB,
      thumbnailSizeMB,
      avgScansPerAttendee,
      avgDownloadsPerAttendee,
      avgPhotoViewsPerAttendee,
      lambdaMemoryGB,
      lambdaAvgExecutionSeconds,
      profitMarginPercent,
      processingOverhead,
      storageOverhead,
    } = body;

    // Check if config already exists
    const existingResult = await client.models.BillingConfig.list({
      filter: { configKey: { eq: DEFAULT_CONFIG_KEY } },
    });

    if (existingResult.errors) {
      console.error('BillingConfig check errors:', existingResult.errors);
      return NextResponse.json(
        { error: 'Failed to check existing config', details: existingResult.errors },
        { status: 500 }
      );
    }

    const configData = {
      configKey: DEFAULT_CONFIG_KEY,
      avgPhotoSizeAfterProcessingMB,
      avgOriginalPhotoSizeMB,
      thumbnailSizeMB,
      avgScansPerAttendee,
      avgDownloadsPerAttendee,
      avgPhotoViewsPerAttendee,
      lambdaMemoryGB,
      lambdaAvgExecutionSeconds,
      profitMarginPercent,
      processingOverhead,
      storageOverhead,
    };

    let result;

    if (existingResult.data && existingResult.data.length > 0) {
      // Update existing config
      result = await client.models.BillingConfig.update({
        id: existingResult.data[0].id,
        ...configData,
      });
    } else {
      // Create new config
      result = await client.models.BillingConfig.create(configData);
    }

    if (result.errors) {
      console.error('BillingConfig save errors:', result.errors);
      return NextResponse.json(
        { error: 'Failed to save billing config', details: result.errors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      config: result.data,
    });
  } catch (error: any) {
    console.error('BillingConfig save error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save billing config' },
      { status: 500 }
    );
  }
}
