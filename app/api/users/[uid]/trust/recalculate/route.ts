import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, UnauthorizedError, ForbiddenError } from '@/lib/security/authGuard';
import { trustRepo } from '@/lib/repos/trustRepo';
import { z } from 'zod';

/**
 * POST /api/users/[uid]/trust/recalculate
 * Recalculate trust score for a user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    // Verify admin authentication
    const decodedToken = await verifyAdminRequest(request);
    const adminUid = decodedToken.uid;

    const { uid } = await params;

    // Recalculate trust score
    const updatedScore = await trustRepo.recalculateTrustScore(uid, adminUid);

    return NextResponse.json({
      ok: true,
      data: updatedScore,
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

  // Handle not found errors
  if (error instanceof Error && error.message.includes('not found')) {
    return NextResponse.json(
      { ok: false, error: { code: 'NOT_FOUND', message: error.message } },
      { status: 404 }
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
