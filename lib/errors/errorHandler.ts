import { z } from 'zod';
import { AppError } from './AppError';

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Handle API errors and return standardized Response
 * @param error - The error to handle
 * @returns Response with error details and appropriate status code
 */
export function handleApiError(error: unknown): Response {
  console.error('API Error:', error);

  // Handle custom AppError instances
  if (error instanceof AppError) {
    return Response.json(
      {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      } as ApiErrorResponse,
      { status: error.statusCode }
    );
  }

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    return Response.json(
      {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.issues[0]?.message || 'Validation failed',
          details: error.issues,
        },
      } as ApiErrorResponse,
      { status: 400 }
    );
  }

  // Handle generic Error instances
  if (error instanceof Error) {
    return Response.json(
      {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'An unexpected error occurred',
        },
      } as ApiErrorResponse,
      { status: 500 }
    );
  }

  // Handle unknown error types
  return Response.json(
    {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    } as ApiErrorResponse,
    { status: 500 }
  );
}

/**
 * Map error codes to HTTP status codes
 */
export const ERROR_STATUS_MAP: Record<string, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

/**
 * Get HTTP status code for error code
 * @param code - Error code
 * @returns HTTP status code
 */
export function getStatusCode(code: string): number {
  return ERROR_STATUS_MAP[code] || 500;
}
