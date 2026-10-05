import { NextRequest } from 'next/server';
import { authService } from './auth-service';
import { UserProfile } from '@/types';

export const SESSION_COOKIE_NAME = 'traceimpact_session';

/**
 * Extracts and validates the authenticated user from a NextRequest.
 * Checks HTTP-only cookie first, then Authorization Bearer header.
 * Falls back to default demo user in local development if no session provided.
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<UserProfile | null> {
  const cookieToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  const token = cookieToken || bearerToken;

  if (token) {
    const user = await authService.validateSessionToken(token);
    if (user) return user;
  }

  // Development fallback for existing test suites
  const isDevOrTest = process.env.NODE_ENV !== 'production';
  if (isDevOrTest) {
    return authService.getUserById('usr_demo_01');
  }

  return null;
}
