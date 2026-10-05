-- Migration: Allow NULL user_id for talents uploaded via Smart Add CV
-- User data (users & users_meta) is strictly for candidates and companies who register manually/independently.
-- Talents parsed and uploaded by Admin via Smart Add CV do not require user accounts.

ALTER TABLE IF EXISTS public.seeker_profiles ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.talent_marketplace_posts ALTER COLUMN user_id DROP NOT NULL;
