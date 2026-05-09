import { NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';

// THIS FILE SHOULD BE DELETED BEFORE GOING TO PRODUCTION.
// It is intentionally disabled here to prevent accidental data exposure.
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  try {
    const users = await serverQuery(`SELECT id, email, username FROM users`);
    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
