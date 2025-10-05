import { NextRequest, NextResponse } from 'next/server';
import { faceRecognitionService } from '@/lib/api/face-recognition';
import { FaceScanRequest } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { faceImageData, deviceFingerprint } = body;

    if (!faceImageData || !deviceFingerprint) {
      return NextResponse.json(
        { error: 'Face image and device fingerprint are required' },
        { status: 400 }
      );
    }

    const scanRequest: FaceScanRequest = {
      eventId: params.id,
      faceImageData,
      deviceFingerprint,
    };

    const result = await faceRecognitionService.scanFace(scanRequest);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
