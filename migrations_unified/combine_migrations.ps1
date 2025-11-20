# UniRide Database Setup - PowerShell Script
# This script combines all migrations into a single file for easy execution

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "UniRide Database Migration Combiner" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$migrationsPath = $PSScriptRoot
$outputFile = Join-Path $migrationsPath "combined_migrations.sql"

# Migration files in order
$migrations = @(
    "001_core_schema.sql",
    "002_rls_policies.sql",
    "003_ride_features.sql",
    "004_ride_matching.sql",
    "005_comprehensive_management.sql",
    "006_partial_completion.sql",
    "007_partial_indexes_triggers.sql",
    "008_earnings_ride_counts_fix.sql",
    "009_reports_table.sql",
    "010_reports_firebase_fix.sql",
    "011_trust_score_system.sql",
    "012_notifications_system.sql",
    "013_rating_notification.sql",
    "014_admin_audit_log.sql",
    "015_cancellation_null_fix.sql",
    "016_notifications_rollback.sql"
)

# Check if all files exist
$allFilesExist = $true
foreach ($migration in $migrations) {
    $filePath = Join-Path $migrationsPath $migration
    if (-not (Test-Path $filePath)) {
        Write-Host "ERROR: Missing migration file: $migration" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host ""
    Write-Host "Some migration files are missing. Exiting..." -ForegroundColor Red
    exit 1
}

# Combine all migrations
Write-Host "Combining migrations into: $outputFile" -ForegroundColor Green
Write-Host ""

$combinedContent = @"
-- ============================================================================
-- UniRide Unified Database Migrations - Combined File
-- Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
-- 
-- This file contains all migrations needed for both:
-- - Main UniRide App (User-facing ride-sharing)
-- - Admin Dashboard (Administrative management)
--
-- Instructions:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Copy and paste this entire file
-- 3. Click Run
-- 4. Verify no errors appear
-- ============================================================================

"@

foreach ($migration in $migrations) {
    $filePath = Join-Path $migrationsPath $migration
    Write-Host "Adding: $migration" -ForegroundColor Yellow
    
    $combinedContent += @"

-- ============================================================================
-- FILE: $migration
-- ============================================================================

"@
    
    $content = Get-Content $filePath -Raw -Encoding UTF8
    $combinedContent += $content
    $combinedContent += "`n`n"
}

# Write combined file
$combinedContent | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "SUCCESS! Migrations combined" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Output file: $outputFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open Supabase Dashboard" -ForegroundColor White
Write-Host "2. Go to SQL Editor" -ForegroundColor White
Write-Host "3. Copy and paste the contents of combined_migrations.sql" -ForegroundColor White
Write-Host "4. Click Run" -ForegroundColor White
Write-Host ""
Write-Host "File size: $((Get-Item $outputFile).Length / 1KB) KB" -ForegroundColor Gray
Write-Host ""
