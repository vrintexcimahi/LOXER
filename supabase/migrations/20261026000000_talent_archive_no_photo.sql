-- ==============================================================================
-- LOXER Migration: Add archive columns to talent_marketplace_posts
-- Enables auto-archiving of candidates without real profile photos
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'talent_marketplace_posts' AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE public.talent_marketplace_posts ADD COLUMN is_archived SMALLINT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'talent_marketplace_posts' AND column_name = 'archive_reason'
  ) THEN
    ALTER TABLE public.talent_marketplace_posts ADD COLUMN archive_reason TEXT DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'talent_marketplace_posts' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE public.talent_marketplace_posts ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_talent_posts_archived ON public.talent_marketplace_posts(is_archived);
