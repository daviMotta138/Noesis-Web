-- Migration: Add avatar customization fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_config JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS avatar_seen_announcement BOOLEAN DEFAULT FALSE;
