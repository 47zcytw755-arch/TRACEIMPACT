import { NextRequest, NextResponse } from 'next/server';
import { getStorageProvider } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * Direct Local Storage Binary Ingestion Endpoint
 * 
 * Used during local development and testing when external Cloudflare R2 / Supabase Storage
 * buckets are not connected. Accepts direct binary streaming PUT requests.
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storageKey = searchParams.get('storageKey');

    if (!storageKey) {
      return NextResponse.json(
        { success: false, error: 'Missing storageKey parameter in direct upload URL.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Persist directly into storage provider
    const storage = getStorageProvider();
    
    if (typeof storage.upload === 'function') {
      const parts = storageKey.split('/');
      const filename = parts[parts.length - 1] || 'data.csv';
      const workspaceId = parts[1] || 'default-workspace';
      const datasetId = parts[3] || 'default-dataset';
      const ext = (filename.split('.').pop()?.toLowerCase() || 'csv') as 'csv' | 'xlsx' | 'json' | 'txt';

      await storage.upload({
        workspaceId,
        datasetId,
        fileId: datasetId,
        originalFilename: filename,
        extension: ext,
        mimeType: request.headers.get('content-type') || 'application/octet-stream',
        buffer,
      });
    }

    return new NextResponse(null, { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Direct storage write failed';
    console.error('Direct upload error:', err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
