import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, UnauthorizedError, ForbiddenError } from '@/lib/security/authGuard';
import { requestsRepo } from '@/lib/repos/requestsRepo';
import { requestFiltersSchema, paginationSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

/**
 * GET /api/requests
 * List ride requests with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    await verifyAdminRequest(request);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    
    // Parse and validate filters
    const filtersInput = {
      rideId: searchParams.get('rideId') || undefined,
      status: searchParams.get('status') || undefined,
    };

    const filters = requestFiltersSchema.parse(filtersInput);

    // Parse and validate pagination
    const paginationInput = {
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
    };

    const pagination = paginationSchema.parse(paginationInput);

    // Fetch requests
    const result = await requestsRepo.listRequests(filters, pagination);

    return NextResponse.json({
      ok: true,
      data: result,
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
