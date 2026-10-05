import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { invitationService } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; invId: string }> }
) {
  try {
    const { invId } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await invitationService.revokeInvitation(invId, user.id);
    return NextResponse.json({ success: true, message: 'Invitation revoked successfully.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to revoke invitation';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
