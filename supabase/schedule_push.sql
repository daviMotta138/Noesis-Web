-- ─── Noesis: Agendamento Diário de Notificações Push ─────────────────────
-- Execute no SQL Editor do Supabase → clique em Run.

-- 1. Habilitar as extensões necessárias para executar requisições HTTP e Agendamentos
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 2. (Opcional) Limpar o cron job anterior se já existir
-- IMPORTANTE: Se for a PRIMEIRA vez que você roda este script, deixe esta linha comentada, pois o job ainda não existe.
-- select cron.unschedule('daily_push_reminder');

-- 3. Agendar o job para todo dia às 16:00 (Fuso horário UTC, se seu banco for UTC, ajuste para 19:00 ou o correspondente do Brasil GMT-3)
-- Exemplo: 16:00 de Brasília = 19:00 UTC -> '0 19 * * *'
-- Mas assumindo que você quer testar agora, você pode mudar o cron pra '*/5 * * * *' (a cada 5 min).

select cron.schedule(
    'daily_push_reminder',              -- Nome do agendamento
    '0 19 * * *',                       -- Executa às 19:00 UTC (16:00 Horário de Brasília)
    $$
        select net.http_post(
            url := current_setting('app.settings.edge_function_url') || '/send-push',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
            ),
            body := jsonb_build_object('dailyReminder', true)
        );
    $$
);

/*
COMO FUNCIONA:
- O cron chamará a função net.http_post (da extensão pg_net).
- Ela roda internamente disparando para a url da Edge Function.
- Como `current_setting(...)` pode variar, o ideal e mais garantido na interface do Supabase é colar a sua URL direta:
  
SUBSTITUA pela sua URL real, ex:
select cron.schedule('daily_push_reminder', '0 19 * * *', $$
  select net.http_post(
      url := 'https://sua-project-id.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer sua-service-role-key-aqui'),
      body := jsonb_build_object('dailyReminder', true)
  );
$$);
*/
