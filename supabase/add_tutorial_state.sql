-- Add tutorial_state column to profiles table to track onboarding progress
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS tutorial_state JSONB DEFAULT '{
  "home_seen": false,
  "shop_seen": false,
  "avatar_seen": false,
  "friends_seen": false,
  "ranking_seen": false,
  "game_flow_seen": false
}'::jsonb;
