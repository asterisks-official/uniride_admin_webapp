import { DecodedIdToken } from 'firebase-admin/auth';
import { authAdmin } from '@/lib/firebase/admin';

/**
 * Custom error classes for authentication and authorization
 */
export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized - Invalid or missing token') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden - Admin access required') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Extract Firebase ID token from request headers or session cookie
 * Supports both "Authorization: Bearer <token>" and session cookies
 *
 * @param request - The incoming request object
 * @returns The extracted token or session cookie, or null if not found
 */
export function extractToken(request: Request): string | null {
  // First, try to get Bearer token from Authorization header
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

  if (authHeader) {
    // Check for Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
  }

  // If no Bearer token, try to get session cookie
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const sessionCookie = cookies.find(c => c.startsWith('session='));
    if (sessionCookie) {
      return sessionCookie.substring('session='.length);
    }
  }

  return null;
}

/**
 * Verify Firebase ID token or session cookie and validate admin custom claim
 * Throws UnauthorizedError if token is invalid or missing
 * Throws ForbiddenError if user does not have admin claim
 *
 * @param tokenOrCookie - The Firebase ID token or session cookie to verify
 * @returns The decoded token with verified admin claim
 */
export async function assertAdmin(tokenOrCookie: string): Promise<DecodedIdToken> {
  try {
    let decodedToken: DecodedIdToken;

    // Try to verify as session cookie first
    try {
      decodedToken = await authAdmin.verifySessionCookie(tokenOrCookie, true);
    } catch (sessionError) {
      // If session cookie verification fails, try as ID token
      decodedToken = await authAdmin.verifyIdToken(tokenOrCookie);
    }

    // Check for admin custom claim
    if (!decodedToken.admin) {
      throw new ForbiddenError('User does not have admin privileges');
    }

    return decodedToken;
  } catch (error) {
    // Handle Firebase auth errors
    if (error instanceof ForbiddenError) {
      throw error;
    }

    // Token verification failed (expired, invalid, etc.)
    throw new UnauthorizedError(
      error instanceof Error ? error.message : 'Token verification failed'
    );
  }
}

/**
 * Convenience function to extract token/cookie from request and verify admin access
 * Combines extractToken and assertAdmin in a single call
 *
 * @param request - The incoming request object
 * @returns The decoded token with verified admin claim
 */
export async function verifyAdminRequest(request: Request): Promise<DecodedIdToken> {
  const tokenOrCookie = extractToken(request);

  if (!tokenOrCookie) {
    throw new UnauthorizedError('No authentication token or session provided');
  }

  return assertAdmin(tokenOrCookie);
}
