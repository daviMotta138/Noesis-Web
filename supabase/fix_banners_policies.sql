-- supabase/fix_banners_policies.sql

-- 1. Garante que administradores possam ler todos os banners, inclusive inativos
drop policy if exists "Admins can view all banners." on update_banners;
create policy "Admins can view all banners."
  on update_banners for select
  using ( exists (
    select 1 from profiles where id = auth.uid() and is_admin = true
  ) );

-- 2. Recria a política de update garantindo explicitamente as cláusulas USING e WITH CHECK
drop policy if exists "Only admins can update banners." on update_banners;
create policy "Only admins can update banners."
  on update_banners for update
  using ( exists (
    select 1 from profiles where id = auth.uid() and is_admin = true
  ) )
  with check ( exists (
    select 1 from profiles where id = auth.uid() and is_admin = true
  ) );

-- 3. Caso precisem recriar a de insert e delete, vamos garantir que estão perfeitamente amarradas ao is_admin
drop policy if exists "Only admins can insert banners." on update_banners;
create policy "Only admins can insert banners."
  on update_banners for insert
  with check ( exists (
    select 1 from profiles where id = auth.uid() and is_admin = true
  ) );

drop policy if exists "Only admins can delete banners." on update_banners;
create policy "Only admins can delete banners."
  on update_banners for delete
  using ( exists (
    select 1 from profiles where id = auth.uid() and is_admin = true
  ) );
