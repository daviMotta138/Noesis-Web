-- Adiciona a política de UPDATE que estava faltando para o comando upsert()
create policy "push_update" on push_subscriptions
  for update
  using (auth.uid() = user_id);
