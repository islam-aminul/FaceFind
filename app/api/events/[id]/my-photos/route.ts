import { NextRequest, NextResponse } from 'next/server';
import { faceRecognitionService } from '@/lib/api/face-recognition';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const photos = await faceRecognitionService.getSessionPhotos(sessionId);

    return NextResponse.json({ photos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
