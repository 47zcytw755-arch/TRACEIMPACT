import { NextRequest, NextResponse } from 'next/server';
import { authService, SESSION_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await authService.revokeSession(token);
  }

  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully.',
  });

  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
