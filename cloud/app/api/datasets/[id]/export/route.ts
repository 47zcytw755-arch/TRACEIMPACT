import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { datasetRepository } from '@/lib/db/dataset-repository';
import { workspaceService } from '@/lib/workspaces';
import { hasPermission } from '@/lib/auth/rbac';
import { exportCleanedDataset } from '@/lib/export';
import { auditService } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: datasetId } = await params;
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId') || 'default-workspace';
    const format = (searchParams.get('format') || 'csv').toLowerCase() as 'csv' | 'json';

    // 1. Authenticate user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify workspace membership & RBAC permissions
    const userRole = await workspaceService.getMemberRole(workspaceId, user.id);
    if (!userRole) {
      return NextResponse.json({ success: false, error: 'Access denied: You are not a member of this workspace.' }, { status: 404 });
    }

    if (!hasPermission(userRole, 'export_data')) {
      return NextResponse.json({ success: false, error: 'Forbidden: Insufficient permissions to export datasets.' }, { status: 403 });
    }

    // 3. Retrieve dataset scoped to workspace
    const dataset = await datasetRepository.getDatasetById(datasetId, workspaceId);
    if (!dataset) {
      return NextResponse.json({ success: false, error: 'Dataset not found or access denied.' }, { status: 404 });
    }

    // 4. Export cleaned representation
    const exportResult = exportCleanedDataset(dataset, format);

    // 5. Record audit log
    await auditService.recordAuditLog({
      workspaceId,
      userId: user.id,
      userEmail: user.email,
      action: 'DATASET_EXPORTED',
      resourceType: 'dataset',
      resourceId: dataset.id,
      metadata: { format, rowCount: exportResult.rowCount, filename: exportResult.filename },
    });

    // 6. Return downloadable file response
    return new NextResponse(exportResult.data, {
      status: 200,
      headers: {
        'Content-Type': exportResult.mimeType,
        'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Export failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
