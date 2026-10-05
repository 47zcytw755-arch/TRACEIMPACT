import { NextRequest, NextResponse } from 'next/server';
import { authService, SESSION_COOKIE_NAME } from '@/lib/auth';
import { workspaceService } from '@/lib/workspaces';
import { auditService } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, displayName } = body;

    const { user, token } = await authService.signup(email, password, displayName);

    // Create a personal workspace for new user
    const defaultWs = await workspaceService.createWorkspace(
      `${user.displayName}'s Workspace`,
      user.id
    );

    // Record signup audit log
    await auditService.recordAuditLog({
      workspaceId: defaultWs.id,
      userId: user.id,
      userEmail: user.email,
      action: 'AUTH_SIGNUP',
      resourceType: 'user',
      resourceId: user.id,
      metadata: { displayName: user.displayName },
    });

    const response = NextResponse.json({
      success: true,
      user,
      workspace: defaultWs,
    });

    // Set secure HTTP-only cookie
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Signup failed';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
