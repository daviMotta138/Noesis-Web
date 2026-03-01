-- ─── Enhance Notifications for Gifting ──────────────────────────────────────────
-- Adiciona suporte para metatada de itens e status de "resgatado" para presentes.

alter table notifications 
add column if not exists metadata jsonb default '{}'::jsonb,
add column if not exists claimed boolean default false;

-- Marcar todas as notificações antigas como "claimed" (já que não eram presentes)
update notifications set claimed = true where claimed = false;

-- Comentário da coluna para documentação
comment on column notifications.metadata is 'Detalhes do item presenteado (item_id, name, emoji, etc)';
comment on column notifications.claimed is 'Status de resgate para presentes';
