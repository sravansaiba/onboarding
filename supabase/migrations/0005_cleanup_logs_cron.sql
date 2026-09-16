-- =============================================================================
-- Migration: 0005_cleanup_logs_cron.sql
-- Description: Schedule automated daily cleanup of app_logs older than 7 days using pg_cron
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule any previous cleanup jobs to prevent duplicates
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-old-app-logs-7days');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-old-app-logs');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Schedule daily cleanup at 03:00 AM UTC for logs older than 7 days
SELECT cron.schedule(
  'cleanup-old-app-logs-7days',
  '0 3 * * *',
  $$DELETE FROM public.app_logs WHERE created_at < NOW() - INTERVAL '7 days'$$
);
