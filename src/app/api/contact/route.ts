import { NextResponse } from 'next/server';
import { saveContactSubmission } from '@/lib/data';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.name || !body.email || !body.message) {
      return NextResponse.json({ error: 'Missing name, email, or message' }, { status: 400 });
    }

    const name = String(body.name).slice(0, 150);
    const email = String(body.email).slice(0, 150);
    const message = String(body.message).slice(0, 4000);

    const result = await saveContactSubmission({ name, email, message });
    if (result.stored) {
      return NextResponse.json({ success: true, message: 'Message stored successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to store submission in database' }, { status: 500 });
    }
  } catch (error) {
    console.error('API Contact route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
