import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { workspaceService } from '@/lib/workspaces';
import { hasPermission } from '@/lib/auth/rbac';
import { ingestFromStoredObject } from '@/lib/ingestion/ingestion-service';
import { auditService } from '@/lib/audit';
import { SupportedFileType } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * Direct Upload Completion & Ingestion Trigger Endpoint
 * 
 * Invoked once the browser finishes uploading directly to object storage.
 * Reads the object from storage, triggers schema inference, statistical profiling,
 * deterministic data quality scoring, and database record persistence.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      datasetId,
      fileId,
      storageKey,
      workspaceId = 'default-workspace',
      filename,
      sizeBytes = 0,
      mimeType = 'application/octet-stream',
      datasetName,
      description,
    } = body;

    if (!datasetId || !storageKey || !filename) {
      return NextResponse.json(
        { success: false, error: 'Missing required completion parameters (datasetId, storageKey, filename).' },
        { status: 400 }
      );
    }

    // 1. Authenticate user if session exists
    const user = await getAuthenticatedUser(request);
    if (user) {
      const userRole = await workspaceService.getMemberRole(workspaceId, user.id);
      if (userRole && !hasPermission(userRole, 'upload_dataset')) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Insufficient permissions to ingest datasets in this workspace.' },
          { status: 403 }
        );
      }
    }

    const ext = filename.split('.').pop()?.toLowerCase() as SupportedFileType;

    // 2. Ingest from stored object
    const result = await ingestFromStoredObject({
      datasetId,
      fileId: fileId || datasetId,
      storageKey,
      workspaceId,
      datasetName,
      description,
      originalFilename: filename,
      extension: ext,
      mimeType,
      sizeBytes,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.errorMessage || 'Dataset processing failed on stored object.',
          datasetId: result.datasetId,
        },
        { status: 422 }
      );
    }

    // 3. Record audit log
    if (user) {
      await auditService.recordAuditLog({
        workspaceId,
        userId: user.id,
        userEmail: user.email,
        action: 'DATASET_CREATED',
        resourceType: 'dataset',
        resourceId: result.datasetId,
        metadata: {
          filename,
          sizeBytes,
          rowCount: result.dataset?.rowCount,
          qualityScore: result.dataset?.qualityScore,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        datasetId: result.datasetId,
        fileId: result.fileId,
        status: result.status,
        dataset: result.dataset,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal server error during upload completion';
    console.error('Upload complete route error:', err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
