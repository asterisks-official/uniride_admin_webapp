import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, UnauthorizedError, ForbiddenError } from '@/lib/security/authGuard';
import { usersRepo } from '@/lib/repos/usersRepo';
import { userFiltersSchema, paginationSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

/**
 * GET /api/users
 * List users with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    await verifyAdminRequest(request);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    
    // Parse and validate filters
    const filtersInput = {
      query: searchParams.get('query') || undefined,
      role: searchParams.get('role') || undefined,
      verificationStatus: searchParams.get('verificationStatus') || undefined,
      trustMin: searchParams.get('trustMin') || undefined,
      trustMax: searchParams.get('trustMax') || undefined,
    };

    const filters = userFiltersSchema.parse(filtersInput);

    // Parse and validate pagination
    const paginationInput = {
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
    };

    const pagination = paginationSchema.parse(paginationInput);

    // Fetch users
    const result = await usersRepo.listUsers(filters, pagination);

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
