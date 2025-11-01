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

    const result = await client.models.SecurityConfig.list({
      filter: { configKey: { eq: DEFAULT_CONFIG_KEY } },
    });

    if (result.errors) {
      console.error('SecurityConfig fetch errors:', result.errors);
      return NextResponse.json(
        { error: 'Failed to fetch security config', details: result.errors },
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
      minPasswordLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      passwordExpiryDays: 90,
      maxLoginAttempts: 5,
      lockoutDurationMinutes: 30,
      sessionTimeoutMinutes: 60,
      require2FA: false,
    };

    return NextResponse.json({
      success: true,
      config: defaultConfig,
    });
  } catch (error: any) {
    console.error('SecurityConfig fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch security config' },
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
      minPasswordLength,
      requireUppercase,
      requireLowercase,
      requireNumbers,
      requireSpecialChars,
      passwordExpiryDays,
      maxLoginAttempts,
      lockoutDurationMinutes,
      sessionTimeoutMinutes,
      require2FA,
    } = body;

    const existingResult = await client.models.SecurityConfig.list({
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
      minPasswordLength,
      requireUppercase,
      requireLowercase,
      requireNumbers,
      requireSpecialChars,
      passwordExpiryDays,
      maxLoginAttempts,
      lockoutDurationMinutes,
      sessionTimeoutMinutes,
      require2FA,
    };

    let result;

    if (existingResult.data && existingResult.data.length > 0) {
      result = await client.models.SecurityConfig.update({
        id: existingResult.data[0].id,
        ...configData,
      });
    } else {
      result = await client.models.SecurityConfig.create(configData);
    }

    if (result.errors) {
      return NextResponse.json(
        { error: 'Failed to save security config', details: result.errors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      config: result.data,
    });
  } catch (error: any) {
    console.error('SecurityConfig save error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save security config' },
      { status: 500 }
    );
  }
}
