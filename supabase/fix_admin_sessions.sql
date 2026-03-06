-- supabase/fix_admin_sessions.sql

-- 1. Permite que admins vejam todas as sessões
drop policy if exists "admin_select_sessions" on daily_sessions;
create policy "admin_select_sessions"
  on daily_sessions for select
  using ( exists (
    select 1 from profiles where id = auth.uid() and is_admin = true
  ) );

-- 2. Permite que admins criem sessões para qualquer usuário
drop policy if exists "admin_insert_sessions" on daily_sessions;
create policy "admin_insert_sessions"
  on daily_sessions for insert
  with check ( exists (
    select 1 from profiles where id = auth.uid() and is_admin = true
  ) );

-- 3. Permite que admins atualizem qualquer sessão
drop policy if exists "admin_update_sessions" on daily_sessions;
create policy "admin_update_sessions"
  on daily_sessions for update
  using ( exists (
    select 1 from profiles where id = auth.uid() and is_admin = true
  ) )
  with check ( exists (
    select 1 from profiles where id = auth.uid() and is_admin = true
  ) );

-- 4. Permite que admins deletem qualquer sessão
drop policy if exists "admin_delete_sessions" on daily_sessions;
create policy "admin_delete_sessions"
  on daily_sessions for delete
  using ( exists (
    select 1 from profiles where id = auth.uid() and is_admin = true
  ) );
