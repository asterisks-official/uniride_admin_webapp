# UniRide Admin App - Unified Schema Migration Guide

## Overview

This guide documents the migration from the simplified database schema (`/migrations/`) to the comprehensive unified schema (`/migrations_unified/`). The unified schema introduces enhanced features including ride transactions, detailed cancellation tracking, automated trust score calculations, and improved ride management capabilities.

**Migration Status**: ✅ Code migration complete - Database migration required

## What Changed

### Summary of Changes

- **3 New Tables**: `ride_transactions`, `ride_cancellations`, `admin_audit_log`
- **1 Renamed Table**: `ratings` → `ride_ratings`
- **Enhanced Tables**: `rides`, `user_stats`, `notifications`
- **Expanded Enums**: `ride_status` (7→9 values), `notification_type` (9→11 values)
- **New Features**: Transaction tracking, cancellation fees, automated trust scores

## Schema Comparison

### Table Changes

| Old Schema | New Schema | Change Type | Description |
|------------|------------|-------------|-------------|
| `ratings` | `ride_ratings` | **RENAMED** | Added `id` (UUID), `tags` array, `updated_at` |
| N/A | `ride_transactions` | **NEW** | Financial audit trail for all ride payments |
| N/A | `ride_cancellations` | **NEW** | Detailed cancellation tracking with fees |
| N/A | `admin_audit_log` | **NEW** | Comprehensive admin action logging |
| `rides` | `rides` | **ENHANCED** | Added 12 new fields (see details below) |
| `user_stats` | `user_stats` | **ENHANCED** | Split rider/passenger stats, added earnings |
| `notifications` | `notifications` | **ENHANCED** | Added 2 new notification types |
| `ride_requests` | `ride_requests` | **UNCHANGED** | No changes |
| `reports` | `reports` | **UNCHANGED** | No changes |

### Enum Changes

#### ride_status (7 → 9 values)

**Old Values**:
```
'active', 'matched', 'confirmed', 'ongoing', 'completed', 'cancelled', 'expired'
```

**New Values** (added):
```
'cancelled_by_rider', 'cancelled_by_passenger'
```

**Impact**: More granular cancellation tracking. Old `'cancelled'` status still valid for admin cancellations.

#### notification_type (9 → 11 values)

**Old Values**:
```
'ride_matched', 'ride_confirmed', 'ride_cancelled', 'ride_completed',
'request_accepted', 'request_declined', 'rating_received',
'report_resolved', 'admin_broadcast'
```

**New Values** (added):
```
'ride_started', 'payment_completed'
```

**Impact**: Better notification coverage for ride lifecycle events.

#### ride_type (NEW)

**Values**:
```
'offer', 'request'
```

**Impact**: Distinguishes between ride offers and ride requests in the rides table.

### Field Changes by Table

#### rides table

**New Fields**:
```sql
ride_type VARCHAR(10) DEFAULT 'offer'           -- 'offer' or 'request'
earnings DECIMAL(10,2) DEFAULT 0.00             -- Rider earnings
platform_fee DECIMAL(10,2) DEFAULT 0.00         -- Platform commission
total_amount DECIMAL(10,2) DEFAULT 0.00         -- Total transaction amount
payment_status VARCHAR(20) DEFAULT 'pending'    -- Payment state
payment_method VARCHAR(50)                      -- Payment method used
ride_started_at TIMESTAMPTZ                     -- When ride actually started
completion_verified_at TIMESTAMPTZ              -- When completion verified
auto_completed_at TIMESTAMPTZ                   -- If auto-completed
cancellation_fee DECIMAL(10,2) DEFAULT 0.00     -- Fee charged for cancellation
distance_km DECIMAL(10,2)                       -- Actual distance traveled
duration_minutes INTEGER                        -- Actual duration
```

**Impact**: Full financial tracking and ride lifecycle management.

#### ride_ratings table (renamed from ratings)

**New Fields**:
```sql
id UUID PRIMARY KEY                             -- New UUID primary key
tags TEXT[]                                     -- Rating tags/categories
updated_at TIMESTAMPTZ DEFAULT NOW()            -- Last update timestamp
```

**Changed Fields**:
- Primary key changed from composite to UUID `id`
- Composite unique constraint on `(ride_id, rater_uid)` maintained

**Impact**: Better rating management and categorization.

#### user_stats table

**Split Fields** (old → new):
```sql
-- Old: total_rides
total_rides_as_rider INTEGER DEFAULT 0
total_rides_as_passenger INTEGER DEFAULT 0

-- Old: completed_rides
completed_rides_as_rider INTEGER DEFAULT 0
completed_rides_as_passenger INTEGER DEFAULT 0

-- Old: average_rating
average_rating_as_rider DECIMAL(3,2) DEFAULT 0.00
average_rating_as_passenger DECIMAL(3,2) DEFAULT 0.00

-- Old: cancellations
cancelled_rides_as_rider INTEGER DEFAULT 0
cancelled_rides_as_passenger INTEGER DEFAULT 0
```

**New Fields**:
```sql
total_earnings DECIMAL(10,2) DEFAULT 0.00
total_ratings_received_as_rider INTEGER DEFAULT 0
total_ratings_received_as_passenger INTEGER DEFAULT 0
late_cancellations_count INTEGER DEFAULT 0      -- Renamed from late_cancellations
no_show_count INTEGER DEFAULT 0                 -- Renamed from no_shows
```

**Impact**: Separate tracking for rider vs passenger behavior, earnings tracking.

### New Tables

#### ride_transactions

Complete financial audit trail for all ride-related transactions.

**Key Fields**:
- `transaction_type`: 'ride_payment', 'cancellation_fee', 'refund', 'bonus'
- `status`: 'pending', 'processing', 'completed', 'failed', 'refunded'
- `amount`, `platform_fee`, `net_amount`: Full financial breakdown
- `payment_gateway_ref`: External payment system reference

**Use Cases**:
- Track all payments between riders and passengers
- Record cancellation fees
- Process refunds
- Audit financial transactions

#### ride_cancellations

Detailed tracking of ride cancellations with fee calculation.

**Key Fields**:
- `cancelled_by_role`: 'rider', 'passenger', 'admin'
- `reason_category`, `reason_text`: Structured cancellation reasons
- `hours_before_departure`: Time until ride when cancelled
- `fee_amount`, `fee_charged`: Cancellation fee tracking

**Use Cases**:
- Track cancellation patterns
- Calculate and apply cancellation fees
- Analyze cancellation reasons
- Identify problematic users

#### admin_audit_log

Comprehensive logging of all admin actions.

**Key Fields**:
- `action_type`: Type of admin action performed
- `target_type`, `target_id`: What was affected
- `changes`: JSON diff of changes made
- `ip_address`, `user_agent`: Security tracking

**Use Cases**:
- Audit trail for compliance
- Security monitoring
- Debugging admin actions
- Accountability tracking

## Migration Steps

### Prerequisites

1. **Backup your database**
   ```bash
   # Using Supabase CLI
   supabase db dump -f backup_$(date +%Y%m%d).sql
   
   # Or using pg_dump
   pg_dump -h your-host -U postgres -d your-db > backup.sql
   ```

2. **Verify current schema**
   ```sql
   -- Check which migrations are applied
   SELECT * FROM schema_migrations ORDER BY version;
   ```

3. **Test in staging environment first**
   - Never run migrations directly on production
   - Verify all 16 migrations in staging
   - Test application functionality thoroughly

### Step 1: Run Database Migrations

The unified schema consists of 16 migration files that must be run in order:

```bash
cd migrations_unified

# Review the migration order
cat INDEX.md

# Run migrations in order (001-016)
# Using Supabase CLI:
supabase db push

# Or manually using psql:
psql -h your-host -U postgres -d your-db -f 001_core_schema.sql
psql -h your-host -U postgres -d your-db -f 002_rls_policies.sql
# ... continue through 016_notifications_rollback.sql
```

**Migration Files**:
1. `001_core_schema.sql` - Core tables (rides, ride_requests, user_stats)
2. `002_rls_policies.sql` - Row Level Security policies
3. `003_ride_features.sql` - Enhanced ride features
4. `004_ride_matching.sql` - Matching algorithms
5. `005_comprehensive_management.sql` - ride_transactions, ride_cancellations
6. `006_partial_completion.sql` - Partial ride completion
7. `007_partial_indexes_triggers.sql` - Performance indexes
8. `008_earnings_ride_counts_fix.sql` - User stats fixes
9. `009_reports_table.sql` - Reports table
10. `010_reports_firebase_fix.sql` - Firebase UID compatibility
11. `011_trust_score_system.sql` - Automated trust scores
12. `012_notifications_system.sql` - Notifications table
13. `013_rating_notification.sql` - Rating notifications
14. `014_admin_audit_log.sql` - Admin audit logging
15. `015_cancellation_null_fix.sql` - Cancellation field fixes
16. `016_notifications_rollback.sql` - Notification system fixes

**Estimated Time**: 2-5 minutes depending on database size

### Step 2: Verify Migration Success

Run verification queries to ensure all tables and columns exist:

```sql
-- Check for new tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ride_transactions', 'ride_cancellations', 'ride_ratings', 'admin_audit_log');

-- Verify ride_ratings table (renamed from ratings)
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'ride_ratings';

-- Check rides table for new columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'rides' 
AND column_name IN ('ride_type', 'earnings', 'platform_fee', 'total_amount');

-- Verify user_stats split fields
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'user_stats' 
AND column_name LIKE '%_as_rider' OR column_name LIKE '%_as_passenger';

-- Check trust score function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'update_user_trust_score';
```

### Step 3: Deploy Application Code

The application code has already been updated to work with the unified schema. Deploy the updated code:

```bash
# Build the application
npm run build

# Run production server
npm start

# Or deploy to your hosting platform
# (Vercel, AWS, etc.)
```

### Step 4: Verify Application Functionality

Test critical functionality:

1. **Rides Management**
   - View ride list with ride_type filter
   - View ride details with transactions
   - Cancel a ride (should create ride_cancellations record)

2. **Ratings**
   - View ratings list (from ride_ratings table)
   - Hide/unhide ratings
   - Verify tags display

3. **Trust Scores**
   - View user trust scores
   - Recalculate trust score (uses database function)
   - View trust score breakdown

4. **Reports**
   - View reports list
   - Resolve reports

5. **Audit Log**
   - Verify admin actions are logged
   - View audit log entries

### Step 5: Monitor for Issues

After deployment, monitor:

- Application logs for errors
- Database query performance
- User-reported issues
- Admin audit log for unusual activity

## Breaking Changes

### 1. Table Name Change: ratings → ride_ratings

**Impact**: All queries to `ratings` table will fail

**Code Changes Made**:
- ✅ Updated `lib/repos/ratingsRepo.ts` to use `ride_ratings`
- ✅ Updated API endpoints (`app/api/ratings/**/*.ts`)
- ✅ Updated type definitions (`lib/supabase/types.ts`)

**Migration**: Automatic - migration 011 renames the table

**Rollback**: See rollback procedures below

### 2. user_stats Field Splits

**Impact**: Queries using old field names will fail

**Old Fields** → **New Fields**:
- `total_rides` → `total_rides_as_rider` + `total_rides_as_passenger`
- `completed_rides` → `completed_rides_as_rider` + `completed_rides_as_passenger`
- `average_rating` → `average_rating_as_rider` + `average_rating_as_passenger`
- `cancellations` → `cancelled_rides_as_rider` + `cancelled_rides_as_passenger`

**Code Changes Made**:
- ✅ Updated `lib/repos/trustRepo.ts` to use split fields
- ✅ Updated trust score calculations
- ✅ Updated API responses to aggregate when needed

**Migration**: Automatic - migration 008 splits the fields

### 3. Enum Value Additions

**Impact**: Minimal - new values added, old values still valid

**Changes**:
- `ride_status`: Added `'cancelled_by_rider'`, `'cancelled_by_passenger'`
- `notification_type`: Added `'ride_started'`, `'payment_completed'`

**Code Changes Made**:
- ✅ Updated TypeScript enums in `lib/supabase/types.ts`
- ✅ Updated validation schemas in `lib/validation/schemas.ts`
- ✅ Updated UI to handle new status values

**Migration**: Automatic - migrations update enum types

### 4. ride_ratings Primary Key Change

**Impact**: Direct queries using composite key will need adjustment

**Old**: Composite primary key `(ride_id, rater_uid)`
**New**: UUID `id` as primary key, composite unique constraint maintained

**Code Changes Made**:
- ✅ Updated repository methods to use `id` field
- ✅ Maintained backward compatibility with composite lookups

**Migration**: Automatic - migration 011 handles the change

## Rollback Procedures

### Emergency Rollback (if critical issues occur)

**⚠️ WARNING**: Rollback will lose data created after migration (transactions, cancellations, audit logs)

#### Step 1: Restore Database Backup

```bash
# Stop the application first
# Then restore from backup

# Using Supabase CLI
supabase db reset

# Or using psql
psql -h your-host -U postgres -d your-db < backup.sql
```

#### Step 2: Revert Application Code

```bash
# Checkout previous version
git checkout <previous-commit-hash>

# Rebuild and deploy
npm run build
npm start
```

### Partial Rollback (keep new tables, revert specific changes)

If you want to keep new tables but revert specific changes:

```sql
-- Rename ride_ratings back to ratings (if needed)
ALTER TABLE ride_ratings RENAME TO ratings;

-- Drop new tables (if needed)
DROP TABLE IF EXISTS ride_transactions CASCADE;
DROP TABLE IF EXISTS ride_cancellations CASCADE;
DROP TABLE IF EXISTS admin_audit_log CASCADE;

-- Revert user_stats splits (complex - requires data migration)
-- Not recommended - contact database administrator
```

### Graceful Degradation

The application code includes graceful degradation for missing tables:

```typescript
// If ride_transactions table doesn't exist, returns empty array
async getRideTransactions(rideId: string): Promise<RideTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('ride_transactions')
      .select('*')
      .eq('ride_id', rideId);
    
    if (error?.code === '42P01') {
      // Table doesn't exist
      console.warn('ride_transactions table not found');
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Failed to get ride transactions:', error);
    return [];
  }
}
```

This allows the application to run even if some migrations haven't been applied.

## New Features Available

### 1. Financial Transaction Tracking

Track all financial transactions with complete audit trail:

```typescript
// Get all transactions for a ride
const transactions = await ridesRepo.getRideTransactions(rideId);

// View in admin UI
// Navigate to: Rides > [Ride Details] > Transactions tab
```

**Use Cases**:
- Financial auditing
- Dispute resolution
- Revenue tracking
- Refund processing

### 2. Detailed Cancellation Tracking

Track why and when rides are cancelled:

```typescript
// Get cancellation details
const cancellation = await ridesRepo.getRideCancellation(rideId);

// View in admin UI
// Navigate to: Rides > [Ride Details] > Cancellation Details
```

**Use Cases**:
- Identify problematic users
- Analyze cancellation patterns
- Apply cancellation fees
- Improve matching algorithms

### 3. Automated Trust Score Calculation

Trust scores are now calculated automatically by the database:

```typescript
// Recalculate trust score (calls database function)
await trustRepo.recalculateTrustScore(userUid);

// View breakdown
const breakdown = await trustRepo.getTrustBreakdown(userUid);
```

**Formula** (0-100 scale):
- **Rating Score** (40 points): Based on average ratings
- **Completion Score** (30 points): Ride completion rate
- **Reliability Score** (20 points): Cancellation and no-show penalties
- **Experience Bonus** (10 points): Total rides completed

**Use Cases**:
- Consistent scoring across platform
- Automated user reputation
- Matching algorithm input
- User behavior insights

### 4. Enhanced Ride Management

New ride fields provide better tracking:

```typescript
// Rides now include:
interface Ride {
  rideType: 'offer' | 'request';
  earnings: number;
  platformFee: number;
  totalAmount: number;
  paymentStatus: string;
  distanceKm: number | null;
  durationMinutes: number | null;
  // ... more fields
}
```

**Use Cases**:
- Filter by ride type (offers vs requests)
- Track platform revenue
- Monitor payment status
- Analyze ride metrics

### 5. Comprehensive Audit Logging

All admin actions are automatically logged:

```typescript
// Automatically logged by middleware
// View in admin UI
// Navigate to: Audit Log
```

**Logged Information**:
- Action type and timestamp
- Admin user who performed action
- Target resource affected
- Changes made (JSON diff)
- IP address and user agent

**Use Cases**:
- Compliance and accountability
- Security monitoring
- Debugging admin actions
- Historical tracking

## Performance Considerations

### Indexes Added

The unified schema includes comprehensive indexes for performance:

```sql
-- ride_transactions indexes
CREATE INDEX idx_ride_transactions_ride_id ON ride_transactions(ride_id);
CREATE INDEX idx_ride_transactions_payer ON ride_transactions(payer_uid);
CREATE INDEX idx_ride_transactions_payee ON ride_transactions(payee_uid);
CREATE INDEX idx_ride_transactions_status ON ride_transactions(status);

-- ride_cancellations indexes
CREATE INDEX idx_ride_cancellations_ride_id ON ride_cancellations(ride_id);
CREATE INDEX idx_ride_cancellations_user ON ride_cancellations(cancelled_by_uid);

-- ride_ratings indexes
CREATE INDEX idx_ride_ratings_ride_id ON ride_ratings(ride_id);
CREATE INDEX idx_ride_ratings_rater ON ride_ratings(rater_uid);
CREATE INDEX idx_ride_ratings_rated ON ride_ratings(rated_uid);

-- admin_audit_log indexes
CREATE INDEX idx_admin_audit_log_admin ON admin_audit_log(admin_uid);
CREATE INDEX idx_admin_audit_log_target ON admin_audit_log(target_type, target_id);
CREATE INDEX idx_admin_audit_log_timestamp ON admin_audit_log(created_at DESC);
```

### Query Optimization

- Use selective field fetching: `select('id, ride_id, amount')`
- Leverage indexes for filtering and sorting
- Use pagination for large result sets
- Consider caching trust scores (recalculated on-demand)

### Database Function Performance

Trust score calculation is now a database function, which is:
- ✅ Faster (no network round-trips)
- ✅ More consistent (same formula everywhere)
- ✅ Atomic (calculated in single transaction)

## Troubleshooting

### Issue: "relation 'ride_ratings' does not exist"

**Cause**: Migration 011 not applied

**Solution**:
```bash
# Run migration 011
psql -h your-host -U postgres -d your-db -f migrations_unified/011_trust_score_system.sql
```

### Issue: "column 'ride_type' does not exist"

**Cause**: Migration 003 not applied

**Solution**:
```bash
# Run migration 003
psql -h your-host -U postgres -d your-db -f migrations_unified/003_ride_features.sql
```

### Issue: "function 'update_user_trust_score' does not exist"

**Cause**: Migration 011 not applied

**Solution**:
```bash
# Run migration 011
psql -h your-host -U postgres -d your-db -f migrations_unified/011_trust_score_system.sql
```

### Issue: Application shows empty transactions/cancellations

**Cause**: Tables exist but no data yet (expected for new tables)

**Solution**: This is normal. Data will populate as:
- Rides are completed (creates transactions)
- Rides are cancelled (creates cancellations)
- Admin actions are performed (creates audit logs)

### Issue: Trust scores are 0 for all users

**Cause**: Trust scores need to be recalculated after migration

**Solution**:
```sql
-- Recalculate all trust scores
SELECT update_user_trust_score(user_uid) FROM user_stats;
```

Or use the admin UI:
- Navigate to Users > [User Details] > Trust Score > Recalculate

## Support and Resources

### Documentation

- **Quick Start**: `migrations_unified/QUICK_START.md`
- **Migration Summary**: `migrations_unified/MIGRATION_SUMMARY.md`
- **Database Diagram**: `migrations_unified/DATABASE_DIAGRAM.md`
- **Index**: `migrations_unified/INDEX.md`

### Schema Verification

Use the built-in schema validation utility:

```typescript
import { validateUnifiedSchema } from '@/lib/utils/validateSchema';

const result = await validateUnifiedSchema();
if (!result.valid) {
  console.error('Missing tables:', result.missingTables);
  console.error('Missing columns:', result.missingColumns);
}
```

### Getting Help

1. Check application logs for specific error messages
2. Review migration files in `migrations_unified/`
3. Verify database state with SQL queries above
4. Check this guide's troubleshooting section
5. Contact the development team with:
   - Error messages
   - Migration status
   - Database version
   - Application logs

## Checklist

Use this checklist to track your migration progress:

### Pre-Migration
- [ ] Backup database
- [ ] Test migrations in staging environment
- [ ] Review all 16 migration files
- [ ] Verify application code is updated
- [ ] Schedule maintenance window
- [ ] Notify users of potential downtime

### Migration
- [ ] Run migrations 001-016 in order
- [ ] Verify all tables created successfully
- [ ] Verify all columns exist
- [ ] Check for migration errors
- [ ] Run verification queries

### Post-Migration
- [ ] Deploy updated application code
- [ ] Test ride management functionality
- [ ] Test ratings functionality
- [ ] Test trust score calculations
- [ ] Test reports functionality
- [ ] Verify audit logging works
- [ ] Recalculate all trust scores
- [ ] Monitor application logs
- [ ] Monitor database performance
- [ ] Verify no errors in production

### Validation
- [ ] All admin features working
- [ ] No console errors
- [ ] Database queries performing well
- [ ] Audit log capturing actions
- [ ] Trust scores calculating correctly
- [ ] Transactions tracking properly
- [ ] Cancellations recording correctly

## Conclusion

The unified schema migration enhances the UniRide Admin App with comprehensive financial tracking, detailed cancellation management, automated trust scoring, and complete audit logging. While the migration involves significant schema changes, the application code has been updated to maintain backward compatibility and provide graceful degradation.

Follow this guide carefully, test thoroughly in staging, and maintain backups to ensure a smooth migration process.

**Questions?** Review the troubleshooting section or contact the development team.
