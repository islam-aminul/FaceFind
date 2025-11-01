import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import '@/lib/amplify-config';

const client = generateClient<Schema>({
  authMode: 'apiKey',
});

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    // Fetch all users
    const result = await client.models.User.list();

    if (result.errors) {
      console.error('User list errors:', result.errors);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    let users = result.data || [];

    // Filter by role if specified
    if (role) {
      users = users.filter(u => u.role === role);
    }

    // Filter by status if specified
    if (status) {
      users = users.filter(u => u.status === status);
    }

    // Sort by creation date (newest first)
    const sortedUsers = users.sort((a, b) =>
      new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
    );

    return NextResponse.json({
      success: true,
      users: sortedUsers,
      total: users.length,
    });
  } catch (error: any) {
    console.error('User list error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
