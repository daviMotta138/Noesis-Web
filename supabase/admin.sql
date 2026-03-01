-- ─── Noesis Admin Setup ───────────────────────────────────────────────────────
-- Run this AFTER the main schema.sql to:
-- 1. Add admin + streak_shields columns to profiles
-- 2. Grant admin status to your account

-- Step 1: Add columns (safe to run multiple times)
alter table profiles
  add column if not exists is_admin       boolean not null default false,
  add column if not exists streak_shields integer not null default 0;

-- Step 2: Set YOUR account as admin
-- Replace 'seu@email.com' with the email you registered with:
update profiles
set is_admin = true, nous_coins = 999999
where email = 'seu@email.com';

-- Optional: verify
select id, display_name, email, is_admin, nous_coins from profiles where is_admin = true;

-- ─── Admin Policy: allow admin to update any profile ─────────────────────────
drop policy if exists "admin_full_profiles" on profiles;
create policy "admin_full_profiles" on profiles
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- ─── Admin Policy: allow admin to update any session ─────────────────────────
drop policy if exists "admin_full_sessions" on daily_sessions;
create policy "admin_full_sessions" on daily_sessions
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
