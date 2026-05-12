import { NextResponse } from 'next/server';

/**
 * This endpoint has been intentionally disabled.
 * Debug endpoints must never exist in production code.
 * If you need to inspect users, use the Admin Panel (/admin).
 */
export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
