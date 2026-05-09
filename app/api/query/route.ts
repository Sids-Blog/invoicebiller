import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';
import { requireAuth } from '@/lib/server-auth';

/**
 * POST /api/query
 * Body: { query: string, params: any[] }
 *
 * Central serverless API route for database queries from client components.
 * Requires an authenticated session (HttpOnly cookie).
 *
 * SECURITY NOTE: This endpoint still accepts arbitrary SQL from authenticated
 * users. Future improvement: replace with named-operation allowlist. For now,
 * the session check prevents anonymous access.
 */
export async function POST(request: NextRequest) {
  // ── Auth guard ─────────────────────────────────────────────
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult.error;

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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
