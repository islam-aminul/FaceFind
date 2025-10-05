import { NextRequest, NextResponse } from 'next/server';
import { cognitoAuthService } from '@/lib/api/auth-cognito';
import '@/lib/amplify-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const result = await cognitoAuthService.login({ email, password });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 401 }
    );
  }
}
