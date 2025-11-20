import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, UnauthorizedError, ForbiddenError } from '@/lib/security/authGuard';
import { usersRepo } from '@/lib/repos/usersRepo';
import { z } from 'zod';

/**
 * GET /api/users/[uid]
 * Get a single user by UID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    // Verify admin authentication
    await verifyAdminRequest(request);

    const { uid } = await params;

    // Fetch user
    const user = await usersRepo.getUserByUid(uid);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: user,
    });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/users/[uid]
 * Delete a user (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    // Verify admin authentication
    const decodedToken = await verifyAdminRequest(request);

    const { uid } = await params;

    // Delete user
    await usersRepo.deleteUser(uid, decodedToken.uid);

    return NextResponse.json({
      ok: true,
      data: { message: 'User deleted successfully' },
    });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Error handler for API routes
 */
function handleError(error: unknown): NextResponse {
  console.error('API Error:', error);

  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: error.message } },
      { status: 401 }
    );
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { ok: false, error: { code: 'FORBIDDEN', message: error.message } },
      { status: 403 }
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.issues[0].message,
          details: error.issues,
        },
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    },
    { status: 500 }
  );
}
