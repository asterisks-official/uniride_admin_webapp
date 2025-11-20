# UniRide Admin WebApp

Administrative interface for the UniRide platform built with Next.js 14+, TypeScript, and Tailwind CSS.

## Features

### Core Features
- User management and rider verification
- Ride monitoring and management
- Request moderation
- Trust score management
- Ratings and reviews moderation
- Report triage and resolution
- Notification broadcasting
- Application configuration management
- Comprehensive audit logging
- Real-time updates

### Unified Schema Features

The unified schema (`migrations_unified/`) provides advanced features for comprehensive platform management:

#### Financial Management
- **Transaction Tracking**: Complete audit trail for all ride payments, cancellation fees, refunds, and bonuses
- **Payment Status Monitoring**: Track payment processing, completion, and failures
- **Platform Fee Calculation**: Automatic calculation and tracking of platform commissions
- **Earnings Tracking**: Monitor rider earnings and passenger spending

#### Ride Management
- **Ride Type Classification**: Distinguish between ride offers and ride requests
- **Enhanced Status Tracking**: 9 ride statuses including granular cancellation states
- **Distance & Duration Tracking**: Record actual ride metrics
- **Payment Integration**: Link rides to financial transactions

#### Cancellation Management
- **Detailed Cancellation Records**: Track who cancelled, when, and why
- **Cancellation Fee System**: Automatic fee calculation based on timing
- **Reason Categorization**: Structured cancellation reasons for analysis
- **Pattern Detection**: Identify users with high cancellation rates

#### Trust & Reputation
- **Automated Trust Scores**: Database-calculated 0-100 scores updated in real-time
- **Split Rider/Passenger Stats**: Separate metrics for rider and passenger behavior
- **Trust Score Breakdown**: View components (rating, completion, reliability, experience)
- **Trust Rankings**: Compare users and identify outliers

#### Admin & Compliance
- **Comprehensive Audit Logging**: Every admin action logged with full context
- **Change Tracking**: JSON diffs of all modifications
- **Security Monitoring**: IP address and user agent tracking
- **Accountability**: Complete history for compliance and debugging

#### Notifications
- **11 Notification Types**: Including ride_started, payment_completed, and more
- **Notification History**: Track all sent notifications
- **User Preferences**: Manage notification settings per user

📖 **Learn More**: See [`MIGRATION_GUIDE.md`](./MIGRATION_GUIDE.md) for detailed feature documentation, use cases, and implementation examples.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Authentication**: Firebase Auth
- **Databases**: 
  - Firebase Firestore (user profiles, app config)
  - Supabase PostgreSQL (operational data)
- **Push Notifications**: OneSignal

## Prerequisites

- Node.js 18+ and npm
- Firebase project with Admin SDK credentials
- Supabase project with service role key and **unified schema applied**
- OneSignal account for push notifications

### Database Schema Requirements

⚠️ **CRITICAL**: This application requires the **unified database schema** from the `migrations_unified/` folder.

The unified schema is **mandatory** and includes:

- **Financial Transaction Tracking**: Complete audit trail for payments, fees, and refunds
- **Detailed Cancellation Management**: Track cancellation reasons, timing, and fees
- **Automated Trust Score Calculations**: Database-calculated 0-100 trust scores
- **Enhanced Ride Management**: Track ride type, earnings, platform fees, and payment status
- **Split Rider/Passenger Statistics**: Separate tracking for rider and passenger activities
- **Comprehensive Audit Logging**: Complete history of all administrative actions

**You must run all 16 migrations from `migrations_unified/` before using this application.** See the [Database Setup](#database-setup) section below for detailed instructions.

📖 **Migrating from the old schema?** See [`MIGRATION_GUIDE.md`](./MIGRATION_GUIDE.md) for complete migration documentation, schema comparison, and troubleshooting.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

**⚠️ CRITICAL STEP**: Apply the unified schema migrations before running the application.

The application **will not work** without the unified schema. You must run all 16 migration files in order.

#### Option A: Using Supabase CLI (Recommended)

```bash
cd migrations_unified

# Review the quick start guide first
cat QUICK_START.md

# Apply all migrations
supabase db push
```

#### Option B: Manual Migration with psql

```bash
cd migrations_unified

# Run migrations in order (001 through 016)
psql -h your-host -U postgres -d your-db -f 001_core_schema.sql
psql -h your-host -U postgres -d your-db -f 002_rls_policies.sql
psql -h your-host -U postgres -d your-db -f 003_ride_features.sql
# ... continue through all 16 files ...
psql -h your-host -U postgres -d your-db -f 016_notifications_rollback.sql
```

#### Verify Migration Success

After running migrations, verify the schema:

```sql
-- Check for required tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ride_transactions', 'ride_cancellations', 'ride_ratings', 'admin_audit_log');

-- Should return 4 rows
```

#### Migration Resources

- **Quick Start Guide**: [`migrations_unified/QUICK_START.md`](./migrations_unified/QUICK_START.md) - Step-by-step setup instructions
- **Migration Guide**: [`MIGRATION_GUIDE.md`](./MIGRATION_GUIDE.md) - Complete migration documentation with schema comparison
- **Migration Index**: [`migrations_unified/INDEX.md`](./migrations_unified/INDEX.md) - List of all 16 migrations
- **Database Diagram**: [`migrations_unified/DATABASE_DIAGRAM.md`](./migrations_unified/DATABASE_DIAGRAM.md) - Visual schema reference

**Migrating from the old schema (`/migrations/`)?** See [`MIGRATION_GUIDE.md`](./MIGRATION_GUIDE.md) for:
- Complete schema comparison (old vs new)
- Breaking changes documentation
- Step-by-step migration instructions
- Rollback procedures
- Troubleshooting guide

### 3. Environment Setup

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` and add your:
- Firebase Admin SDK credentials
- Supabase URL and service role key
- OneSignal REST API key
- Admin session secret (generate a secure random string)

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
├── app/                    # Next.js App Router pages and layouts
│   ├── (admin)/           # Admin-protected routes
│   ├── api/               # API route handlers
│   └── login/             # Authentication pages
├── components/            # Reusable React components
│   ├── layout/           # Layout components (nav, header)
│   ├── tables/           # Table components
│   ├── forms/            # Form components
│   ├── cards/            # Card components
│   └── charts/           # Chart components
├── lib/                   # Business logic and data access
│   ├── firebase/         # Firebase Admin SDK
│   ├── supabase/         # Supabase client
│   ├── repos/            # Repository pattern for data access
│   ├── security/         # Auth guard and middleware
│   ├── validation/       # Zod schemas
│   └── errors/           # Error handling utilities
├── migrations_unified/    # Database schema migrations (REQUIRED)
│   ├── 001-016.sql       # 16 migration files
│   ├── QUICK_START.md    # Migration setup guide
│   └── INDEX.md          # Migration documentation
├── utils/                 # Utility functions
│   ├── csv.ts            # CSV export utilities
│   └── formatting.ts     # Formatting helpers
├── MIGRATION_GUIDE.md     # Unified schema migration guide
└── README.md              # This file
```

## Security

- All Firebase Admin SDK and Supabase service role credentials are server-only
- Admin claim verification on every protected endpoint
- Input validation with Zod schemas
- Comprehensive audit logging for all mutations
- Secure session management

## Development Guidelines

- Use TypeScript strict mode
- Follow the repository pattern for data access
- Validate all inputs with Zod schemas
- Log all mutations to the audit log
- Use Server Components by default, Client Components only when needed
- Implement proper error handling at all layers

## Database Schema

This application uses the **unified database schema** from `migrations_unified/`. The schema consists of 16 migration files that must be applied in order.

### Core Tables

| Table | Description | Key Features |
|-------|-------------|--------------|
| `rides` | Ride offers and requests | Financial tracking, ride type, payment status, 12+ new fields |
| `ride_requests` | Passenger ride requests | Matching and request management |
| `ride_ratings` | User ratings and reviews | UUID primary key, tags array, updated_at (renamed from `ratings`) |
| `ride_transactions` | Financial audit trail | Payments, fees, refunds, bonuses with full tracking |
| `ride_cancellations` | Cancellation tracking | Detailed reasons, timing, fee calculation |
| `user_stats` | User statistics | Split rider/passenger metrics, earnings, trust scores |
| `reports` | User-submitted reports | Report management and resolution |
| `notifications` | Push notification history | 11 notification types, delivery tracking |
| `admin_audit_log` | Admin action audit trail | Complete accountability with JSON diffs |

### Schema Enhancements

**New Tables** (3):
- `ride_transactions` - Financial audit trail
- `ride_cancellations` - Detailed cancellation tracking
- `admin_audit_log` - Admin action logging

**Renamed Tables** (1):
- `ratings` → `ride_ratings` (with enhanced fields)

**Enhanced Tables** (3):
- `rides` - Added 12 new fields (ride_type, earnings, platform_fee, etc.)
- `user_stats` - Split rider/passenger fields, added earnings tracking
- `notifications` - Added 2 new notification types

**Expanded Enums**:
- `ride_status`: 7 → 9 values (added granular cancellation states)
- `notification_type`: 9 → 11 values (added ride_started, payment_completed)
- `ride_type`: NEW enum ('offer', 'request')

### Schema Documentation

- **Quick Start**: [`migrations_unified/QUICK_START.md`](./migrations_unified/QUICK_START.md) - How to set up the database
- **Migration Guide**: [`MIGRATION_GUIDE.md`](./MIGRATION_GUIDE.md) - Complete migration documentation with schema comparison
- **Database Diagram**: [`migrations_unified/DATABASE_DIAGRAM.md`](./migrations_unified/DATABASE_DIAGRAM.md) - Visual schema reference
- **Migration Index**: [`migrations_unified/INDEX.md`](./migrations_unified/INDEX.md) - List of all 16 migrations with descriptions
- **Migration Summary**: [`migrations_unified/MIGRATION_SUMMARY.md`](./migrations_unified/MIGRATION_SUMMARY.md) - Overview of changes

### Migrating from Old Schema

If you're migrating from the simplified schema (`/migrations/`), see [`MIGRATION_GUIDE.md`](./MIGRATION_GUIDE.md) for:

- **Schema Comparison**: Side-by-side comparison of old vs new schema
- **Breaking Changes**: Detailed documentation of all breaking changes
- **Migration Steps**: Step-by-step instructions with verification queries
- **Rollback Procedures**: Emergency rollback and partial rollback options
- **New Features**: Complete guide to new features and how to use them
- **Troubleshooting**: Common issues and solutions
- **Performance**: Index documentation and query optimization tips

**Key Breaking Changes**:
1. `ratings` table renamed to `ride_ratings` (with new UUID primary key)
2. `user_stats` fields split (e.g., `total_rides` → `total_rides_as_rider` + `total_rides_as_passenger`)
3. Expanded enum values for `ride_status` and `notification_type`
4. New required tables for full functionality

**Migration Time**: ~2-5 minutes depending on database size

## License

Private - UniRide Platform
