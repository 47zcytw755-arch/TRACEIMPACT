import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { workspaceService } from '@/lib/workspaces';
import { auditService } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const workspaces = await workspaceService.listWorkspacesForUser(user.id);
    return NextResponse.json({ success: true, workspaces });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve workspaces';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Workspace name is required.' }, { status: 400 });
    }

    const ws = await workspaceService.createWorkspace(name.trim(), user.id);

    await auditService.recordAuditLog({
      workspaceId: ws.id,
      userId: user.id,
      userEmail: user.email,
      action: 'WORKSPACE_CREATED',
      resourceType: 'workspace',
      resourceId: ws.id,
      metadata: { name: ws.name },
    });

    return NextResponse.json({ success: true, workspace: ws });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create workspace';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
