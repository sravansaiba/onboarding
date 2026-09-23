-- Migration: Add created_by column to restaurants to track creator profile_id
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for fast creator lookups and filtering
CREATE INDEX IF NOT EXISTS idx_restaurants_created_by ON public.restaurants(created_by);
