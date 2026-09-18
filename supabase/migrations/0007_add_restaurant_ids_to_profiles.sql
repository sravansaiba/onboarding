-- Migration: Add restaurant_ids array to profiles to support multiple branches per user without new tables
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS restaurant_ids uuid[] DEFAULT '{}'::uuid[];

-- Backfill restaurant_ids with current restaurant_id if not already populated
UPDATE public.profiles
SET restaurant_ids = ARRAY[restaurant_id]
WHERE restaurant_id IS NOT NULL 
  AND (restaurant_ids IS NULL OR cardinality(restaurant_ids) = 0);

-- Create index for fast array membership lookups (GIN index)
CREATE INDEX IF NOT EXISTS idx_profiles_restaurant_ids ON public.profiles USING GIN (restaurant_ids);
