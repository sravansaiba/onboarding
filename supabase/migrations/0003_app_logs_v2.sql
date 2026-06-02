-- =============================================================================
-- Migration: Upgrade app_logs for production-grade logging
-- Adds: duration_ms, status_code, http_method, http_path, log_type
-- Updates: constraints, indexes for efficient querying
-- =============================================================================

-- 1. Add new columns
ALTER TABLE public.app_logs ADD COLUMN IF NOT EXISTS duration_ms integer;
ALTER TABLE public.app_logs ADD COLUMN IF NOT EXISTS status_code smallint;
ALTER TABLE public.app_logs ADD COLUMN IF NOT EXISTS http_method text;
ALTER TABLE public.app_logs ADD COLUMN IF NOT EXISTS http_path text;
ALTER TABLE public.app_logs ADD COLUMN IF NOT EXISTS log_type text NOT NULL DEFAULT 'audit';

-- 2. Add constraint for log_type
ALTER TABLE public.app_logs ADD CONSTRAINT app_logs_log_type_check
  CHECK (log_type IN ('audit', 'api', 'system'));

-- 3. Performance indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_app_logs_log_type_created_at
  ON public.app_logs USING btree (log_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_logs_status_code_created_at
  ON public.app_logs USING btree (status_code, created_at DESC)
  WHERE status_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_app_logs_restaurant_log_type
  ON public.app_logs USING btree (restaurant_id, log_type, created_at DESC);

-- 4. Composite index for the most common admin query:
--    filter by restaurant + log_type + level, sorted by time
CREATE INDEX IF NOT EXISTS idx_app_logs_composite_query
  ON public.app_logs USING btree (restaurant_id, log_type, level, created_at DESC);

-- 5. Auto-cleanup: delete logs older than 90 days (run via Supabase cron or pg_cron)
-- To enable, run this in SQL editor after installing pg_cron:
--
-- SELECT cron.schedule(
--   'cleanup-old-app-logs',
--   '0 3 * * *',  -- daily at 3 AM UTC
--   $$DELETE FROM public.app_logs WHERE created_at < NOW() - INTERVAL '90 days'$$
-- );
