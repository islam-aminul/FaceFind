import { NextRequest, NextResponse } from 'next/server';
import { s3Service } from '@/lib/aws/s3';
import { settingsService } from '@/lib/services/settings-service';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get storage configuration
    const storageConfig = await settingsService.getStorageConfig();
    const MAX_FILE_SIZE = storageConfig.maxUploadSizeMB * 1024 * 1024;
    const ALLOWED_TYPES = storageConfig.allowedFileTypes;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const eventId = formData.get('eventId') as string;
    const assetType = formData.get('assetType') as string; // 'logo' or 'welcome'

    // Validation
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId is required' },
        { status: 400 }
      );
    }

    if (!assetType || (assetType !== 'logo' && assetType !== 'welcome')) {
      return NextResponse.json(
        { error: 'assetType must be either "logo" or "welcome"' },
        { status: 400 }
      );
    }

    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Only ${ALLOWED_TYPES.join(', ')} files are allowed` },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size must be less than ${storageConfig.maxUploadSizeMB}MB` },
        { status: 400 }
      );
    }

    // Generate filename with timestamp
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

    // Generate S3 key
    const s3Key = s3Service.generateEventAssetKey(
      eventId,
      assetType as 'logo' | 'welcome',
      filename
    );

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3
    const url = await s3Service.uploadFile(
      s3Key,
      buffer,
      file.type,
      {
        originalFilename: file.name,
        uploadedAt: new Date().toISOString(),
      }
    );

    return NextResponse.json({
      success: true,
      url,
      key: s3Key,
      filename,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
