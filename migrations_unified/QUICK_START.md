# Quick Setup Guide

## 🚀 For New Database Setup

### Method 1: Run Individual Migrations (Recommended)
Go to Supabase Dashboard → SQL Editor and run each file in order:

```
001_core_schema.sql
002_rls_policies.sql
003_ride_features.sql
004_ride_matching.sql
005_comprehensive_management.sql
006_partial_completion.sql
007_partial_indexes_triggers.sql
008_earnings_ride_counts_fix.sql
009_reports_table.sql
010_reports_firebase_fix.sql
011_trust_score_system.sql
012_notifications_system.sql
013_rating_notification.sql
014_admin_audit_log.sql
015_cancellation_null_fix.sql
016_notifications_rollback.sql  (skip this - it's a placeholder)
```

### Method 2: Use Combined File
1. Run PowerShell script: `.\combine_migrations.ps1`
2. Open the generated `combined_migrations.sql`
3. Copy entire contents
4. Paste in Supabase SQL Editor
5. Click **Run**

---

## ⚠️ For Existing Database

If you've already run migrations from `/migrations/` folder:

### Check what you have:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### Already have these tables?
- ✅ `rides`, `ride_requests`, `user_stats` → Skip migrations 001-008
- ✅ `reports` → Skip migrations 009-010
- ✅ `notifications` → Skip migrations 012-013
- ❌ `admin_audit_log` → Run migration 014

### Safe to run always:
- ✅ 008_earnings_ride_counts_fix.sql (fixes critical bugs)
- ✅ 011_trust_score_system.sql (adds functions, safe to re-run)
- ✅ 015_cancellation_null_fix.sql (fixes null handling)

---

## 🔍 Verification

After running all migrations:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- Expected tables:
-- admin_audit_log
-- notifications  
-- reports
-- ride_cancellations
-- ride_ratings
-- ride_requests
-- ride_transactions
-- rides
-- user_stats

-- Test trust score calculation
SELECT calculate_trust_score(4.5, 10, 25, 23, 2, 0, 0);
-- Should return a number between 0-100

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
-- All should show 't' (true)
```

---

## 🛠️ Development Mode

To disable RLS for easier testing (DEV ONLY):

```sql
ALTER TABLE public.rides DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports DISABLE ROW LEVEL SECURITY;
```

**⚠️ NEVER disable RLS in production!**

---

## 📊 What Each Migration Does

| Migration | Purpose |
|-----------|---------|
| 001 | Core tables: rides, ride_requests |
| 002 | Row Level Security policies |
| 003 | Add ride type (offer/request) & flexibility |
| 004 | Ride matching & completion tracking |
| 005 | Transactions, ratings, user_stats, cancellations |
| 006 | Partial completion support |
| 007 | Completion triggers & indexes |
| 008 | **CRITICAL FIX** - Earnings & ride counts |
| 009 | Reports table for safety concerns |
| 010 | Fix reports for Firebase UIDs |
| 011 | Trust score calculation system |
| 012 | Notifications system |
| 013 | Rating notification type |
| 014 | Admin audit log |
| 015 | Fix cancellation null handling |
| 016 | Placeholder (skip) |

---

## 🆘 Troubleshooting

### "relation already exists"
✅ Safe to ignore - table already created

### "type already exists"  
✅ Safe to ignore - enum already exists

### "column already exists"
✅ Safe to ignore - migrations check before adding

### RLS Policy Errors
- Make sure Firebase JWT is configured
- For dev: disable RLS temporarily

### Function errors
- Run migrations in exact order
- Some functions depend on previous tables

---

## 📞 Need Help?

1. Check migration error message
2. Verify previous migrations ran successfully
3. Check Supabase logs for detailed error info
4. Ensure you're running on PostgreSQL 15+

---

**Last Updated:** November 21, 2025
**Tested With:** Supabase PostgreSQL 15+
