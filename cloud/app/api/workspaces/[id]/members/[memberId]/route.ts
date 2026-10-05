import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { workspaceService } from '@/lib/workspaces';
import { auditService } from '@/lib/audit';
import { WorkspaceRole } from '@/types';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: workspaceId, memberId } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { role } = body as { role: WorkspaceRole };

    if (!role || !['owner', 'admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Valid role is required.' }, { status: 400 });
    }

    const updated = await workspaceService.updateMemberRole(workspaceId, memberId, role, user.id);

    await auditService.recordAuditLog({
      workspaceId,
      userId: user.id,
      userEmail: user.email,
      action: 'ROLE_CHANGED',
      resourceType: 'member',
      resourceId: memberId,
      metadata: { newRole: role, targetUserId: memberId },
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update member role';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: workspaceId, memberId } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await workspaceService.removeMember(workspaceId, memberId, user.id);

    await auditService.recordAuditLog({
      workspaceId,
      userId: user.id,
      userEmail: user.email,
      action: 'MEMBER_REMOVED',
      resourceType: 'member',
      resourceId: memberId,
    });

    return NextResponse.json({ success: true, message: 'Member removed successfully.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to remove member';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
