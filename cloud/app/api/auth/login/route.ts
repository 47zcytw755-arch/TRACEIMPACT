import { NextRequest, NextResponse } from 'next/server';
import { authService, SESSION_COOKIE_NAME } from '@/lib/auth';
import { workspaceService } from '@/lib/workspaces';
import { auditService } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const { user, token } = await authService.login(email, password);

    // Retrieve user's workspaces
    const userWorkspaces = await workspaceService.listWorkspacesForUser(user.id);
    const activeWorkspace = userWorkspaces[0]?.workspace || null;

    if (activeWorkspace) {
      await auditService.recordAuditLog({
        workspaceId: activeWorkspace.id,
        userId: user.id,
        userEmail: user.email,
        action: 'AUTH_LOGIN',
        resourceType: 'user',
        resourceId: user.id,
      });
    }

    const response = NextResponse.json({
      success: true,
      user,
      workspaces: userWorkspaces,
      activeWorkspace,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Login failed';
    return NextResponse.json({ success: false, error: msg }, { status: 401 });
  }
}
