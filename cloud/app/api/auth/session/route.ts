import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { workspaceService } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, user: null, workspaces: [] }, { status: 401 });
    }

    const workspaces = await workspaceService.listWorkspacesForUser(user.id);

    return NextResponse.json({
      success: true,
      user,
      workspaces,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Session verification failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
