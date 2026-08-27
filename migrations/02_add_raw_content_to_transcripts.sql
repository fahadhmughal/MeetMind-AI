-- Migration: Add 'raw_content' column to 'transcripts' table for audit trail
ALTER TABLE public.transcripts 
ADD COLUMN IF NOT EXISTS raw_content TEXT;

-- Reload PostgREST schema cache so Supabase immediately recognizes the new column
NOTIFY pgrst, 'reload schema';
