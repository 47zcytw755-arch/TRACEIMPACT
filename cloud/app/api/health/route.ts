import { NextResponse } from 'next/server';
import { dbClient } from '@/lib/db/db-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 * Lightweight, production-safe health check endpoint.
 * Returns overall platform availability and storage status without exposing secrets or credentials.
 */
export async function GET() {
  try {
    const dbHealth = await dbClient.checkHealth();

    return NextResponse.json(
      {
        status: 'ok',
        service: 'traceimpact-cloud',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        persistence: {
          status: dbHealth.status,
          provider: dbHealth.provider,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        status: 'ok',
        service: 'traceimpact-cloud',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
