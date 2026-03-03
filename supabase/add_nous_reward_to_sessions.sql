-- Migration: Add nous_reward column to daily_sessions table
-- Run this in your Supabase SQL editor

ALTER TABLE daily_sessions
    ADD COLUMN IF NOT EXISTS nous_reward integer NOT NULL DEFAULT 15;

-- Comment: This column stores the chosen challenge reward, which varies by wait duration:
-- 3h  =  5 nous
-- 6h  = 10 nous
-- 12h = 20 nous
-- 24h = 35 nous (default)
-- 1 week = 100 nous (once per month super challenge)
