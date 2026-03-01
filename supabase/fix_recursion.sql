-- ─── Fix: remover política recursiva que quebra TODOS os reads do profiles ────
-- Execute IMEDIATAMENTE no SQL Editor do Supabase.
-- O erro "infinite recursion detected in policy for relation profiles" é causado
-- pela policy admin_full_profiles que faz SELECT em profiles dentro de uma policy
-- de profiles → loop infinito.

-- 1. Dropar a policy recursiva (criada em admin.sql)
drop policy if exists "admin_full_profiles" on profiles;
drop policy if exists "admin_full_sessions" on daily_sessions;

-- 2. Verificar que as políticas corretas existem
-- (sem recursão — apenas auth.uid() direto)
drop policy if exists "profiles_select" on profiles;
drop policy if exists "profiles_insert" on profiles;
drop policy if exists "profiles_update" on profiles;

create policy "profiles_select" on profiles
  for select using (true);  -- leitura pública, sem recursão

create policy "profiles_insert" on profiles
  for insert with check (
    auth.uid() = id
    or auth.uid() is null  -- permite trigger (security definer)
  );

create policy "profiles_update" on profiles
  for update using (auth.uid() = id);

-- 3. Verificação: deve retornar seus perfis agora
select display_name, email, is_admin, nous_coins, friend_id from profiles;
