-- Migration: Create 'summaries' table for MeetMind AI executive meeting summaries
CREATE TABLE IF NOT EXISTS public.summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    executive_summary TEXT NOT NULL,
    key_discussion_points JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_meeting_summary UNIQUE (meeting_id)
);

-- Index for high-performance lookup by meeting_id
CREATE INDEX IF NOT EXISTS idx_summaries_meeting_id ON public.summaries(meeting_id);

-- Reload PostgREST schema cache so Supabase immediately recognizes the new table
NOTIFY pgrst, 'reload schema';
