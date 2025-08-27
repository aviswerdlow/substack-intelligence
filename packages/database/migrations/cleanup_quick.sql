-- Quick cleanup - Run this in Supabase SQL Editor
-- This deletes all mixed data so users can start fresh

-- Delete all data in the correct order (respects foreign keys)
TRUNCATE TABLE public.company_mentions CASCADE;
TRUNCATE TABLE public.companies CASCADE;
TRUNCATE TABLE public.emails CASCADE;

-- Clear Gmail connection status so users reconnect with proper isolation
UPDATE public.user_settings SET gmail_connected = false, gmail_refresh_token = NULL, gmail_email = NULL WHERE gmail_connected = true;

-- Verify cleanup
SELECT 'Cleanup complete. All mixed data has been removed.' as status;