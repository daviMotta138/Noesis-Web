# Sistema de Promoção e Regressão de Ligas

## Visão Geral
Este sistema implementa um mecanismo automático de promoção e regressão de ligas baseado no desempenho dos jogadores ao final de cada semana (domingo às 20h).

## Componentes Implementados

### 1. **Migrations SQL** (`supabase/league_promotion_system.sql`)
- Adiciona campos à tabela `profiles`:
  - `league`: Liga atual (Bronze, Prata, Ouro, Diamante, Campeonato)
  - `previous_league`: Liga anterior para rastreamento
  - `promotion_timestamp`: Timestamp da última promoção
  - `demotion_timestamp`: Timestamp da última regressão
  - `last_season_rank`: Posição no ranking da última temporada
  - `promotion_seen`: Flag para animar promoção apenas uma vez
  - `demotion_seen`: Flag para animar regressão apenas uma vez

- Cria tabela `season_history` para rastreamento histórico de movimentações

- Implementa funções PL/pgSQL:
  - `process_league_promotions()`: Processa todas as promoções/regressões
  - `check_league_promotions()`: RPC wrapper para chamar o processamento
  - `mark_promotion_seen(uuid)`: Marca promoção como vista
  - `mark_demotion_seen(uuid)`: Marca regressão como vista

### 2. **Componentes React**

#### `PromotionModal.tsx`
Modal que exibe quando um jogador é promovido:
- Animação de entrada suave (spring)
- Efeito de brilho com cor da liga destino
- Transição visual das ligas (emoji + nome)
- Seta animada indicando avanço
- Mensagem de congratulações
- Ícone de troféu com rotação suave

Cores das ligas:
- Bronze: #CD7F32
- Prata: #C0C0C0
- Ouro: #FFD700
- Diamante: #00FFFF
- Campeonato: #FF00FF

#### `DemotionModal.tsx`
Modal que exibe quando um jogador é rebaixado:
- Animação similar, mas com cores de aviso (vermelho)
- Transição visual com seta para baixo
- Mensagem de encorajamento
- Ícone de alerta animado
- Padrão de cor diferenciado (#F87171 para ativação)

### 3. **Atualizações do Ranking.tsx**
- Integração dos modais de promoção e regressão
- Função `checkPromotionStatus()` que:
  - Verifica se há promoções/regressões não vistas
  - Exibe os modais apropriados
  - Marca automaticamente como vistas após exibição

### 4. **Endpoint API** (`pages/api/promotions.ts`)
- Endpoint que pode ser chamado por cron jobs do Vercel
- Processa todas as promoções/regressões da semana
- Requer autenticação via `CRON_SECRET`

## Critérios de Promoção/Regressão

### Bronze
- **Promoção**: Top 30% → Prata

### Prata
- **Promoção**: Top 20% → Ouro
- **Regressão**: Bottom 20% → Bronze

### Ouro
- **Promoção**: Top 10% → Diamante
- **Regressão**: Bottom 30% → Prata

### Diamante
- **Promoção**: Top 5% → Campeonato
- **Regressão**: Bottom 50% → Ouro

### Campeonato
- **Regressão**: Bottom 70% → Diamante

## Setup

### 1. Executar Migrations SQL
1. Abra o SQL Editor do Supabase
2. Cole o conteúdo de `supabase/league_promotion_system.sql`
3. Clique em "Run"

### 2. Configurar Variáveis de Ambiente
Adicione ao seu `.env.local` ou `.env`:
```
VITE_SUPABASE_URL=sua_url_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_KEY=sua_chave_service_aqui
CRON_SECRET=sua_chave_secreta_aqui
```

### 3. Configurar Cron Job no Vercel
No `vercel.json`, adicione ou atualize:
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

A programação `0 20 * * 0` significa:
- **0**: minuto 0
- **20**: hora 20 (8 PM UTC)
- **\***: qualquer dia do mês
- **\***: qualquer mês
- **0**: domingo

### 4. Testar Manualmente
Para testar sem esperar pelo cron, faça uma requisição POST:
```bash
curl -X POST https://seu-dominio.vercel.app/api/promotions \
  -H "Authorization: Bearer seu_cron_secret"
```

## Fluxo de Funcionamento

1. **Domingo às 20h UTC**: Vercel dispara o cron job
2. **API recebe requisição** e chama `check_league_promotions()`
3. **Função PL/pgSQL executa**:
   - Ordena jogadores por score em cada liga
   - Calcula posições e determina promoções/regressões
   - Atualiza tabelas `profiles` e `season_history`
   - Define `promotion_seen` e `demotion_seen` como `false`
4. **Na próxima vez que o usuário acessa o Ranking**:
   - `checkPromotionStatus()` detecta mudanças
   - Exibe modal apropriado (promoção ou regressão)
   - Marca como visto para não exibir novamente

## Tipos Adicionados

### Profile Interface
```typescript
previous_league?: string | null;
promotion_timestamp?: string | null;
demotion_timestamp?: string | null;
last_season_rank?: number | null;
promotion_seen?: boolean;
demotion_seen?: boolean;
```

## Customizações Possíveis

### Alterar Horário do Cron
Edite `vercel.json`:
```json
"schedule": "0 22 * * 0"  // 22h UTC (sábado à noite no horário de São Paulo)
```

### Ajustar Porcentagens de Promoção
No arquivo SQL, edite as condições em `process_league_promotions()`:
```sql
if v_pos <= v_total_count * 0.3 then  -- 30% para promoção
```

### Mudar Cores das Ligas
Edite as constantes em `PromotionModal.tsx` e `DemotionModal.tsx`:
```typescript
const LEAGUE_COLORS = {
  Bronze: '#CD7F32',  // Ajuste aqui
  // ...
};
```

## Segurança

- O endpoint `/api/promotions` valida o header `Authorization`
- Apenas requisições com o `CRON_SECRET` correto são processadas
- Funções PL/pgSQL usam `security definer` com permissões apropriadas
- O acesso ao `mark_promotion_seen()` e `mark_demotion_seen()` é apenas para usuários autenticados

## Troubleshooting

### Modals não aparecem
- Verifique se os campos foram adicionados à tabela `profiles`
- Confirme que as funções SQL foram criadas
- Verifique o console do navegador para erros

### Cron job não funciona
- Verifique se `CRON_SECRET` está correto
- Confirme que `SUPABASE_SERVICE_KEY` está definido
- Verifique os logs do Vercel em Settings → Functions

### Usuários presos em modal anterior
- Você pode resetar manualmente no Supabase:
```sql
UPDATE profiles 
SET promotion_seen = true, demotion_seen = true 
WHERE id = 'user_uuid';
```

## Próximos Passos Opcionais

1. **Dashboard de Histórico**: Mostrar `season_history` na página de Perfil
2. **Prêmios**: Dar rewards especiais para promoções (Nous, avatares, etc.)
3. **Resenha de Temporada**: Modal mostrando estatísticas da semana
4. **Notificações Push**: Notificar quando promoção/regressão ocorre
5. **Animações no Ranking**: Destacar jogadores na zona de promoção/regressão em tempo real
