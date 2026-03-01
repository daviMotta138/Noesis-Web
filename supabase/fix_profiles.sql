-- ─── Noesis: Correção completa do trigger de perfil ──────────────────────────
-- Execute TODO este arquivo no SQL Editor do Supabase de uma vez.

-- ─── 1. Garantir colunas extras (is_admin, streak_shields) ───────────────────
alter table profiles
  add column if not exists is_admin       boolean not null default false,
  add column if not exists streak_shields integer not null default 0;

-- ─── 2. Corrigir a política de INSERT do profiles ─────────────────────────────
-- O problema: a policy "profiles_insert" exige auth.uid() = id,
-- mas dentro do trigger auth.uid() é NULL → o insert falha silenciosamente.
-- Solução: dropar a policy restritiva e deixar o trigger (security definer) inserir livremente.
drop policy if exists "profiles_insert" on profiles;

-- Recriamos uma versão que aceita tanto o próprio usuário quanto o trigger do sistema:
create policy "profiles_insert" on profiles
  for insert
  with check (
    auth.uid() = id          -- usuário inserindo o próprio perfil
    or auth.uid() is null    -- trigger do sistema (security definer)
  );

-- ─── 3. Recriar a função do trigger (versão robusta) ─────────────────────────
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name      text;
  v_friend_id text;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    split_part(new.email, '@', 1),
    'Usuário'
  );
  v_friend_id := v_name || '#' || upper(substring(replace(new.id::text, '-', ''), 1, 6));

  insert into public.profiles (id, display_name, email, friend_id)
  values (new.id, v_name, new.email, v_friend_id)
  on conflict (id) do nothing;  -- seguro para re-execuções

  return new;
exception when others then
  raise warning 'handle_new_user falhou para %: %', new.id, sqlerrm;
  return new;
end;
$$;

-- Garantir que o trigger existe
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── 4. Backfill: criar perfil para usuários que já existem sem perfil ────────
insert into public.profiles (id, display_name, email, friend_id)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data->>'display_name'), ''), split_part(u.email, '@', 1), 'Usuário'),
  u.email,
  coalesce(nullif(trim(u.raw_user_meta_data->>'display_name'), ''), split_part(u.email, '@', 1), 'Usuário')
    || '#' || upper(substring(replace(u.id::text, '-', ''), 1, 6))
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null   -- só quem ainda não tem perfil
on conflict (id) do nothing;

-- ─── 5. Definir admin (substitua pelo seu e-mail) ─────────────────────────────
update profiles
set is_admin = true, nous_coins = 999999
where id = (select id from auth.users where email = 'seu@email.com');
--                                                  ↑ coloque seu e-mail aqui

-- ─── 6. Verificação final ────────────────────────────────────────────────────
select
  p.display_name,
  p.email,
  p.is_admin,
  p.nous_coins,
  p.friend_id
from profiles p
order by p.created_at;
