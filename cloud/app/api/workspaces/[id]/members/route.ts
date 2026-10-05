import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { workspaceService } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = await workspaceService.getMemberRole(id, user.id);
    if (!userRole) {
      return NextResponse.json({ success: false, error: 'Workspace not found or access denied.' }, { status: 404 });
    }

    const members = await workspaceService.listWorkspaceMembers(id);
    return NextResponse.json({ success: true, members, currentUserRole: userRole });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve workspace members';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
