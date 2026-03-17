-- ─── Noesis: Agendamento Semanal do Ranking ──────────────────────────────────
-- Execute no SQL Editor do Supabase → clique em Run.
-- Este script agenda process_weekly_leagues() para rodar todo Domingo às 23:00 UTC (20:00 BRT).

-- 1. Habilitar extensões necessárias
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 2. Remover cron job anterior se existir (comente na primeira execução)
select cron.unschedule('weekly_league_reset');

-- 3. Agendar processamento de ligas todo Domingo às 23:00 UTC (20:00 horário de Brasília)
-- Cron: '0 23 * * 0' = minuto 0, hora 23, todo dia, todo mês, domingo (0)
select cron.schedule(
    'weekly_league_reset',      -- Nome do agendamento
    '0 23 * * 0',               -- Todo Domingo às 23:00 UTC = 20:00 BRT
    $$
        select process_weekly_leagues();
    $$
);

/*
COMO FUNCIONA:
1. O cron chama process_weekly_leagues() diretamente às 23h UTC (Domingo).
2. A função process_weekly_leagues() (definida em fix_ranking_timer.sql):
   a. Concede badges (top 3 de cada liga) via array_append na coluna profiles.badges
   b. Chama process_league_promotions() → atualiza league, previous_league, promotion_timestamp, etc.
   c. Reseta scores de todos os jogadores para 0.
   d. Insere notificações globais de "Nova Semana do Ranking".
3. Na próxima vez que o usuário abrir a aba Ranking, checkPromotionStatus() detecta
   o promotion_timestamp e exibe o PromotionModal / DemotionModal automaticamente.

VERIFICAÇÃO:
- Após executar este script, verifique em:
  Supabase Dashboard → Database → Extensions → pg_cron ✅
  Supabase Dashboard → Database → Cron Jobs → deve aparecer 'weekly_league_reset'

TESTE MANUAL (sem esperar pelo Domingo):
  SELECT process_weekly_leagues();
*/
