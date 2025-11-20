import { NextRequest, NextResponse } from 'next/server';
import { authAdmin } from '@/lib/firebase/admin';

/**
 * POST /api/auth/verify
 * Verifies a Firebase ID token or session cookie and checks for admin claim
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 400 }
      );
    }

    let decodedToken;
    
    // Try to verify as session cookie first, then as ID token
    try {
      decodedToken = await authAdmin.verifySessionCookie(token, true);
    } catch {
      // If session cookie verification fails, try as ID token
      decodedToken = await authAdmin.verifyIdToken(token);
    }

    // Check for admin custom claim
    const isAdmin = decodedToken.admin === true;

    return NextResponse.json({
      uid: decodedToken.uid,
      email: decodedToken.email,
      isAdmin,
    });
  } catch (error) {
    console.error('Token verification error:', error);
    
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}

/**
 * GET /api/auth/verify
 * Verifies the current session cookie from cookies
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    // Verify the session cookie
    const decodedToken = await authAdmin.verifySessionCookie(sessionCookie, true);

    // Check for admin custom claim
    const isAdmin = decodedToken.admin === true;

    return NextResponse.json({
      uid: decodedToken.uid,
      email: decodedToken.email,
      isAdmin,
    });
  } catch (error) {
    console.error('Session verification error:', error);
    
    return NextResponse.json(
      { error: 'Invalid or expired session' },
      { status: 401 }
    );
  }
}
