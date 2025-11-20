import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, UnauthorizedError, ForbiddenError } from '@/lib/security/authGuard';
import { usersRepo } from '@/lib/repos/usersRepo';
import { verifyRiderSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

/**
 * POST /api/users/[uid]/verify-rider
 * Verify or reject a rider verification request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    // Verify admin authentication
    const decodedToken = await verifyAdminRequest(request);

    const { uid } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = verifyRiderSchema.parse(body);

    // Verify rider
    await usersRepo.verifyRider(
      uid,
      validatedData.approved,
      validatedData.note,
      decodedToken.uid
    );

    return NextResponse.json({
      ok: true,
      data: {
        message: validatedData.approved
          ? 'Rider verification approved'
          : 'Rider verification rejected',
      },
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
