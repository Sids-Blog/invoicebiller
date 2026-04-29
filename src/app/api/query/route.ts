import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';

/**
 * POST /api/query
 * Body: { query: string, params: any[] }
 * 
 * Central serverless API route for all database queries.
 * This moves all DB access server-side, keeping the connection string private.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, params = [] } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
    }

    const rows = await serverQuery(query, params);
    return NextResponse.json({ data: rows });
  } catch (error: any) {
    console.error('[API /query] Error:', error);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
