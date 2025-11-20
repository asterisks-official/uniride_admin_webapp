# Database Backup Strategy

## Overview

This document outlines the backup strategy for migrating the UniRide Admin Web App to the unified database schema. A comprehensive backup strategy is critical to ensure data safety and enable rollback if issues occur during migration.

---

## Backup Principles

### 1. **Always Backup Before Migration**
Never run migrations on a production database without a recent backup.

### 2. **Test Migrations on Development First**
Run all migrations on a development/staging database before production.

### 3. **Verify Backup Integrity**
Always verify that backups can be restored successfully.

### 4. **Document Backup Metadata**
Record when backups were taken, by whom, and what state they represent.

---

## Backup Methods

### Method 1: Supabase Dashboard Backup (Recommended for Small Databases)

#### Steps:
1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Database** → **Backups**
4. Click **Create Backup** (if available on your plan)
5. Wait for backup to complete
6. Download backup file for local storage

#### Pros:
- ✅ Easy to use
- ✅ Integrated with Supabase
- ✅ Point-in-time recovery

#### Cons:
- ❌ May require paid plan for manual backups
- ❌ Limited to Supabase's backup retention policy

---

### Method 2: pg_dump (Recommended for All Databases)

#### Prerequisites:
- PostgreSQL client tools installed (`pg_dump`, `psql`)
- Database connection credentials from Supabase

#### Get Connection Details:
1. Go to Supabase Dashboard → **Settings** → **Database**
2. Copy connection string or individual credentials:
   - Host: `db.[project-ref].supabase.co`
   - Port: `5432`
   - Database: `postgres`
   - User: `postgres`
   - Password: [from dashboard]

#### Backup Command:

```bash
# Full database backup (all tables, functions, triggers)
pg_dump -h db.[project-ref].supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -F c \
  -f backup_$(date +%Y%m%d_%H%M%S).dump

# Alternative: Plain SQL format (human-readable)
pg_dump -h db.[project-ref].supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -F p \
  -f backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Windows PowerShell Command:

```powershell
# Full database backup
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
pg_dump -h db.[project-ref].supabase.co `
  -p 5432 `
  -U postgres `
  -d postgres `
  -F c `
  -f "backup_$timestamp.dump"
```

#### Backup Specific Tables Only:

```bash
# Backup only critical tables
pg_dump -h db.[project-ref].supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -t public.rides \
  -t public.ride_requests \
  -t public.user_stats \
  -t public.ratings \
  -t public.reports \
  -F c \
  -f backup_critical_tables_$(date +%Y%m%d_%H%M%S).dump
```

#### Pros:
- ✅ Works with any PostgreSQL database
- ✅ Full control over backup content
- ✅ Can backup specific tables
- ✅ Can be automated with scripts

#### Cons:
- ❌ Requires PostgreSQL client tools
- ❌ Manual process (unless scripted)

---

### Method 3: Table Export via Supabase SQL Editor

#### Steps:
1. Go to Supabase Dashboard → **SQL Editor**
2. Run export queries for each table:

```sql
-- Export rides table
COPY (SELECT * FROM public.rides) TO STDOUT WITH CSV HEADER;

-- Export ride_requests table
COPY (SELECT * FROM public.ride_requests) TO STDOUT WITH CSV HEADER;

-- Export user_stats table
COPY (SELECT * FROM public.user_stats) TO STDOUT WITH CSV HEADER;

-- Export ratings table (if exists)
COPY (SELECT * FROM public.ratings) TO STDOUT WITH CSV HEADER;

-- Export reports table (if exists)
COPY (SELECT * FROM public.reports) TO STDOUT WITH CSV HEADER;
```

3. Save output to CSV files
4. Store CSV files in secure location

#### Pros:
- ✅ No external tools required
- ✅ Human-readable format (CSV)
- ✅ Easy to inspect data

#### Cons:
- ❌ Doesn't backup schema (only data)
- ❌ Doesn't backup functions, triggers, indexes
- ❌ Manual process for each table
- ❌ Not suitable for large tables

---

### Method 4: Supabase CLI Backup

#### Prerequisites:
- Supabase CLI installed: `npm install -g supabase`
- Project linked: `supabase link --project-ref [your-project-ref]`

#### Backup Command:

```bash
# Dump database schema and data
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# Dump schema only
supabase db dump --schema-only -f schema_backup_$(date +%Y%m%d_%H%M%S).sql

# Dump data only
supabase db dump --data-only -f data_backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Pros:
- ✅ Integrated with Supabase workflow
- ✅ Easy to use
- ✅ Can separate schema and data

#### Cons:
- ❌ Requires Supabase CLI installation
- ❌ Requires project linking

---

## Recommended Backup Workflow

### Pre-Migration Backup Checklist

- [ ] **1. Create full database backup** using pg_dump or Supabase CLI
- [ ] **2. Export critical tables** to CSV (rides, ride_requests, user_stats, ratings, reports)
- [ ] **3. Document current schema** (run SCHEMA_VERIFICATION.md queries)
- [ ] **4. Save backup metadata** (date, time, database state, who created it)
- [ ] **5. Verify backup integrity** (test restore on development database)
- [ ] **6. Store backups securely** (multiple locations: local + cloud)
- [ ] **7. Document backup location** (where files are stored)

### Backup Metadata Template

Create a `BACKUP_LOG.md` file to track backups:

```markdown
## Backup Log

### Backup #1
- **Date:** 2025-11-21 14:30:00 UTC
- **Created By:** [Your Name]
- **Database State:** Legacy schema (migrations/ folder applied)
- **Backup Method:** pg_dump (custom format)
- **Backup File:** `backup_20251121_143000.dump`
- **File Size:** 45 MB
- **Location:** `/backups/` and Google Drive
- **Tables Included:** All tables
- **Verified:** ✅ Restore tested on dev database
- **Notes:** Pre-migration backup before unified schema migration

### Backup #2
- **Date:** [Next backup date]
- ...
```

---

## Restore Procedures

### Restore from pg_dump Backup

#### Full Database Restore:

```bash
# Restore from custom format (.dump)
pg_restore -h db.[project-ref].supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -c \
  --if-exists \
  backup_20251121_143000.dump

# Restore from plain SQL format (.sql)
psql -h db.[project-ref].supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -f backup_20251121_143000.sql
```

#### Windows PowerShell:

```powershell
# Restore from custom format
pg_restore -h db.[project-ref].supabase.co `
  -p 5432 `
  -U postgres `
  -d postgres `
  -c `
  --if-exists `
  backup_20251121_143000.dump
```

#### Restore Specific Tables Only:

```bash
# Restore only rides table
pg_restore -h db.[project-ref].supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -t rides \
  backup_20251121_143000.dump
```

### Restore from CSV Export

```sql
-- Restore rides table from CSV
COPY public.rides FROM '/path/to/rides_backup.csv' WITH CSV HEADER;

-- Restore with specific columns
COPY public.rides (id, owner_uid, from_location, to_location, depart_at, price, status) 
FROM '/path/to/rides_backup.csv' WITH CSV HEADER;
```

### Restore from Supabase CLI Backup

```bash
# Restore from SQL dump
supabase db reset
psql -h db.[project-ref].supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -f backup_20251121_143000.sql
```

---

## Rollback Strategy

### Scenario 1: Migration Fails Midway

**Symptoms:**
- SQL errors during migration
- Some tables created, others missing
- Database in inconsistent state

**Rollback Steps:**
1. **Stop immediately** - Don't run more migrations
2. **Document the error** - Save error messages
3. **Restore from backup:**
   ```bash
   pg_restore -h db.[project-ref].supabase.co \
     -p 5432 \
     -U postgres \
     -d postgres \
     -c \
     --if-exists \
     backup_pre_migration.dump
   ```
4. **Verify restore** - Run SCHEMA_VERIFICATION.md queries
5. **Investigate issue** - Review error messages
6. **Fix migration** - Correct SQL issues
7. **Retry on development** - Test fixed migration
8. **Retry on production** - After successful dev test

### Scenario 2: Migration Succeeds but App Breaks

**Symptoms:**
- Migrations completed without errors
- Admin app shows errors or incorrect data
- API endpoints failing

**Rollback Steps:**
1. **Assess severity:**
   - Critical (data loss, security issue): Immediate rollback
   - Non-critical (UI bugs, minor issues): Fix forward
2. **If rollback needed:**
   ```bash
   # Restore database
   pg_restore -h db.[project-ref].supabase.co \
     -p 5432 \
     -U postgres \
     -d postgres \
     -c \
     --if-exists \
     backup_pre_migration.dump
   ```
3. **Revert code changes** - Git revert to previous commit
4. **Verify app works** - Test all critical functionality
5. **Investigate issue** - Debug app code
6. **Fix and retry** - After fixing issues

### Scenario 3: Data Corruption Detected

**Symptoms:**
- Missing data
- Incorrect data values
- Relationships broken

**Rollback Steps:**
1. **Immediate rollback:**
   ```bash
   pg_restore -h db.[project-ref].supabase.co \
     -p 5432 \
     -U postgres \
     -d postgres \
     -c \
     --if-exists \
     backup_pre_migration.dump
   ```
2. **Verify data integrity** - Compare with backup
3. **Identify corruption cause** - Review migration SQL
4. **Fix migration** - Add data validation
5. **Test thoroughly** - Verify no data loss
6. **Retry migration** - After validation

---

## Backup Best Practices

### 1. **Multiple Backup Copies**
- Store backups in at least 2 locations
- Local storage + cloud storage (Google Drive, Dropbox, S3)
- Keep backups for at least 30 days

### 2. **Automated Backups**
- Set up daily automated backups (cron job or scheduled task)
- Example cron job (Linux/Mac):
  ```bash
  # Daily backup at 2 AM
  0 2 * * * /usr/bin/pg_dump -h db.[project-ref].supabase.co -p 5432 -U postgres -d postgres -F c -f /backups/daily_$(date +\%Y\%m\%d).dump
  ```
- Example Windows Task Scheduler:
  ```powershell
  # Create scheduled task for daily backup
  $action = New-ScheduledTaskAction -Execute 'pg_dump' -Argument '-h db.[project-ref].supabase.co -p 5432 -U postgres -d postgres -F c -f C:\backups\daily_$(Get-Date -Format "yyyyMMdd").dump'
  $trigger = New-ScheduledTaskTrigger -Daily -At 2am
  Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "Supabase Daily Backup"
  ```

### 3. **Test Restores Regularly**
- Monthly: Test restore on development database
- Verify all tables, functions, and data are restored correctly
- Document restore time (how long it takes)

### 4. **Backup Before Every Major Change**
- Before running migrations
- Before schema changes
- Before bulk data operations
- Before production deployments

### 5. **Document Everything**
- Keep BACKUP_LOG.md updated
- Document backup locations
- Document restore procedures
- Document who has access to backups

---

## Emergency Contacts

### Database Issues
- **Supabase Support:** https://supabase.com/support
- **Supabase Status:** https://status.supabase.com
- **Community Discord:** https://discord.supabase.com

### Backup Storage
- **Google Drive:** [Link to backup folder]
- **Local Storage:** [Path to backup directory]
- **Cloud Storage:** [S3 bucket or other cloud storage]

---

## Backup Storage Locations

Document where backups are stored:

```markdown
### Production Backups
- **Local:** `C:\backups\production\` or `/backups/production/`
- **Cloud:** Google Drive > UniRide > Database Backups > Production
- **Retention:** 30 days

### Development Backups
- **Local:** `C:\backups\development\` or `/backups/development/`
- **Cloud:** Google Drive > UniRide > Database Backups > Development
- **Retention:** 7 days

### Pre-Migration Backups
- **Local:** `C:\backups\pre-migration\` or `/backups/pre-migration/`
- **Cloud:** Google Drive > UniRide > Database Backups > Pre-Migration
- **Retention:** 90 days (critical backups)
```

---

## Next Steps

1. ✅ **Choose backup method** - Select appropriate method for your setup
2. ✅ **Create pre-migration backup** - Before running any migrations
3. ✅ **Verify backup integrity** - Test restore on development database
4. ✅ **Document backup metadata** - Update BACKUP_LOG.md
5. ⏭️ **Proceed with migration** - After backup is verified
6. ⏭️ **Create post-migration backup** - After successful migration

---

**Document Version:** 1.0  
**Last Updated:** November 21, 2025  
**Related Documents:**
- `SCHEMA_VERIFICATION.md` - Database state verification
- `migrations_unified/README.md` - Migration overview
- `.env.example` - Database configuration
