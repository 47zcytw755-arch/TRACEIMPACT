import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthenticatedUser } from '@/lib/auth';
import { workspaceService } from '@/lib/workspaces';
import { hasPermission } from '@/lib/auth/rbac';
import { getStorageProvider } from '@/lib/storage';
import { SupportedFileType } from '@/types';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024; // 250 MB
const ALLOWED_EXTENSIONS: SupportedFileType[] = ['csv', 'xlsx', 'json', 'txt'];

/**
 * Direct-to-Storage Upload Authorization Endpoint
 * 
 * Generates signed direct upload URLs so browsers upload files (up to 200MB+)
 * directly to durable object storage without passing through Vercel serverless request bodies.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      filename,
      sizeBytes = 0,
      mimeType = 'application/octet-stream',
      workspaceId = 'default-workspace',
      datasetName,
    } = body;

    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Filename is required for upload authorization.' },
        { status: 400 }
      );
    }

    // 1. Authenticate user if session exists
    const user = await getAuthenticatedUser(request);
    if (user) {
      const userRole = await workspaceService.getMemberRole(workspaceId, user.id);
      if (userRole && !hasPermission(userRole, 'upload_dataset')) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Insufficient permissions to upload datasets in this workspace.' },
          { status: 403 }
        );
      }
    }

    // 2. Validate file extension
    const ext = filename.split('.').pop()?.toLowerCase() as SupportedFileType;
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file format ".${ext}". Supported formats are: CSV, XLSX, JSON, TXT.`,
        },
        { status: 415 }
      );
    }

    // 3. Validate maximum size limit
    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File size (${(sizeBytes / (1024 * 1024)).toFixed(1)} MB) exceeds configured 250 MB ceiling.`,
        },
        { status: 413 }
      );
    }

    // 4. Generate unique identifiers
    const datasetId = crypto.randomUUID();
    const fileId = crypto.randomUUID();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    // 5. Request presigned direct upload URL from active storage provider
    const storage = getStorageProvider();
    const presigned = await storage.getPresignedUploadUrl({
      workspaceId,
      datasetId,
      fileId,
      safeFilename: sanitizedFilename,
      mimeType,
      sizeBytes,
    });

    return NextResponse.json(
      {
        success: true,
        datasetId,
        fileId,
        storageKey: presigned.storageKey,
        uploadUrl: presigned.uploadUrl,
        method: presigned.method || 'PUT',
        headers: presigned.headers || {},
        fields: presigned.fields,
        expiresInSeconds: presigned.expiresInSeconds,
        storageProvider: storage.name,
        datasetName: datasetName || sanitizedFilename.replace(/\.[^/.]+$/, ''),
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to authorize direct upload';
    console.error('Upload authorization error:', err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
