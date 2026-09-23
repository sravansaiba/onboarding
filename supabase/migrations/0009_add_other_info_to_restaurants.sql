-- Migration: Add other_info column to restaurants table for storing extra legal and bank details
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS other_info JSONB DEFAULT '{}'::jsonb;
