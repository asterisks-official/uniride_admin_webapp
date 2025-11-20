import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, UnauthorizedError, ForbiddenError } from '@/lib/security/authGuard';
import { transactionsRepo } from '@/lib/repos/transactionsRepo';
import { ridesRepo } from '@/lib/repos/ridesRepo';
import { z } from 'zod';

/**
 * GET /api/rides/[id]/transactions
 * Get all transactions for a specific ride
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    await verifyAdminRequest(request);

    const { id } = await params;

    // Verify ride exists
    const ride = await ridesRepo.getRideById(id);
    if (!ride) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Ride not found' } },
        { status: 404 }
      );
    }

    // Fetch transactions for the ride
    const transactions = await transactionsRepo.getTransactionsByRideId(id);

    return NextResponse.json({
      ok: true,
      data: transactions,
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
