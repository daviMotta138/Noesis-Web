# Guia de Testes - Sistema de Promoção/Regressão

## Pré-requisitos
- Migrations SQL aplicadas ao Supabase
- Componentes React criados
- Endpoint `/api/promotions` configurado
- Variáveis de ambiente definidas

## Testes Locais

### 1. Testar Modais Visualmente
Use o componente `LeaguePromotionTester.tsx`:

```tsx
// Adicione temporariamente em uma página
import { LeaguePromotionTester } from '../components/LeaguePromotionTester';

export default function TestPage() {
  return (
    <div>
      {/* seu conteúdo */}
      <LeaguePromotionTester />
    </div>
  );
}
```

Isso exibe um painel flutuante no canto inferior direito com:
- ⬆️ Botão para testar promoção
- ⬇️ Botão para testar regressão
- ⚙️ Botão para testar endpoint

### 2. Simular Diretamente no Banco
No SQL Editor do Supabase:

```sql
-- Simular uma promoção
UPDATE profiles 
SET 
  previous_league = 'Bronze',
  league = 'Prata',
  promotion_timestamp = NOW(),
  promotion_seen = false
WHERE id = 'seu_uuid_aqui';

-- Verificar
SELECT display_name, league, previous_league, promotion_seen 
FROM profiles 
WHERE id = 'seu_uuid_aqui';
```

Depois acesse a página de Ranking e o modal deve aparecer.

### 3. Testar Endpoint da API

```bash
# Com curl
curl -X POST http://localhost:3000/api/promotions \
  -H "Authorization: Bearer seu_cron_secret_aqui"

# Ou com Thunder Client / Postman
POST http://localhost:3000/api/promotions
Authorization: Bearer seu_cron_secret_aqui
```

Esperado: Resposta 200 com JSON indicando sucesso.

## Testes em Produção

### 1. Verificar Tabelas e Funções
```sql
-- Verificar coluna de liga existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Verificar função existe
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%promotion%';

-- Verificar RLS policies
SELECT tablename, policyname, permissive 
FROM pg_policies 
WHERE tablename = 'profiles';
```

### 2. Testar Processamento de Promoções
```sql
-- Simulando vários usuários em uma liga
-- e verificar se a função funciona corretamente

-- 1. Criar dados de teste (opcional)
-- Já deve haver usuários reais no banco

-- 2. Chamar função manualmente
SELECT check_league_promotions();

-- 3. Verificar resultados
SELECT 
  display_name, 
  league, 
  promotion_timestamp, 
  demotion_timestamp,
  promotion_seen,
  demotion_seen
FROM profiles
WHERE promotion_timestamp > now() - interval '1 hour'
   OR demotion_timestamp > now() - interval '1 hour';

-- 4. Verificar histórico
SELECT * FROM season_history 
ORDER BY created_at DESC LIMIT 10;
```

### 3. Testar Cronograma
Após configurar em `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/promotions",
      "schedule": "*/5 * * * *"  // Testa a cada 5 minutos
    }
  ]
}
```

Monitore em: **Vercel Dashboard → Settings → Functions → Cron Jobs**

## Cenários de Teste

### Cenário 1: Promoção da Bronze para Prata
1. Usuário está em Bronze com score alto (top 30%)
2. Cron executa no domingo 20h
3. Usuário é promovido para Prata
4. Ao acessar Ranking na segunda, modal aparece
5. Após fechar modal, `promotion_seen` = true
6. Modal não aparece mais

### Cenário 2: Regressão da Prata para Bronze
1. Usuário está em Prata com score baixo (bottom 20%)
2. Cron executa
3. Usuário é rebaixado para Bronze
4. Modal de regressão exibe aviso
5. Flag `demotion_seen` é marcada

### Cenário 3: Permanência na Liga
1. Usuário em Ouro com score médio
2. Não está em zona de promoção nem regressão
3. Nada muda
4. `promotion_timestamp` e `demotion_timestamp` permanecem NULL

### Cenário 4: Múltiplas Movimentações
1. Usuário é promovido na semana 1
2. É promovido novamente na semana 2
3. `season_history` registra ambas movimentações
4. Ambos modais aparecem (se não forem ignorados)

## Checklist de Validação

- [ ] Migrations SQL executadas sem erros
- [ ] Tabelas existem: `profiles` (com novos campos), `season_history`
- [ ] Funções criadas:
  - [ ] `process_league_promotions()`
  - [ ] `check_league_promotions()`
  - [ ] `mark_promotion_seen()`
  - [ ] `mark_demotion_seen()`
- [ ] RLS policies configuradas em `season_history`
- [ ] Componentes React compilam sem erros
- [ ] Modais aparecem visualmente corretos
- [ ] Animações funcionam suavemente
- [ ] Endpoint `/api/promotions` retorna 200
- [ ] Cron job está ativo no Vercel
- [ ] Logs do Vercel não mostram erros

## Debugging

### Modal não aparece
```typescript
// Adicione logs em Ranking.tsx
const checkPromotionStatus = async () => {
  console.log('Checking promotion status...');
  if (!user?.id) {
    console.log('No user ID');
    return;
  }

  try {
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('promotion_timestamp, promotion_seen, league, previous_league')
      .eq('id', user.id)
      .single();

    console.log('Profile data:', profileData);
    console.log('Error:', error);

    if (profileData?.promotion_timestamp && !profileData?.promotion_seen) {
      console.log('Should show promotion modal');
    }
  } catch (e) {
    console.error('Promotion check error:', e);
  }
};
```

### Função SQL não executa
```sql
-- Teste função diretamente
SELECT check_league_promotions();

-- Verifique permissões
SELECT * FROM information_schema.role_table_grants 
WHERE table_name = 'profiles';

-- Monitore função
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%promotion%' 
LIMIT 5;
```

### Cron não dispara
- Verifique `CRON_SECRET` em `.env`
- Confirme `SUPABASE_SERVICE_KEY` está set
- Veja logs no Vercel Dashboard
- Teste endpoint manualmente

## Performance

### Monitorar Índices
```sql
-- Índices criados automaticamente
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename = 'season_history';

-- Monitorar query execution
EXPLAIN ANALYZE
SELECT * FROM profiles 
WHERE league = 'Bronze' 
ORDER BY score DESC;
```

### Otimizações se Necessário
```sql
-- Adicionar índices se tiver muitos usuários
CREATE INDEX idx_profiles_league_score 
ON profiles(league, score DESC);

CREATE INDEX idx_season_history_user_season 
ON season_history(user_id, season_year, season_week);
```

## Rollback (se necessário)

```sql
-- Remover sistema completamente
DROP FUNCTION IF EXISTS mark_demotion_seen(uuid);
DROP FUNCTION IF EXISTS mark_promotion_seen(uuid);
DROP FUNCTION IF EXISTS check_league_promotions();
DROP FUNCTION IF EXISTS process_league_promotions();
DROP TABLE IF EXISTS season_history;

-- Remover colunas (cuidado!)
-- ALTER TABLE profiles DROP COLUMN IF EXISTS league;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS previous_league;
-- etc.
```

## Logs Recomendados

Adicione a suas funções SQL para debug:

```sql
-- No início da função
RAISE NOTICE 'Starting promotion process at %', NOW();

-- Em loops
RAISE NOTICE 'Processing user: % in league: %', v_user_rec.display_name, v_league;

-- Ao final
RAISE NOTICE 'Promotion process completed';
```

Veja logs com:
```bash
# Supabase logs
supabase logs --follow
```

## Support

Se encontrar problemas:

1. Verifique o console do navegador (DevTools → Console)
2. Verifique logs do Supabase (SQL Editor → Console)
3. Verifique logs do Vercel (Dashboard → Functions)
4. Reexecute as migrations SQL
5. Limpe cache do navegador
6. Teste em navegador privado
