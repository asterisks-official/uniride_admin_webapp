# Design Document

## Overview

This design outlines the migration strategy for updating the UniRide Admin Web App from the simplified database schema to the comprehensive unified schema. The migration will be performed incrementally to minimize risk, with a focus on maintaining backward compatibility while adding support for new features.

The unified schema introduces several enhancements:
- **ride_ratings** table (replaces `ratings`)
- **ride_transactions** table (new - financial audit trail)
- **ride_cancellations** table (new - detailed cancellation tracking)
- **Enhanced ride_status enum** (9 values instead of 7)
- **Trust score calculation** (automated 0-100 scoring)
- **Additional ride fields** (earnings, platform_fee, ride_type, etc.)

## Architecture

### Migration Strategy

The migration will follow a **phased approach** to ensure stability:

**Phase 1: Type System Update**
- Update TypeScript type definitions to match unified schema
- Add new table types (ride_transactions, ride_cancellations)
- Update enum types with new values
- Maintain backward compatibility with optional fields

**Phase 2: Repository Layer Migration**
- Update existing repositories to use correct table/column names
- Add new repository methods for unified schema features
- Implement data mapping functions for new structures
- Maintain existing method signatures where possible

**Phase 3: API Layer Updates**
- Update API endpoints to handle new schema structure
- Add new endpoints for transactions and cancellations
- Update validation schemas to match unified constraints
- Ensure response format compatibility

**Phase 4: Documentation and Testing**
- Create migration guide documenting all changes
- Update README with unified schema references
- Add integration tests for new features
- Document breaking changes (if any)

### Dependency Management

```
┌─────────────────────────────────────────────┐
│         Unified Schema (Database)            │
│  migrations_unified/001-016.sql              │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│      Type Definitions Layer                  │
│  lib/supabase/types.ts                       │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│      Repository Layer                        │
│  lib/repos/*.ts                              │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│      API Layer                               │
│  app/api/**/*.ts                             │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│      UI Components                           │
│  app/(admin)/**/*.tsx                        │
└─────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Type Definitions (`lib/supabase/types.ts`)

#### Updated Enums

```typescript
// Expanded from 7 to 9 values
export type RideStatus =
  | 'active'
  | 'matched'
  | 'confirmed'
  | 'ongoing'
  | 'completed'
  | 'cancelled'
  | 'cancelled_by_rider'
  | 'cancelled_by_passenger'
  | 'expired';

// Expanded from 9 to 11 values
export type NotificationType =
  | 'ride_matched'
  | 'ride_confirmed'
  | 'ride_cancelled'
  | 'ride_completed'
  | 'request_accepted'
  | 'request_declined'
  | 'rating_received'
  | 'report_resolved'
  | 'admin_broadcast'
  | 'ride_started'
  | 'payment_completed';

// New enum
export type RideType = 'offer' | 'request';
```

#### New Table Types

```typescript
// New table: ride_transactions
ride_transactions: {
  Row: {
    id: string;
    ride_id: string;
    payer_uid: string;
    payee_uid: string;
    amount: number;
    platform_fee: number;
    net_amount: number;
    currency: string;
    transaction_type: 'ride_payment' | 'cancellation_fee' | 'refund' | 'bonus';
    payment_method: string | null;
    payment_gateway_ref: string | null;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
    processed_at: string | null;
    refunded_at: string | null;
    refund_reason: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: { /* ... */ };
  Update: { /* ... */ };
}

// New table: ride_cancellations
ride_cancellations: {
  Row: {
    id: string;
    ride_id: string;
    cancelled_by_uid: string;
    cancelled_by_role: 'rider' | 'passenger' | 'admin';
    reason_category: string;
    reason_text: string | null;
    hours_before_departure: number | null;
    fee_amount: number;
    fee_charged: boolean;
    created_at: string;
  };
  Insert: { /* ... */ };
  Update: { /* ... */ };
}
```

#### Updated Table Types

```typescript
// rides table - add new fields
rides: {
  Row: {
    // ... existing fields ...
    ride_type: 'offer' | 'request';
    earnings: number;
    platform_fee: number;
    total_amount: number;
    payment_status: string;
    payment_method: string | null;
    ride_started_at: string | null;
    completion_verified_at: string | null;
    auto_completed_at: string | null;
    cancellation_fee: number;
    distance_km: number | null;
    duration_minutes: number | null;
    // ... rest of fields ...
  };
}

// ratings renamed to ride_ratings
ride_ratings: {
  Row: {
    id: string; // New: UUID primary key
    ride_id: string;
    rater_uid: string;
    rated_uid: string;
    rater_role: 'rider' | 'passenger';
    rating: number;
    review: string | null;
    tags: string[] | null; // New field
    is_visible: boolean;
    created_at: string;
    updated_at: string; // New field
  };
}

// user_stats - add new fields
user_stats: {
  Row: {
    user_uid: string;
    trust_score: number;
    total_earnings: number; // New field
    total_rides_as_rider: number; // Split from total_rides
    total_rides_as_passenger: number; // Split from total_rides
    completed_rides_as_rider: number; // Split from completed_rides
    completed_rides_as_passenger: number; // Split from completed_rides
    average_rating_as_rider: number; // Split from average_rating
    average_rating_as_passenger: number; // Split from average_rating
    total_ratings_received_as_rider: number; // New field
    total_ratings_received_as_passenger: number; // New field
    cancelled_rides_as_rider: number; // Split from cancellations
    cancelled_rides_as_passenger: number; // Split from cancellations
    late_cancellations_count: number; // Renamed from late_cancellations
    no_show_count: number; // Renamed from no_shows
    created_at: string;
    updated_at: string;
  };
}
```

### 2. Repository Layer Updates

#### RidesRepository (`lib/repos/ridesRepo.ts`)

**New Methods:**

```typescript
class RidesRepository {
  // Existing methods remain unchanged
  
  /**
   * Get ride transactions for a specific ride
   * @param rideId - Ride ID
   * @returns List of transactions
   */
  async getRideTransactions(rideId: string): Promise<RideTransaction[]>
  
  /**
   * Get cancellation details for a ride
   * @param rideId - Ride ID
   * @returns Cancellation record or null
   */
  async getRideCancellation(rideId: string): Promise<RideCancellation | null>
  
  /**
   * List rides with ride_type filter
   * @param filters - Include rideType: 'offer' | 'request'
   */
  async listRides(filters: RideFilters): Promise<PaginatedResult<Ride>>
}
```

**Updated Methods:**

```typescript
// cancelRide now creates ride_cancellations record
async cancelRide(
  id: string,
  reason: string,
  adminUid: string,
  applyFee: boolean = false,
  feeAmount?: number
): Promise<void> {
  // 1. Update rides table
  // 2. Create ride_cancellations record (NEW)
  // 3. Log audit action
}

// mapRowToRide handles new fields
private mapRowToRide(row: RideRow): Ride {
  return {
    // ... existing fields ...
    rideType: row.ride_type,
    earnings: row.earnings,
    platformFee: row.platform_fee,
    totalAmount: row.total_amount,
    paymentStatus: row.payment_status,
    // ... new fields ...
  };
}
```

#### RatingsRepository (`lib/repos/ratingsRepo.ts`)

**Table Name Change:**

```typescript
// Change all queries from 'ratings' to 'ride_ratings'
const { data, error } = await supabase
  .from('ride_ratings') // Changed from 'ratings'
  .select('*')
  // ...
```

**Updated Interface:**

```typescript
export interface Rating {
  id: string; // New field
  rideId: string;
  raterUid: string;
  ratedUid: string;
  raterRole: 'rider' | 'passenger';
  rating: number;
  review: string | null;
  tags: string[] | null; // New field
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date; // New field
}
```

#### New Repository: TransactionsRepository (`lib/repos/transactionsRepo.ts`)

```typescript
export class TransactionsRepository {
  /**
   * List transactions with filters
   */
  async listTransactions(
    filters: TransactionFilters,
    pagination: Pagination
  ): Promise<PaginatedResult<RideTransaction>>
  
  /**
   * Get transaction by ID
   */
  async getTransactionById(id: string): Promise<RideTransaction | null>
  
  /**
   * Get transactions for a specific ride
   */
  async getTransactionsByRideId(rideId: string): Promise<RideTransaction[]>
  
  /**
   * Get transactions for a specific user
   */
  async getTransactionsByUserId(
    userUid: string,
    role: 'payer' | 'payee'
  ): Promise<RideTransaction[]>
}
```

#### TrustRepository Updates (`lib/repos/trustRepo.ts`)

**Use Database Function:**

```typescript
async calculateTrustScore(userUid: string): Promise<number> {
  // Call database function instead of calculating in TypeScript
  const { data, error } = await supabase
    .rpc('update_user_trust_score', { p_user_uid: userUid });
  
  if (error) throw new Error(`Failed to calculate trust score: ${error.message}`);
  return data;
}

async getTrustBreakdown(userUid: string): Promise<TrustScoreBreakdown> {
  // Fetch user_stats with new split fields
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_uid', userUid)
    .single();
  
  // Calculate components using same formula as database function
  return {
    ratingScore: calculateRatingScore(data),
    completionScore: calculateCompletionScore(data),
    reliabilityScore: calculateReliabilityScore(data),
    experienceBonus: calculateExperienceBonus(data),
    totalScore: data.trust_score,
  };
}
```

### 3. API Layer Updates

#### Rides API (`app/api/rides/[id]/route.ts`)

**Enhanced Response:**

```typescript
// GET /api/rides/[id]
{
  ride: {
    // ... existing fields ...
    rideType: 'offer',
    earnings: 150.00,
    platformFee: 15.00,
    totalAmount: 165.00,
    paymentStatus: 'completed',
  },
  transactions: [ /* optional */ ],
  cancellation: { /* optional */ },
  ratings: [ /* ... */ ],
  chat: [ /* ... */ ]
}
```

#### New Transactions API (`app/api/transactions/route.ts`)

```typescript
// GET /api/transactions
// List all transactions with filters

// GET /api/transactions/[id]
// Get single transaction

// GET /api/rides/[id]/transactions
// Get transactions for a specific ride
```

#### Ratings API Updates

```typescript
// Update all endpoints to use 'ride_ratings' table
// app/api/ratings/route.ts
// app/api/ratings/[ratingId]/hide/route.ts
// app/api/ratings/[ratingId]/route.ts
```

### 4. Validation Schema Updates (`lib/validation/schemas.ts`)

```typescript
// Add ride type validation
export const rideFiltersSchema = z.object({
  status: z.enum([
    'active', 'matched', 'confirmed', 'ongoing', 'completed',
    'cancelled', 'cancelled_by_rider', 'cancelled_by_passenger', 'expired'
  ]).optional(),
  rideType: z.enum(['offer', 'request']).optional(), // New
  ownerUid: z.string().optional(),
  matched: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Update notification type validation
export const notificationTypeSchema = z.enum([
  'ride_matched', 'ride_confirmed', 'ride_cancelled', 'ride_completed',
  'request_accepted', 'request_declined', 'rating_received',
  'report_resolved', 'admin_broadcast', 'ride_started', 'payment_completed'
]);

// Add transaction validation
export const transactionFiltersSchema = z.object({
  rideId: z.string().uuid().optional(),
  userUid: z.string().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']).optional(),
  transactionType: z.enum(['ride_payment', 'cancellation_fee', 'refund', 'bonus']).optional(),
});
```

## Data Models

### Ride Model (Enhanced)

```typescript
interface Ride {
  // Existing fields
  id: string;
  ownerUid: string;
  fromLocation: string;
  fromLat: number;
  fromLng: number;
  toLocation: string;
  toLat: number;
  toLng: number;
  departAt: Date;
  seatsTotal: number;
  seatsAvailable: number;
  price: number;
  vehicleInfo: string | null;
  notes: string | null;
  status: RideStatus;
  visible: boolean;
  
  // New fields from unified schema
  rideType: 'offer' | 'request';
  earnings: number;
  platformFee: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string | null;
  rideStartedAt: Date | null;
  completionVerifiedAt: Date | null;
  autoCompletedAt: Date | null;
  cancellationFee: number;
  distanceKm: number | null;
  durationMinutes: number | null;
  
  // Existing fields
  matchedAt: Date | null;
  riderUid: string | null;
  passengerUid: string | null;
  confirmationDeadline: Date | null;
  riderConfirmedGoing: boolean;
  passengerConfirmedGoing: boolean;
  riderConfirmedCompletion: boolean;
  passengerConfirmedCompletion: boolean;
  cancelledAt: Date | null;
  cancelledByUid: string | null;
  cancellationReason: string | null;
  completedAt: Date | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### New Models

```typescript
interface RideTransaction {
  id: string;
  rideId: string;
  payerUid: string;
  payeeUid: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  currency: string;
  transactionType: 'ride_payment' | 'cancellation_fee' | 'refund' | 'bonus';
  paymentMethod: string | null;
  paymentGatewayRef: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  processedAt: Date | null;
  refundedAt: Date | null;
  refundReason: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface RideCancellation {
  id: string;
  rideId: string;
  cancelledByUid: string;
  cancelledByRole: 'rider' | 'passenger' | 'admin';
  reasonCategory: string;
  reasonText: string | null;
  hoursBeforeDeparture: number | null;
  feeAmount: number;
  feeCharged: boolean;
  createdAt: Date;
}

interface UserStats {
  userUid: string;
  trustScore: number;
  totalEarnings: number;
  totalRidesAsRider: number;
  totalRidesAsPassenger: number;
  completedRidesAsRider: number;
  completedRidesAsPassenger: number;
  averageRatingAsRider: number;
  averageRatingAsPassenger: number;
  totalRatingsReceivedAsRider: number;
  totalRatingsReceivedAsPassenger: number;
  cancelledRidesAsRider: number;
  cancelledRidesAsPassenger: number;
  lateCancellationsCount: number;
  noShowCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## Error Handling

### Migration-Specific Errors

```typescript
class SchemaVersionError extends Error {
  constructor(message: string) {
    super(`Schema version mismatch: ${message}`);
    this.name = 'SchemaVersionError';
  }
}

class TableNotFoundError extends Error {
  constructor(tableName: string) {
    super(`Required table not found: ${tableName}. Please run migrations_unified.`);
    this.name = 'TableNotFoundError';
  }
}
```

### Graceful Degradation

```typescript
// If ride_transactions table doesn't exist, return empty array
async getRideTransactions(rideId: string): Promise<RideTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('ride_transactions')
      .select('*')
      .eq('ride_id', rideId);
    
    if (error) {
      // Check if table doesn't exist
      if (error.code === '42P01') {
        console.warn('ride_transactions table not found. Run migrations_unified.');
        return [];
      }
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Failed to get ride transactions:', error);
    return []; // Graceful degradation
  }
}
```

## Testing Strategy

### Unit Tests

1. **Type Definition Tests**
   - Verify all enum values are correctly defined
   - Test type compatibility with database responses
   - Validate optional vs required fields

2. **Repository Tests**
   - Test table name changes (ratings → ride_ratings)
   - Test new methods (getRideTransactions, getRideCancellation)
   - Test data mapping with new fields
   - Mock Supabase client responses

3. **Validation Schema Tests**
   - Test expanded enum validations
   - Test new field validations
   - Test backward compatibility

### Integration Tests

1. **Database Schema Verification**
   - Verify all expected tables exist
   - Verify column names match type definitions
   - Verify enum values match database

2. **API Endpoint Tests**
   - Test rides API with new fields
   - Test ratings API with ride_ratings table
   - Test new transactions API
   - Test error handling for missing tables

3. **End-to-End Tests**
   - Test complete ride lifecycle with transactions
   - Test cancellation flow with ride_cancellations
   - Test trust score calculation
   - Test rating submission with ride_ratings

### Migration Validation

```typescript
// lib/utils/validateSchema.ts
export async function validateUnifiedSchema(): Promise<{
  valid: boolean;
  missingTables: string[];
  missingColumns: Record<string, string[]>;
}> {
  const requiredTables = [
    'rides',
    'ride_requests',
    'ride_ratings',
    'ride_transactions',
    'ride_cancellations',
    'user_stats',
    'reports',
    'notifications',
    'admin_audit_log',
  ];
  
  const missingTables: string[] = [];
  const missingColumns: Record<string, string[]> = {};
  
  for (const table of requiredTables) {
    // Check if table exists
    const { error } = await supabase.from(table).select('*').limit(0);
    
    if (error && error.code === '42P01') {
      missingTables.push(table);
    }
  }
  
  // Check for specific columns
  // ... implementation ...
  
  return {
    valid: missingTables.length === 0,
    missingTables,
    missingColumns,
  };
}
```

## Implementation Notes

### Breaking Changes

1. **Table Name Change**: `ratings` → `ride_ratings`
   - All queries must be updated
   - API responses maintain same structure (no breaking change for clients)

2. **user_stats Fields**: Split fields (total_rides → total_rides_as_rider + total_rides_as_passenger)
   - Repository layer handles aggregation
   - API responses maintain backward compatibility

3. **Enum Values**: Expanded enums
   - New values added, existing values unchanged
   - Backward compatible

### Backward Compatibility Strategy

1. **Optional Fields**: All new fields are optional in TypeScript interfaces
2. **Graceful Degradation**: Methods return empty arrays if new tables don't exist
3. **API Response Format**: Maintain existing response structure, add new fields as optional
4. **Database Functions**: Use database functions for trust score calculation (more reliable)

### Performance Considerations

1. **Indexes**: Unified schema includes comprehensive indexes
2. **Query Optimization**: Use selective field fetching
3. **Caching**: Consider caching trust scores (recalculated on-demand)
4. **Pagination**: Maintain existing pagination for large datasets

### Security Considerations

1. **RLS Policies**: Unified schema includes Row Level Security
2. **Admin Access**: Verify admin claims before accessing sensitive data
3. **Audit Logging**: All admin actions logged in admin_audit_log
4. **Data Validation**: Validate all inputs against unified schema constraints

## Migration Checklist

- [ ] Run migrations_unified on database (001-016)
- [ ] Update lib/supabase/types.ts with unified schema types
- [ ] Update lib/repos/ridesRepo.ts for new fields and methods
- [ ] Update lib/repos/ratingsRepo.ts to use ride_ratings table
- [ ] Create lib/repos/transactionsRepo.ts
- [ ] Update lib/repos/trustRepo.ts to use database functions
- [ ] Update lib/validation/schemas.ts with new validations
- [ ] Update API endpoints to handle new schema
- [ ] Add new API endpoints for transactions
- [ ] Update UI components to display new fields
- [ ] Create MIGRATION_GUIDE.md documentation
- [ ] Update README.md with unified schema references
- [ ] Update .env.example with migration instructions
- [ ] Run integration tests
- [ ] Verify schema with validateUnifiedSchema()
