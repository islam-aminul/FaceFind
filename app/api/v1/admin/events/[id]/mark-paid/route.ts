import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import '@/lib/amplify-config';

const client = generateClient<Schema>();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { paymentReference, paymentDate } = body;

    // Get current event
    const eventResult = await client.models.Event.get({ id });

    if (eventResult.errors || !eventResult.data) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Check if already paid
    if (eventResult.data.paymentStatus === 'PAID') {
      return NextResponse.json(
        { error: 'Event is already marked as paid' },
        { status: 400 }
      );
    }

    // Update event to paid
    const result = await client.models.Event.update({
      id,
      paymentStatus: 'PAID',
      status: 'PAID', // Also update the event status
    });

    if (result.errors) {
      console.error('Mark as paid errors:', result.errors);
      return NextResponse.json(
        { error: 'Failed to mark event as paid', details: result.errors },
        { status: 500 }
      );
    }

    // TODO: Send email notification to organizer
    // TODO: Create billing record

    return NextResponse.json({
      success: true,
      event: result.data,
      message: 'Event marked as paid successfully',
    });
  } catch (error: any) {
    console.error('Mark as paid error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark event as paid' },
      { status: 500 }
    );
  }
}
