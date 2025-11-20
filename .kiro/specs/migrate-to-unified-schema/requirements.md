# Requirements Document

## Introduction

The UniRide Admin Web App currently uses a simplified database schema defined in the `/migrations/` folder. However, a comprehensive unified schema exists in `/migrations_unified/` that includes additional features like ride transactions, ride cancellations, trust score calculations, and enhanced ride management capabilities. This migration will update the admin application to work with the unified schema while maintaining all existing functionality.

## Glossary

- **Admin Web App**: The Next.js administrative dashboard for managing UniRide operations
- **Unified Schema**: The comprehensive database schema in `migrations_unified/` folder (16 migration files)
- **Legacy Schema**: The simplified schema currently in use from `migrations/` folder
- **Supabase**: PostgreSQL database service used for data storage
- **Repository Layer**: TypeScript classes that interface with the database (in `lib/repos/`)
- **Type Definitions**: TypeScript interfaces defining database schema (in `lib/supabase/types.ts`)
- **ride_ratings Table**: Unified schema table for ratings (replaces `ratings`)
- **ride_transactions Table**: New table for financial audit trail
- **ride_cancellations Table**: New table for tracking cancellation details
- **Trust Score System**: Automated 0-100 scoring system based on user behavior

## Requirements

### Requirement 1

**User Story:** As a developer, I want to update the database type definitions to match the unified schema, so that TypeScript correctly validates database operations

#### Acceptance Criteria

1. WHEN the unified schema is analyzed, THE Admin Web App SHALL update `lib/supabase/types.ts` to include all tables from migrations_unified
2. WHEN type definitions are updated, THE Admin Web App SHALL include ride_transactions table types with all columns
3. WHEN type definitions are updated, THE Admin Web App SHALL include ride_cancellations table types with all columns
4. WHEN type definitions are updated, THE Admin Web App SHALL rename ratings table types to ride_ratings to match unified schema
5. WHEN type definitions are updated, THE Admin Web App SHALL include all enum types from unified schema (ride_status with 9 values, request_status, ride_type, notification_type with 11 values)

### Requirement 2

**User Story:** As a developer, I want to update repository classes to use the correct table names and columns from the unified schema, so that database queries work correctly

#### Acceptance Criteria

1. WHEN ridesRepo queries the database, THE Admin Web App SHALL use column names matching the unified schema
2. WHEN ratingsRepo queries the database, THE Admin Web App SHALL query the ride_ratings table instead of ratings table
3. WHEN reportsRepo queries the database, THE Admin Web App SHALL use column names matching the unified schema reports table
4. WHEN any repository maps database rows, THE Admin Web App SHALL handle all columns present in the unified schema
5. WHEN repositories reference ride status values, THE Admin Web App SHALL use the expanded ride_status enum values from unified schema

### Requirement 3

**User Story:** As a developer, I want to add support for new unified schema features in the rides repository, so that admins can access transaction and cancellation data

#### Acceptance Criteria

1. WHEN getRideById is called, THE Admin Web App SHALL optionally fetch related ride_transactions records
2. WHEN getRideById is called, THE Admin Web App SHALL optionally fetch related ride_cancellations records
3. WHEN cancelRide is called, THE Admin Web App SHALL create a record in ride_cancellations table with cancellation details
4. WHEN a ride is queried, THE Admin Web App SHALL handle the ride_type field (offer or request)
5. WHEN listing rides, THE Admin Web App SHALL support filtering by ride_type

### Requirement 4

**User Story:** As a developer, I want to update the trust score repository to use the unified schema's trust score calculation function, so that trust scores are calculated consistently

#### Acceptance Criteria

1. WHEN calculateTrustScore is called, THE Admin Web App SHALL use the calculate_trust_score database function from migration 011
2. WHEN recalculateTrustScore is called, THE Admin Web App SHALL invoke the update_user_trust_score trigger function
3. WHEN getTrustBreakdown is called, THE Admin Web App SHALL calculate components using the same formula as the database function
4. WHEN trust scores are displayed, THE Admin Web App SHALL show values between 0-100 as defined in unified schema
5. WHEN user_stats are queried, THE Admin Web App SHALL use the user_uid column as the primary key

### Requirement 5

**User Story:** As a developer, I want to update API endpoints to handle the new schema structure, so that the frontend receives correctly formatted data

#### Acceptance Criteria

1. WHEN rides API returns data, THE Admin Web App SHALL include ride_type field in the response
2. WHEN ratings API returns data, THE Admin Web App SHALL query ride_ratings table and return correctly formatted responses
3. WHEN reports API returns data, THE Admin Web App SHALL include all fields from the unified reports table
4. WHEN ride detail API is called, THE Admin Web App SHALL optionally include transactions and cancellations in the response
5. WHEN any API endpoint returns enum values, THE Admin Web App SHALL use values from the unified schema enums

### Requirement 6

**User Story:** As a developer, I want to update validation schemas to match the unified schema constraints, so that invalid data is rejected before database operations

#### Acceptance Criteria

1. WHEN ride data is validated, THE Admin Web App SHALL accept ride_type values of 'offer' or 'request'
2. WHEN ride status is validated, THE Admin Web App SHALL accept all 9 status values from unified schema
3. WHEN notification type is validated, THE Admin Web App SHALL accept all 11 notification types from unified schema
4. WHEN report data is validated, THE Admin Web App SHALL validate against unified schema report fields
5. WHEN rating data is validated, THE Admin Web App SHALL validate fields matching ride_ratings table structure

### Requirement 7

**User Story:** As a developer, I want to update the environment configuration to ensure compatibility with the unified schema, so that the application connects correctly

#### Acceptance Criteria

1. WHEN .env.example is reviewed, THE Admin Web App SHALL document that migrations_unified must be run on the database
2. WHEN database connection is established, THE Admin Web App SHALL verify connection to a database with unified schema tables
3. WHEN the application starts, THE Admin Web App SHALL log a warning if expected unified schema tables are missing
4. WHEN README is updated, THE Admin Web App SHALL include instructions for running migrations_unified
5. WHEN setup documentation is created, THE Admin Web App SHALL reference migrations_unified/QUICK_START.md

### Requirement 8

**User Story:** As a developer, I want to add new repository methods for unified schema features, so that admins can access enhanced data

#### Acceptance Criteria

1. WHEN ridesRepo is extended, THE Admin Web App SHALL add getRideTransactions method to fetch transaction history
2. WHEN ridesRepo is extended, THE Admin Web App SHALL add getRideCancellations method to fetch cancellation records
3. WHEN a new TransactionsRepository is created, THE Admin Web App SHALL implement methods to query ride_transactions table
4. WHEN user stats are queried, THE Admin Web App SHALL include earnings data from user_stats table
5. WHEN ride completion is tracked, THE Admin Web App SHALL handle partially_completed status from unified schema

### Requirement 9

**User Story:** As a developer, I want to ensure backward compatibility during migration, so that existing functionality continues to work

#### Acceptance Criteria

1. WHEN repositories are updated, THE Admin Web App SHALL maintain existing method signatures where possible
2. WHEN new fields are added, THE Admin Web App SHALL make them optional in interfaces to avoid breaking changes
3. WHEN table names change, THE Admin Web App SHALL update all references consistently across the codebase
4. WHEN the migration is complete, THE Admin Web App SHALL pass all existing tests without modification
5. WHEN APIs are updated, THE Admin Web App SHALL maintain response format compatibility for existing clients

### Requirement 10

**User Story:** As a developer, I want comprehensive documentation of the schema migration, so that team members understand the changes

#### Acceptance Criteria

1. WHEN migration is complete, THE Admin Web App SHALL include a MIGRATION_GUIDE.md documenting all schema changes
2. WHEN documentation is created, THE Admin Web App SHALL list all renamed tables and columns
3. WHEN documentation is created, THE Admin Web App SHALL document new features available from unified schema
4. WHEN documentation is created, THE Admin Web App SHALL include a comparison table of old vs new schema
5. WHEN README is updated, THE Admin Web App SHALL reference migrations_unified folder as the source of truth
