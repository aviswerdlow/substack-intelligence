-- CLEANUP MIXED DATA - Run this after 003_add_user_isolation.sql
-- This script safely removes all existing mixed data to start fresh with proper user isolation

-- Step 1: Disable foreign key constraints temporarily for cleanup
BEGIN;

-- Step 2: Delete all company mentions first (has foreign keys to companies and emails)
DELETE FROM public.company_mentions;
SELECT COUNT(*) as deleted_mentions FROM public.company_mentions;

-- Step 3: Delete all companies
DELETE FROM public.companies;
SELECT COUNT(*) as deleted_companies FROM public.companies;

-- Step 4: Delete all emails
DELETE FROM public.emails;
SELECT COUNT(*) as deleted_emails FROM public.emails;

-- Step 5: Also clean up any report history that might reference old data
DELETE FROM public.report_history WHERE email_id IS NOT NULL;
DELETE FROM public.reports WHERE email_id IS NOT NULL;

-- Step 6: Reset any cached pipeline status or user settings that might have stale references
-- Note: This preserves user settings but clears Gmail connection status so users need to reconnect
UPDATE public.user_settings 
SET gmail_connected = false,
    gmail_refresh_token = NULL,
    gmail_email = NULL
WHERE gmail_connected = true;

-- Step 7: Commit the transaction
COMMIT;

-- Step 8: Vacuum the tables to reclaim space
VACUUM ANALYZE public.company_mentions;
VACUUM ANALYZE public.companies;
VACUUM ANALYZE public.emails;

-- Verification: Check that all tables are empty
SELECT 
    'emails' as table_name, 
    COUNT(*) as remaining_rows 
FROM public.emails
UNION ALL
SELECT 
    'companies' as table_name, 
    COUNT(*) as remaining_rows 
FROM public.companies
UNION ALL
SELECT 
    'company_mentions' as table_name, 
    COUNT(*) as remaining_rows 
FROM public.company_mentions;

-- Expected result: All tables should show 0 remaining_rows