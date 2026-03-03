# Checklist de Implementação - Sistema de Promoção/Regressão

## 📋 Pré-Implementação

- [ ] Projeto Noesis clonado e rodando localmente
- [ ] Acesso ao SQL Editor do Supabase
- [ ] Acesso ao Dashboard do Vercel
- [ ] Arquivo `.env.local` configurado com credenciais

## 🗄️ Banco de Dados (Supabase)

### Migrations
- [ ] Arquivo `supabase/league_promotion_system.sql` criado ✅
- [ ] SQL executado no Supabase SQL Editor
- [ ] Sem erros na execução
- [ ] Verificar coluna `league` em `profiles`:
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'profiles' AND column_name = 'league';
  ```
- [ ] Verificar tabela `season_history` criada:
  ```sql
  SELECT * FROM information_schema.tables 
  WHERE table_name = 'season_history';
  ```

### Funções SQL
- [ ] `process_league_promotions()` criada
- [ ] `check_league_promotions()` criada
- [ ] `mark_promotion_seen()` criada
- [ ] `mark_demotion_seen()` criada
- [ ] RLS policies em `season_history` criadas

## 🎨 Componentes React

### Novos Componentes
- [ ] `src/components/PromotionModal.tsx` criado ✅
- [ ] `src/components/DemotionModal.tsx` criado ✅
- [ ] `src/components/LeaguePromotionTester.tsx` criado ✅

### Atualizações Existentes
- [ ] `src/pages/Ranking.tsx` atualizado:
  - [ ] Imports adicionados (PromotionModal, DemotionModal)
  - [ ] Estados para modais adicionados
  - [ ] Função `checkPromotionStatus()` implementada
  - [ ] Chamada a `checkPromotionStatus()` em useEffect
  - [ ] Modais renderizados no JSX
- [ ] `src/lib/supabase.ts` atualizado:
  - [ ] Interface `Profile` estendida com novos campos
  - [ ] Campos: `promotion_timestamp`, `demotion_timestamp`, etc.

### Tipos TypeScript
- [ ] Novos campos do Profile compilam sem erro
- [ ] Nenhuma aviso de `@ts-ignore` necessário

## ⚙️ API e Deployment

### Endpoint API
- [ ] Arquivo `pages/api/promotions.ts` criado ✅
- [ ] Valida `Authorization` header
- [ ] Chama `check_league_promotions()` do Supabase
- [ ] Trata erros apropriadamente

### Configuração Vercel
- [ ] `vercel.json` configurado com cron job:
  ```json
  {
    "crons": [
      {
        "path": "/api/promotions",
        "schedule": "0 20 * * 0"
      }
    ]
  }
  ```
- [ ] `CRON_SECRET` gerado e salvo seguramente
- [ ] `SUPABASE_SERVICE_KEY` adicionado às variáveis de ambiente

### Variáveis de Ambiente
- [ ] `.env.local` atualizado com:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_KEY` (servidor apenas)
  - [ ] `CRON_SECRET`
- [ ] `.env.example.promotions` criado como referência
- [ ] Nenhuma chave sensível em git (verifique `.gitignore`)

## 🧪 Testes Locais

### Testes Funcionais
- [ ] Modais renderizam sem erro
- [ ] Animações funcionam suavemente (sem lag)
- [ ] Modais fecham ao clicar "Continuar"/"Entendi"
- [ ] Backgrounds e cores aparecem corretamente

### Testes de Banco de Dados
- [ ] Simular promoção manualmente:
  ```sql
  UPDATE profiles SET promotion_timestamp = NOW(), promotion_seen = false
  WHERE id = 'seu_uuid_aqui';
  ```
- [ ] Modal aparece ao acessar Ranking
- [ ] Modal desaparece após fechamento
- [ ] Campo `promotion_seen` fica true após visualização
- [ ] Modal não reaparece ao recarregar

### Testes de API
- [ ] Testar endpoint localmente:
  ```bash
  curl -X POST http://localhost:3000/api/promotions \
    -H "Authorization: Bearer seu_cron_secret"
  ```
- [ ] Retorna status 200 com JSON válido
- [ ] Retorna 401 sem `Authorization` header

## 📊 Testes em Produção

### Pre-Deploy
- [ ] Build local passa sem warnings:
  ```bash
  npm run build
  # ou
  yarn build
  ```
- [ ] Nenhum erro de TypeScript
- [ ] Nenhum console warning relacionado a componentes

### Deploy Vercel
- [ ] Código pushed para branch main
- [ ] Deploy automático iniciado
- [ ] Deploy completou sem erros
- [ ] Build logs inspecionados (sem warnings)

### Post-Deploy
- [ ] Variáveis de ambiente setadas no Vercel Dashboard
  - [ ] `SUPABASE_SERVICE_KEY`
  - [ ] `CRON_SECRET`
- [ ] Cron job visível em Settings → Crons
- [ ] Próxima execução agendada corretamente

## 🔍 Validação Pós-Deploy

### Funcionalidade
- [ ] Acessar site em produção
- [ ] Navegar até página Ranking
- [ ] Nenhum erro de componente
- [ ] Modais carregam sem problemas

### Cron Job
- [ ] Esperar até domingo 20h UTC (ou forçar teste)
- [ ] Verificar logs do Vercel:
  - [ ] Settings → Functions
  - [ ] Procurar por `/api/promotions`
  - [ ] Status deve ser "Success"
- [ ] Verificar BD para usuários atualizados:
  ```sql
  SELECT display_name, league, promotion_timestamp 
  FROM profiles 
  WHERE promotion_timestamp > NOW() - INTERVAL '1 hour';
  ```

### Documentação
- [ ] `LEAGUE_SYSTEM_SETUP.md` criado ✅
- [ ] `TESTING_GUIDE.md` criado ✅
- [ ] `FAQ_PROMOTIONS.md` criado ✅
- [ ] Instruções claras para future developers

## 🚀 Otimizações Opcionais

- [ ] Adicionar índice para performance:
  ```sql
  CREATE INDEX idx_profiles_league_score 
  ON profiles(league, score DESC);
  ```
- [ ] Adicionar prêmios por promoção (Nous coins)
- [ ] Integração com notificações push
- [ ] Discord/Slack webhook para notificar team
- [ ] Dashboard de estatísticas de ligas
- [ ] Histórico visual em perfil do usuário

## 🐛 Troubleshooting During Implementation

Se encontrar problemas:

1. **Erro na migração SQL**
   - [ ] Verifique sintaxe
   - [ ] Execute linha por linha
   - [ ] Procure por conflitos com schema existente
   - [ ] Veja documentação FAQ_PROMOTIONS.md

2. **Modais não aparecem**
   - [ ] Verifique Ranking.tsx imports
   - [ ] Verifique estados do componente
   - [ ] Inspecione console do navegador (F12)
   - [ ] Verifique BD se campos existem

3. **Cron não executa**
   - [ ] Verifique `CRON_SECRET` está correto
   - [ ] Confirme `SUPABASE_SERVICE_KEY` está set
   - [ ] Veja logs Vercel
   - [ ] Teste endpoint manualmente

4. **Compilação falha**
   - [ ] `npm install` para atualizar dependências
   - [ ] Verifique versão de Node.js (14+)
   - [ ] Limpe `node_modules` e reinstale
   - [ ] Verifique syntax TypeScript

## ✅ Conclusão

- [ ] Todos os itens acima completos
- [ ] Nenhum erro no console/logs
- [ ] Funcionalidade testada em dev e produção
- [ ] Documentação revisada
- [ ] Time comunicado sobre novo sistema
- [ ] Pronto para produção! 🎉

---

## Notas Adicionais

- Substituir horário do cron se necessário para sua timezone
- Considerar automação para resetar season_history periodicamente
- Monitorar performance se base crescer muito (10k+ usuários)
- Backup regular da BD antes de changes importantes

**Data de Implementação:** _______________

**Implementado por:** _______________

**Revisado por:** _______________

**Notas:** _______________________________________________
