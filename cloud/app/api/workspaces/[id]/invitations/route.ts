import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { invitationService } from '@/lib/workspaces';
import { auditService } from '@/lib/audit';
import { WorkspaceRole } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const invitations = await invitationService.listInvitations(workspaceId);
    return NextResponse.json({ success: true, invitations });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to list invitations';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, role } = body as { email: string; role: WorkspaceRole };

    if (!email || !role) {
      return NextResponse.json({ success: false, error: 'Email and role are required.' }, { status: 400 });
    }

    const invitation = await invitationService.createInvitation(workspaceId, email, role, user.id);

    await auditService.recordAuditLog({
      workspaceId,
      userId: user.id,
      userEmail: user.email,
      action: 'MEMBER_INVITED',
      resourceType: 'invitation',
      resourceId: invitation.id,
      metadata: { invitedEmail: email, role },
    });

    return NextResponse.json({ success: true, invitation });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create invitation';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
