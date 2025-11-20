import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, UnauthorizedError, ForbiddenError } from '@/lib/security/authGuard';
import { configRepo } from '@/lib/repos/configRepo';
import { updateConfigSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

/**
 * GET /api/config
 * Get the current application configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    await verifyAdminRequest(request);

    // Fetch current config
    const config = await configRepo.getConfig();

    return NextResponse.json({
      ok: true,
      data: config,
    });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PATCH /api/config
 * Update application configuration
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin authentication
    const decodedToken = await verifyAdminRequest(request);

    // Parse and validate request body
    const body = await request.json();
    const updates = updateConfigSchema.parse(body);

    // Update config
    const updatedConfig = await configRepo.updateConfig(updates as any, decodedToken.uid);

    return NextResponse.json({
      ok: true,
      data: updatedConfig,
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
