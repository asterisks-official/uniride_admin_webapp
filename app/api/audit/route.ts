import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, UnauthorizedError, ForbiddenError } from '@/lib/security/authGuard';
import { auditRepo } from '@/lib/repos/auditRepo';
import { auditFiltersSchema, paginationSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

/**
 * GET /api/audit
 * List audit logs with filters and pagination
 * Requirements: 9.2, 9.3
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    await verifyAdminRequest(request);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    
    // Parse and validate filters
    const filtersInput = {
      adminUid: searchParams.get('adminUid') || undefined,
      entityType: searchParams.get('entityType') || undefined,
      entityId: searchParams.get('entityId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    };

    const filters = auditFiltersSchema.parse(filtersInput);

    // Parse and validate pagination
    const paginationInput = {
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
    };

    const pagination = paginationSchema.parse(paginationInput);

    // Convert date strings to Date objects for the repository
    const repoFilters = {
      adminUid: filters.adminUid,
      entityType: filters.entityType,
      entityId: filters.entityId,
      dateFrom: filters.startDate ? new Date(filters.startDate) : undefined,
      dateTo: filters.endDate ? new Date(filters.endDate) : undefined,
    };

    // Fetch audit logs
    const result = await auditRepo.listAuditLogs(repoFilters, pagination);

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
