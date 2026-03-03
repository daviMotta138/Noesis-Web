-- Migration: Friend Request System
-- Run this in your Supabase SQL editor

-- 1. Add metadata column to notifications (for friend_request context)
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS metadata text;

-- 2. Ensure friendships table supports 'pending' status
--    (The status column should already exist; this just documents the valid states)
--    If your friendships.status column has a CHECK constraint, update it:
-- ALTER TABLE friendships DROP CONSTRAINT IF EXISTS friendships_status_check;
-- ALTER TABLE friendships ADD CONSTRAINT friendships_status_check 
--     CHECK (status IN ('pending', 'accepted'));

-- 3. Add index for faster lookup of friendship status between two users
CREATE INDEX IF NOT EXISTS idx_friendships_pair 
    ON friendships (user_id, friend_id);

-- 4. Enable RLS on friendships (if not already set)
-- ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- 5. New notification types added: 'friend_request', 'friend_accepted'
--    No schema change needed — these are handled by the existing 'type' text column.
