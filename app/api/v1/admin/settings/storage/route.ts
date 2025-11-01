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

    const result = await client.models.StorageConfig.list({
      filter: { configKey: { eq: DEFAULT_CONFIG_KEY } },
    });

    if (result.errors) {
      return NextResponse.json(
        { error: 'Failed to fetch storage config', details: result.errors },
        { status: 500 }
      );
    }

    if (result.data && result.data.length > 0) {
      return NextResponse.json({
        success: true,
        config: result.data[0],
      });
    }

    const defaultConfig = {
      configKey: DEFAULT_CONFIG_KEY,
      s3BucketName: process.env.NEXT_PUBLIC_S3_BUCKET || 'facefind-photos',
      s3Region: 'ap-south-1',
      maxUploadSizeMB: 10,
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/jpg'],
      enableCDN: true,
      cdnDomain: '',
      storageQuotaPerEventGB: 100,
      autoCleanupEnabled: true,
      cleanupAfterDays: 90,
    };

    return NextResponse.json({
      success: true,
      config: defaultConfig,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch storage config' },
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

    const {
      s3BucketName,
      s3Region,
      maxUploadSizeMB,
      allowedFileTypes,
      enableCDN,
      cdnDomain,
      storageQuotaPerEventGB,
      autoCleanupEnabled,
      cleanupAfterDays,
    } = body;

    const existingResult = await client.models.StorageConfig.list({
      filter: { configKey: { eq: DEFAULT_CONFIG_KEY } },
    });

    if (existingResult.errors) {
      return NextResponse.json(
        { error: 'Failed to check existing config', details: existingResult.errors },
        { status: 500 }
      );
    }

    const configData = {
      configKey: DEFAULT_CONFIG_KEY,
      s3BucketName,
      s3Region,
      maxUploadSizeMB,
      allowedFileTypes: allowedFileTypes || [],
      enableCDN,
      cdnDomain: cdnDomain || '',
      storageQuotaPerEventGB,
      autoCleanupEnabled,
      cleanupAfterDays,
    };

    let result;

    if (existingResult.data && existingResult.data.length > 0) {
      result = await client.models.StorageConfig.update({
        id: existingResult.data[0].id,
        ...configData,
      });
    } else {
      result = await client.models.StorageConfig.create(configData);
    }

    if (result.errors) {
      return NextResponse.json(
        { error: 'Failed to save storage config', details: result.errors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      config: result.data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save storage config' },
      { status: 500 }
    );
  }
}
