import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import '@/lib/amplify-config';

const client = generateClient<Schema>({ authMode: 'apiKey' });
const DEFAULT_CONFIG_KEY = 'default';

export async function GET(request: NextRequest) {
  try {
    if (!request.headers.get('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await client.models.NotificationConfig.list({
      filter: { configKey: { eq: DEFAULT_CONFIG_KEY } },
    });

    if (result.errors) {
      return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
    }

    if (result.data && result.data.length > 0) {
      return NextResponse.json({ success: true, config: result.data[0] });
    }

    return NextResponse.json({
      success: true,
      config: {
        configKey: DEFAULT_CONFIG_KEY,
        emailProvider: 'SES',
        emailFrom: 'noreply@facefind.com',
        emailFromName: 'FaceFind',
        smtpHost: '',
        smtpPort: 587,
        smtpUsername: '',
        smtpPassword: '',
        whatsappEnabled: false,
        whatsappApiKey: '',
        whatsappPhoneNumber: '',
        sendWelcomeEmails: true,
        sendEventReminders: true,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!request.headers.get('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const existingResult = await client.models.NotificationConfig.list({
      filter: { configKey: { eq: DEFAULT_CONFIG_KEY } },
    });

    if (existingResult.errors) {
      return NextResponse.json({ error: 'Failed to check config' }, { status: 500 });
    }

    const configData = {
      configKey: DEFAULT_CONFIG_KEY,
      ...body,
      smtpHost: body.smtpHost || '',
      smtpUsername: body.smtpUsername || '',
      smtpPassword: body.smtpPassword || '',
      whatsappApiKey: body.whatsappApiKey || '',
      whatsappPhoneNumber: body.whatsappPhoneNumber || '',
    };

    let result;

    if (existingResult.data && existingResult.data.length > 0) {
      result = await client.models.NotificationConfig.update({
        id: existingResult.data[0].id,
        ...configData,
      });
    } else {
      result = await client.models.NotificationConfig.create(configData);
    }

    if (result.errors) {
      return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
    }

    return NextResponse.json({ success: true, config: result.data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
