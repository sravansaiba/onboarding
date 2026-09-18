-- Migration: Drop unique constraint on pos_domain from restaurants table
-- All restaurants share the default POS domain (pos.marinate360.com)

ALTER TABLE public.restaurants DROP CONSTRAINT IF EXISTS restaurants_pos_domain_key;
