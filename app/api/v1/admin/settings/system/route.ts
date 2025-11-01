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

    const result = await client.models.SystemConfig.list({
      filter: { configKey: { eq: DEFAULT_CONFIG_KEY } },
    });

    if (result.errors) {
      console.error('SystemConfig fetch errors:', result.errors);
      return NextResponse.json(
        { error: 'Failed to fetch system config', details: result.errors },
        { status: 500 }
      );
    }

    if (result.data && result.data.length > 0) {
      return NextResponse.json({
        success: true,
        config: result.data[0],
      });
    }

    // Return defaults
    const defaultConfig = {
      configKey: DEFAULT_CONFIG_KEY,
      appName: 'FaceFind',
      supportEmail: 'support@facefind.com',
      supportPhone: '',
      maintenanceMode: false,
      maintenanceMessage: '',
      allowNewRegistrations: true,
      termsOfServiceUrl: '',
      privacyPolicyUrl: '',
    };

    return NextResponse.json({
      success: true,
      config: defaultConfig,
    });
  } catch (error: any) {
    console.error('SystemConfig fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch system config' },
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
      appName,
      supportEmail,
      supportPhone,
      maintenanceMode,
      maintenanceMessage,
      allowNewRegistrations,
      termsOfServiceUrl,
      privacyPolicyUrl,
    } = body;

    const existingResult = await client.models.SystemConfig.list({
      filter: { configKey: { eq: DEFAULT_CONFIG_KEY } },
    });

    if (existingResult.errors) {
      console.error('SystemConfig check errors:', existingResult.errors);
      return NextResponse.json(
        { error: 'Failed to check existing config', details: existingResult.errors },
        { status: 500 }
      );
    }

    const configData = {
      configKey: DEFAULT_CONFIG_KEY,
      appName,
      supportEmail,
      supportPhone: supportPhone || '',
      maintenanceMode,
      maintenanceMessage: maintenanceMessage || '',
      allowNewRegistrations,
      termsOfServiceUrl: termsOfServiceUrl || '',
      privacyPolicyUrl: privacyPolicyUrl || '',
    };

    let result;

    if (existingResult.data && existingResult.data.length > 0) {
      result = await client.models.SystemConfig.update({
        id: existingResult.data[0].id,
        ...configData,
      });
    } else {
      result = await client.models.SystemConfig.create(configData);
    }

    if (result.errors) {
      console.error('SystemConfig save errors:', result.errors);
      return NextResponse.json(
        { error: 'Failed to save system config', details: result.errors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      config: result.data,
    });
  } catch (error: any) {
    console.error('SystemConfig save error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save system config' },
      { status: 500 }
    );
  }
}
