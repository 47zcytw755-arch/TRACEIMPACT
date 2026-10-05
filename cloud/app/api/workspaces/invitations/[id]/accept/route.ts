import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { invitationService } from '@/lib/workspaces';
import { auditService } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invitationId } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in to accept the invitation.' }, { status: 401 });
    }

    const invitation = await invitationService.getInvitationById(invitationId);
    if (!invitation) {
      return NextResponse.json({ success: false, error: 'Invitation not found.' }, { status: 404 });
    }

    await invitationService.acceptInvitation(invitationId, user.email, user.id);

    await auditService.recordAuditLog({
      workspaceId: invitation.workspaceId,
      userId: user.id,
      userEmail: user.email,
      action: 'MEMBER_ACCEPTED',
      resourceType: 'invitation',
      resourceId: invitationId,
      metadata: { role: invitation.role },
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted. You are now a member of the workspace.',
      workspaceId: invitation.workspaceId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to accept invitation';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
