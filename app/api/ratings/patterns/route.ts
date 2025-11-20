import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, UnauthorizedError, ForbiddenError } from '@/lib/security/authGuard';
import { ratingsRepo } from '@/lib/repos/ratingsRepo';
import { z } from 'zod';

/**
 * GET /api/ratings/patterns
 * Get aggregated rating patterns and statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    await verifyAdminRequest(request);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const userUid = searchParams.get('userUid') || undefined;

    // Get rating patterns
    const patterns = await ratingsRepo.getRatingPatterns(userUid);

    return NextResponse.json({
      ok: true,
      data: patterns,
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
