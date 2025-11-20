import { NextRequest, NextResponse } from 'next/server';
import { authAdmin } from '@/lib/firebase/admin';

/**
 * POST /api/auth/session
 * Creates a session cookie from a Firebase ID token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json(
        { error: 'No ID token provided' },
        { status: 400 }
      );
    }

    // Verify the ID token
    const decodedToken = await authAdmin.verifyIdToken(idToken);

    // Check for admin claim
    if (!decodedToken.admin) {
      return NextResponse.json(
        { error: 'User does not have admin privileges' },
        { status: 403 }
      );
    }

    // Create session cookie (expires in 5 days)
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days in milliseconds
    const sessionCookie = await authAdmin.createSessionCookie(idToken, {
      expiresIn,
    });

    // Set the session cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('session', sessionCookie, {
      maxAge: expiresIn / 1000, // maxAge is in seconds
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Session creation error:', error);
    
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/session
 * Clears the session cookie (logout)
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('session');
  return response;
}
