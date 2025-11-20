# UniRide Unified Database Migrations

## 🎯 Purpose
This folder contains the **complete, unified SQL migrations** that work for both:
- ✅ **Main UniRide App** (User-facing ride-sharing app)
- ✅ **Admin Dashboard** (Administrative management)

## 📋 Migration Order

**IMPORTANT:** Run these migrations **in exact order** on a fresh Supabase database:

### Phase 1: Core Schema (Required)
```
001_core_schema.sql          - Base tables: rides, ride_requests, enums
002_rls_policies.sql         - Row Level Security policies
003_ride_features.sql        - Add ride type, flexibility fields
004_ride_matching.sql        - Matching & acceptance tracking
```

### Phase 2: Advanced Features (Required)
```
005_comprehensive_management.sql  - Transactions, ratings, user_stats, cancellations
006_partial_completion.sql        - Partial ride completion support
007_partial_indexes_triggers.sql  - Completion triggers & indexes
008_earnings_ride_counts_fix.sql  - Critical fix for earnings tracking
```

### Phase 3: Additional Features
```
009_reports_table.sql             - User reports & safety concerns
010_reports_firebase_fix.sql      - Fix reports table for Firebase UIDs
011_trust_score_system.sql        - Automated trust score calculation
```

### Phase 4: Notifications
```
012_notifications_system.sql      - Complete notification system
013_rating_notification.sql       - Add rating_received notification
```

### Phase 5: Admin Features
```
014_admin_audit_log.sql          - Admin action audit logging
```

### Phase 6: Latest Fixes
```
015_cancellation_null_fix.sql    - Handle null values in cancellations
016_notifications_rollback.sql   - Notification system refinements
```

## 🚀 Quick Start

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Copy and paste each migration file **in order** (001 → 016)
4. Click **Run** for each migration
5. Verify no errors appear

### Option 2: Supabase CLI
```bash
# Link your project
supabase link --project-ref your-project-ref

# Apply all migrations
supabase db push
```

### Option 3: Single Script
```bash
# Combine all migrations and run (PowerShell)
Get-Content .\*.sql | Out-File -FilePath combined.sql
# Then run combined.sql in Supabase SQL Editor
```

## 📊 What You'll Get

### Tables Created:
- ✅ `rides` - Complete ride information
- ✅ `ride_requests` - Ride match requests
- ✅ `ride_transactions` - Financial audit trail
- ✅ `ride_ratings` - User ratings & reviews
- ✅ `user_stats` - Aggregated user statistics
- ✅ `ride_cancellations` - Cancellation tracking
- ✅ `reports` - Safety & incident reports
- ✅ `notifications` - In-app notifications
- ✅ `admin_audit_log` - Admin action tracking

### Features Enabled:
- 🔐 Row Level Security (RLS)
- 💰 Earnings & transaction tracking
- ⭐ Rating & review system
- 🎯 Trust score calculation (automated)
- 📊 User statistics & analytics
- 🚨 Safety reporting system
- 🔔 Notification system
- 📝 Admin audit logging

## ⚠️ Important Notes

### For Fresh Database:
- Run **ALL** migrations in order
- No conflicts, designed to work together

### For Existing Database:
- ⚠️ If you've already run migrations from `/migrations/` folder:
  - **Skip migrations 001-011** (already applied)
  - Start with **012_notifications_system.sql**
- Check which tables already exist before running

### Development vs Production:
- Development: You can disable RLS for testing (see migration 002)
- Production: **ALWAYS keep RLS enabled** for security

## 🔍 Verification

After running all migrations, verify with:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Should see:
-- admin_audit_log
-- notifications
-- reports
-- ride_cancellations
-- ride_ratings
-- ride_requests
-- ride_transactions
-- rides
-- user_stats

-- Check trust score calculation works
SELECT calculate_trust_score(4.5, 10, 25, 23, 2, 0, 0);
-- Should return integer between 0-100

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
-- All should show 't' (true)
```

## 🆘 Troubleshooting

### "relation already exists"
- Some migrations use `CREATE TABLE IF NOT EXISTS`
- Safe to run, will skip if table exists

### "type already exists"
- Enum types are checked before creation
- Safe to run, will skip if exists

### "column already exists"
- Migrations check for existing columns
- Safe to run, will skip additions

### RLS Policy Errors
- Make sure Firebase JWT is configured
- For development, you can temporarily disable RLS (see migration 002)

## 📞 Support

For issues or questions:
1. Check migration error message
2. Verify previous migrations ran successfully
3. Check Supabase logs for detailed error info

---

**Last Updated:** November 21, 2025  
**Compatible With:** Supabase PostgreSQL 15+  
**Firebase Integration:** ✅ Hybrid architecture (Firebase Auth + Supabase Database)
