import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

/**
 * Pagination schema for list endpoints
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * Date range filter schema
 */
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type DateRangeInput = z.infer<typeof dateRangeSchema>;

// ============================================================================
// User Management Schemas (Requirement 1.1)
// ============================================================================

/**
 * User filters schema
 */
export const userFiltersSchema = z.object({
  query: z.string().optional(),
  role: z.enum(['rider', 'passenger', 'both']).optional(),
  verificationStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
  trustMin: z.coerce.number().min(0).max(100).optional(),
  trustMax: z.coerce.number().min(0).max(100).optional(),
});

export type UserFiltersInput = z.infer<typeof userFiltersSchema>;

/**
 * Rider verification schema
 */
export const verifyRiderSchema = z.object({
  approved: z.boolean(),
  note: z.string().max(500).optional(),
});

export type VerifyRiderInput = z.infer<typeof verifyRiderSchema>;

/**
 * Ban user schema
 */
export const banUserSchema = z.object({
  reason: z.string().min(1).max(500),
});

export type BanUserInput = z.infer<typeof banUserSchema>;

// ============================================================================
// Ride Management Schemas (Requirement 2.1)
// ============================================================================

/**
 * Ride filters schema
 */
export const rideFiltersSchema = z.object({
  status: z
    .enum([
      'active',
      'matched',
      'confirmed',
      'ongoing',
      'completed',
      'cancelled',
      'cancelled_by_rider',
      'cancelled_by_passenger',
      'expired'
    ])
    .optional(),
  rideType: z.enum(['offer', 'request']).optional(),
  ownerUid: z.string().optional(),
  matched: z.coerce.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type RideFiltersInput = z.infer<typeof rideFiltersSchema>;

/**
 * Ride fields validation schema for new unified schema fields
 */
export const rideFieldsSchema = z.object({
  earnings: z.number().min(0).optional(),
  platformFee: z.number().min(0).optional(),
  totalAmount: z.number().min(0).optional(),
  paymentStatus: z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']).optional(),
  paymentMethod: z.string().optional(),
  cancellationFee: z.number().min(0).optional(),
  distanceKm: z.number().min(0).optional(),
  durationMinutes: z.number().int().min(0).optional(),
});

export type RideFieldsInput = z.infer<typeof rideFieldsSchema>;

/**
 * Cancel ride schema
 */
export const cancelRideSchema = z.object({
  reason: z.string().min(1).max(500),
  applyFee: z.boolean().default(false),
  feeAmount: z.number().min(0).optional(),
});

export type CancelRideInput = z.infer<typeof cancelRideSchema>;

// ============================================================================
// Request Moderation Schemas (Requirement 3.1)
// ============================================================================

/**
 * Request filters schema
 */
export const requestFiltersSchema = z.object({
  rideId: z.string().uuid().optional(),
  status: z.enum(['pending', 'accepted', 'declined', 'expired']).optional(),
});

export type RequestFiltersInput = z.infer<typeof requestFiltersSchema>;

// ============================================================================
// Trust Score Schemas (Requirement 4.1)
// ============================================================================

/**
 * Trust score filters schema
 */
export const trustFiltersSchema = z.object({
  minScore: z.coerce.number().min(0).max(100).optional(),
  maxScore: z.coerce.number().min(0).max(100).optional(),
});

export type TrustFiltersInput = z.infer<typeof trustFiltersSchema>;

/**
 * Trust outliers schema
 */
export const trustOutliersSchema = z.object({
  below: z.coerce.number().min(0).max(100).optional(),
  above: z.coerce.number().min(0).max(100).optional(),
});

export type TrustOutliersInput = z.infer<typeof trustOutliersSchema>;

// ============================================================================
// Ratings Moderation Schemas (Requirement 5.1)
// ============================================================================

/**
 * Rating filters schema (for ride_ratings table)
 */
export const ratingFiltersSchema = z.object({
  rideId: z.string().uuid().optional(),
  userUid: z.string().optional(),
  raterUid: z.string().optional(),
  ratedUid: z.string().optional(),
  raterRole: z.enum(['rider', 'passenger']).optional(),
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  maxRating: z.coerce.number().int().min(1).max(5).optional(),
});

export type RatingFiltersInput = z.infer<typeof ratingFiltersSchema>;

/**
 * Rating data schema (for ride_ratings table structure)
 */
export const ratingDataSchema = z.object({
  rideId: z.string().uuid(),
  raterUid: z.string(),
  ratedUid: z.string(),
  raterRole: z.enum(['rider', 'passenger']),
  rating: z.number().int().min(1).max(5),
  review: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
});

export type RatingDataInput = z.infer<typeof ratingDataSchema>;

// ============================================================================
// Transaction Management Schemas (Unified Schema)
// ============================================================================

/**
 * Transaction type schema
 */
export const transactionTypeSchema = z.enum([
  'ride_payment',
  'cancellation_fee',
  'refund',
  'bonus'
]);

export type TransactionType = z.infer<typeof transactionTypeSchema>;

/**
 * Transaction status schema
 */
export const transactionStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded'
]);

export type TransactionStatus = z.infer<typeof transactionStatusSchema>;

/**
 * Transaction filters schema
 */
export const transactionFiltersSchema = z.object({
  rideId: z.string().uuid().optional(),
  userUid: z.string().optional(),
  payerUid: z.string().optional(),
  payeeUid: z.string().optional(),
  transactionType: transactionTypeSchema.optional(),
  status: transactionStatusSchema.optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type TransactionFiltersInput = z.infer<typeof transactionFiltersSchema>;

// ============================================================================
// Report Management Schemas (Requirement 6.1)
// ============================================================================

/**
 * Report filters schema
 */
export const reportFiltersSchema = z.object({
  status: z.enum(['pending', 'under_review', 'resolved', 'dismissed']).optional(),
  reportedUserUid: z.string().optional(),
  category: z.enum([
    'Rider Safety Concern',
    'Inappropriate Behavior',
    'Vehicle Issues',
    'Route/Navigation Problem',
    'Payment Issue',
    'App Technical Issue',
    'Passenger No-Show',
    'Safety Concern',
    'Damage to Vehicle',
    'Other'
  ]).optional(),
  severity: z.enum([
    'Low - Minor inconvenience',
    'Medium - Moderate concern',
    'High - Serious issue',
    'Critical - Safety concern'
  ]).optional(),
  reporterRole: z.enum(['rider', 'passenger']).optional(),
});

export type ReportFiltersInput = z.infer<typeof reportFiltersSchema>;

/**
 * Resolve report schema
 */
export const resolveReportSchema = z.object({
  adminNotes: z.string().min(1).max(1000),
});

export type ResolveReportInput = z.infer<typeof resolveReportSchema>;

/**
 * Review report schema
 */
export const reviewReportSchema = z.object({
  adminNotes: z.string().min(1).max(1000),
});

export type ReviewReportInput = z.infer<typeof reviewReportSchema>;

/**
 * Dismiss report schema
 */
export const dismissReportSchema = z.object({
  reason: z.string().min(1).max(1000),
});

export type DismissReportInput = z.infer<typeof dismissReportSchema>;

// ============================================================================
// Notification Broadcasting Schemas (Requirement 7.1)
// ============================================================================

/**
 * Notification type schema (unified schema with 11 values)
 */
export const notificationTypeSchema = z.enum([
  'ride_matched',
  'ride_confirmed',
  'ride_cancelled',
  'ride_completed',
  'request_accepted',
  'request_declined',
  'rating_received',
  'report_resolved',
  'admin_broadcast',
  'ride_started',
  'payment_completed'
]);

export type NotificationType = z.infer<typeof notificationTypeSchema>;

/**
 * Notification filters schema
 */
export const notificationFiltersSchema = z.object({
  userUid: z.string().optional(),
  unreadOnly: z.coerce.boolean().optional(),
  type: notificationTypeSchema.optional(),
});

export type NotificationFiltersInput = z.infer<typeof notificationFiltersSchema>;

/**
 * Broadcast notification schema
 */
export const broadcastNotificationSchema = z.object({
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  segment: z.string().optional(),
  userUids: z.array(z.string()).optional(),
  type: notificationTypeSchema.optional(),
  actionData: z.record(z.string(), z.any()).optional(),
});

export type BroadcastNotificationInput = z.infer<typeof broadcastNotificationSchema>;

// ============================================================================
// App Configuration Schemas (Requirement 8.1)
// ============================================================================

/**
 * Update app config schema
 */
export const updateConfigSchema = z.object({
  minVersion: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be valid semver (e.g., 1.0.0)').optional(),
  flags: z.record(z.string(), z.boolean()).optional(),
  isMaintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().max(500).optional(),
  isUpdateRequired: z.boolean().optional(),
  latestBuildNumber: z.string().optional(),
  latestVersion: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be valid semver (e.g., 1.0.0)').optional(),
});

export type UpdateConfigInput = z.infer<typeof updateConfigSchema>;

// ============================================================================
// Audit Log Schemas (Requirement 9.2)
// ============================================================================

/**
 * Audit log filters schema
 */
export const auditFiltersSchema = z.object({
  adminUid: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type AuditFiltersInput = z.infer<typeof auditFiltersSchema>;

// ============================================================================
// Export Schemas
// ============================================================================

/**
 * Export format schema
 */
export const exportFormatSchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  fields: z.array(z.string()).optional(),
});

export type ExportFormatInput = z.infer<typeof exportFormatSchema>;
