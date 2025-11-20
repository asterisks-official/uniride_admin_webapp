import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, UnauthorizedError, ForbiddenError } from '@/lib/security/authGuard';
import { ratingsRepo } from '@/lib/repos/ratingsRepo';
import { z } from 'zod';

/**
 * DELETE /api/ratings/[ratingId]
 * Permanently delete a rating
 * 
 * Rating ID format: {rideId}:{raterUid}
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ratingId: string }> }
) {
  try {
    // Verify admin authentication
    const decodedToken = await verifyAdminRequest(request);

    // Parse rating ID (format: rideId:raterUid)
    const { ratingId } = await params;
    const parts = ratingId.split(':');
    
    if (parts.length !== 2) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid rating ID format. Expected format: rideId:raterUid',
          },
        },
        { status: 400 }
      );
    }

    const [rideId, raterUid] = parts;

    // Delete the rating
    await ratingsRepo.deleteRating(rideId, raterUid, decodedToken.uid);

    return NextResponse.json({
      ok: true,
      data: { message: 'Rating deleted successfully' },
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
