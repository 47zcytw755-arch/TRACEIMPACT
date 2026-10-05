import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { workspaceService } from '@/lib/workspaces';
import { hasPermission } from '@/lib/auth/rbac';
import { auditService } from '@/lib/audit';
import { AuditLogAction } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;
    const { searchParams } = new URL(request.url);
    const actionFilter = searchParams.get('action') as AuditLogAction | null;
    const userIdFilter = searchParams.get('userId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = await workspaceService.getMemberRole(workspaceId, user.id);
    if (!userRole) {
      return NextResponse.json({ success: false, error: 'Workspace not found or access denied.' }, { status: 404 });
    }

    if (!hasPermission(userRole, 'view_audit_logs')) {
      return NextResponse.json({ success: false, error: 'Forbidden: Only workspace owners and admins can view audit logs.' }, { status: 403 });
    }

    const logs = await auditService.listAuditLogs(workspaceId, {
      action: actionFilter || undefined,
      userId: userIdFilter,
      limit,
    });

    return NextResponse.json({ success: true, logs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve audit logs';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
