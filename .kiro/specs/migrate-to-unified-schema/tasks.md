# Implementation Plan

- [x] 1. Database schema verification and preparation





  - Verify migrations_unified folder contains all 16 migration files
  - Document current database state (which migrations are already applied)
  - Create backup strategy documentation
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 2. Update TypeScript type definitions for unified schema






- [x] 2.1 Update enum types in lib/supabase/types.ts

  - Expand RideStatus enum to include 9 values (add 'cancelled_by_rider', 'cancelled_by_passenger', 'expired')
  - Expand NotificationType enum to include 11 values (add 'ride_started', 'payment_completed')
  - Add new RideType enum with 'offer' and 'request' values
  - _Requirements: 1.5_


- [x] 2.2 Add new table type definitions

  - Add ride_transactions table type with Row, Insert, Update interfaces
  - Add ride_cancellations table type with Row, Insert, Update interfaces
  - Include all columns from migrations_unified/005_comprehensive_management.sql
  - _Requirements: 1.2, 1.3_


- [x] 2.3 Update existing table type definitions

  - Rename ratings table type to ride_ratings with new id field and tags field
  - Add new fields to rides table type (ride_type, earnings, platform_fee, total_amount, payment_status, etc.)
  - Update user_stats table type with split fields (total_rides_as_rider, total_rides_as_passenger, etc.)
  - _Requirements: 1.1, 1.4_

- [x] 3. Update RidesRepository for unified schema





- [x] 3.1 Update existing methods to handle new fields


  - Update mapRowToRide to include ride_type, earnings, platform_fee, and other new fields
  - Update listRides to support ride_type filter
  - Update cancelRide to create ride_cancellations record
  - _Requirements: 2.1, 2.4, 2.5, 3.3_

- [x] 3.2 Add new methods for transactions and cancellations


  - Implement getRideTransactions method to fetch ride_transactions by ride_id
  - Implement getRideCancellation method to fetch ride_cancellations by ride_id
  - Add error handling for missing tables (graceful degradation)
  - _Requirements: 3.1, 3.2, 8.1, 8.2_


- [x] 3.3 Update Ride interface and types

  - Add new fields to Ride interface (rideType, earnings, platformFee, etc.)
  - Create RideTransaction interface
  - Create RideCancellation interface
  - _Requirements: 2.1, 2.4, 8.1, 8.2_

- [x] 4. Update RatingsRepository for ride_ratings table






- [x] 4.1 Change table name from ratings to ride_ratings

  - Update all supabase.from('ratings') calls to supabase.from('ride_ratings')
  - Update listRatings method
  - Update getRatingById method
  - Update hideRating method
  - Update deleteRating method
  - _Requirements: 2.2, 2.3_


- [x] 4.2 Update Rating interface for new fields


  - Add id field (UUID primary key)
  - Add tags field (string array)
  - Add updatedAt field
  - Update mapRowToRating to handle new fields
  - _Requirements: 2.2, 2.4_

- [x] 5. Create TransactionsRepository






- [x] 5.1 Implement core transaction methods

  - Create lib/repos/transactionsRepo.ts file
  - Implement listTransactions with filters and pagination
  - Implement getTransactionById method
  - Implement getTransactionsByRideId method
  - Implement getTransactionsByUserId method (payer and payee)
  - _Requirements: 8.3_

- [x] 5.2 Add transaction interfaces and types

  - Create RideTransaction interface
  - Create TransactionFilters interface
  - Create transaction mapping functions
  - _Requirements: 8.3_

- [x] 6. Update TrustRepository for unified schema






- [x] 6.1 Update trust score calculation to use database function

  - Modify calculateTrustScore to call update_user_trust_score database function
  - Update recalculateTrustScore to use database function
  - Remove client-side trust score calculation logic
  - _Requirements: 4.1, 4.2_


- [x] 6.2 Update getTrustBreakdown for split fields

  - Update to query user_stats with new split fields (total_rides_as_rider, etc.)
  - Calculate breakdown components using same formula as database function
  - Update TrustScoreBreakdown interface if needed
  - _Requirements: 4.3, 4.4_

- [x] 6.3 Update trust score queries for user_stats changes


  - Update getTrustRanking to handle new user_stats structure
  - Update getTrustOutliers to use new fields
  - Ensure user_uid is used as primary key
  - _Requirements: 4.4_

- [x] 7. Update ReportsRepository for unified schema




- [x] 7.1 Verify reports table compatibility


  - Check if reports table structure matches unified schema
  - Update column mappings if needed
  - Test report queries against unified schema
  - _Requirements: 2.3, 2.4_

- [x] 8. Update validation schemas





- [x] 8.1 Update ride validation schemas


  - Add ride_type validation to rideFiltersSchema
  - Update ride_status enum validation with 9 values
  - Add validation for new ride fields (earnings, platform_fee, etc.)
  - _Requirements: 6.1, 6.2_

- [x] 8.2 Update notification validation schemas


  - Update notification_type enum validation with 11 values
  - _Requirements: 6.3_

- [x] 8.3 Add transaction validation schemas


  - Create transactionFiltersSchema
  - Add validation for transaction_type enum
  - Add validation for transaction status enum
  - _Requirements: 6.4_

- [x] 8.4 Update rating validation schemas


  - Update rating validation to match ride_ratings table structure
  - Add validation for tags field
  - _Requirements: 6.5_

- [x] 9. Update API endpoints for unified schema








- [x] 9.1 Update rides API endpoints


  - Update app/api/rides/route.ts to include ride_type in responses
  - Update app/api/rides/[id]/route.ts to optionally include transactions and cancellations
  - Update app/api/rides/[id]/cancel/route.ts to create ride_cancellations record
  - Test all ride endpoints with new schema
  - _Requirements: 5.1, 5.4_

- [x] 9.2 Update ratings API endpoints


  - Update app/api/ratings/route.ts to query ride_ratings table
  - Update app/api/ratings/[ratingId]/hide/route.ts for ride_ratings
  - Update app/api/ratings/[ratingId]/route.ts for ride_ratings
  - Update response format to include new fields (id, tags, updatedAt)
  - _Requirements: 5.2_

- [x] 9.3 Create transactions API endpoints


  - Create app/api/transactions/route.ts for listing transactions
  - Create app/api/transactions/[id]/route.ts for single transaction
  - Create app/api/rides/[id]/transactions/route.ts for ride-specific transactions
  - Implement auth guard and validation
  - _Requirements: 5.4, 8.3_

- [x] 9.4 Update trust score API endpoints


  - Update app/api/trust/ranking/route.ts for new user_stats structure
  - Update app/api/users/[uid]/trust/breakdown/route.ts for split fields
  - Update app/api/users/[uid]/trust/recalculate/route.ts to use database function
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 9.5 Update reports API endpoints


  - Verify app/api/reports/route.ts works with unified schema
  - Update response format if needed for new report fields
  - _Requirements: 5.3, 5.5_

- [x] 10. Update UI components for new schema features





- [x] 10.1 Update ride detail page


  - Add ride_type display to app/(admin)/rides/[id]/page.tsx
  - Add transactions section showing ride_transactions
  - Add cancellation details section showing ride_cancellations
  - Add earnings and payment status display
  - _Requirements: 3.1, 3.2, 8.1, 8.2_

- [x] 10.2 Update rides list page


  - Add ride_type filter to app/(admin)/rides/page.tsx
  - Add ride_type column to rides table
  - Update status badge to handle new status values
  - _Requirements: 3.5_

- [x] 10.3 Update trust score components


  - Update TrustScoreBreakdown component for split fields
  - Update trust rankings page for new user_stats structure
  - _Requirements: 4.3_

- [x] 10.4 Update ratings display


  - Update ratings components to show tags field
  - Update ratings list to handle ride_ratings table
  - _Requirements: 2.2_

- [x] 11. Create migration documentation






- [x] 11.1 Create MIGRATION_GUIDE.md

  - Document all schema changes (table renames, new tables, new fields)
  - Create comparison table of old vs new schema
  - Document breaking changes and migration steps
  - Include rollback procedures
  - _Requirements: 10.1, 10.2, 10.3, 10.4_



- [x] 11.2 Update README.md





  - Add section referencing migrations_unified folder
  - Update database setup instructions to use migrations_unified
  - Add link to MIGRATION_GUIDE.md
  - Document new features available from unified schema


  - _Requirements: 7.4, 10.5_

- [x] 11.3 Update .env.example





  - Add comment about requiring migrations_unified
  - Add note about unified schema compatibility
  - Reference migrations_unified/QUICK_START.md
  - _Requirements: 7.1_

- [x] 12. Create schema validation utility




- [x] 12.1 Implement validateUnifiedSchema function


  - Create lib/utils/validateSchema.ts
  - Implement function to check for required tables
  - Implement function to check for required columns
  - Return validation report with missing tables/columns
  - _Requirements: 7.2, 7.3_

- [x] 12.2 Add startup schema validation


  - Call validateUnifiedSchema on application startup
  - Log warnings if unified schema tables are missing
  - Provide helpful error messages with migration instructions
  - _Requirements: 7.3_

- [ ]* 13. Testing and validation
- [ ]* 13.1 Write unit tests for updated repositories
  - Test RidesRepository with new fields and methods
  - Test RatingsRepository with ride_ratings table
  - Test TransactionsRepository methods
  - Test TrustRepository with database function calls
  - Mock Supabase client responses
  - _Requirements: 9.4_

- [ ]* 13.2 Write integration tests for API endpoints
  - Test rides API with new schema
  - Test ratings API with ride_ratings table
  - Test transactions API endpoints
  - Test trust score API with unified schema
  - Test error handling for missing tables
  - _Requirements: 9.4_

- [ ]* 13.3 Write schema validation tests
  - Test validateUnifiedSchema function
  - Test detection of missing tables
  - Test detection of missing columns
  - Test graceful degradation scenarios
  - _Requirements: 7.2, 9.4_

- [ ]* 13.4 Perform end-to-end testing
  - Test complete ride lifecycle with transactions
  - Test cancellation flow with ride_cancellations
  - Test trust score calculation and display
  - Test rating submission with ride_ratings
  - Verify all UI components display new data correctly
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 14. Deployment preparation
- [ ] 14.1 Create deployment checklist
  - Document database migration steps
  - Document application deployment steps
  - Create rollback plan
  - Document verification steps
  - _Requirements: 10.1, 10.3_

- [ ] 14.2 Prepare migration scripts
  - Document how to run migrations_unified on production
  - Create verification queries to check migration success
  - Document expected downtime (if any)
  - _Requirements: 7.4, 10.1_
