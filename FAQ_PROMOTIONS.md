# FAQ - Sistema de Promoção e Regressão de Ligas

## Perguntas Frequentes

### 🎯 Funcionalidade Geral

**P: Quando as promoções/regressões acontecem?**
R: Todo domingo às 20h UTC. O sistema processa automaticamente baseado no score de cada jogador em sua liga atual.

**P: Como o sistema determina quem é promovido?**
R: Ordena os jogadores de cada liga por score (descending) e aplica porcentagens:
- Bronze: Top 30% → Prata
- Prata: Top 20% → Ouro | Bottom 20% → Bronze
- Ouro: Top 10% → Diamante | Bottom 30% → Prata
- Diamante: Top 5% → Campeonato | Bottom 50% → Ouro
- Campeonato: Bottom 70% → Diamante

**P: E se houver empate de scores?**
R: O sistema ordena por score DESC, então quem está "no topo" da query é considerado primeiro. Para desempate mais justo, você pode adicionar `created_at` ao ORDER BY.

**P: Um jogador pode ser promovido e rebaixado na mesma semana?**
R: Não. A função processa cada usuário uma única vez por semana. Se alguém era Bronze e chega ao Top 30%, é promovido para Prata. Na próxima semana, se estiver em posição de regressão em Prata, aí será rebaixado.

---

### 🎨 Modais e Animações

**P: Posso customizar as cores dos modals?**
R: Sim! Edite `LEAGUE_COLORS` em `PromotionModal.tsx` e `DemotionModal.tsx`:
```typescript
const LEAGUE_COLORS = {
  Bronze: '#CD7F32',    // Mude aqui
  Prata: '#C0C0C0',     // E aqui
  // ...
};
```

**P: Como desabilitar animações se afetar performance?**
R: Remova as props `animate` e `initial` dos componentes `<motion.div>` ou defina:
```typescript
// Em layout.tsx ou _app.tsx
import { domAnimation, LazyMotion } from 'framer-motion';

export default function App() {
  return (
    <LazyMotion features={domAnimation}>
      {/* seu app */}
    </LazyMotion>
  );
}
```

**P: Os modais aparecem uma única vez?**
R: Sim, após visualizar o modal, `promotion_seen` ou `demotion_seen` é marcado como `true`, impedindo que apareça novamente. Para resetar:
```sql
UPDATE profiles 
SET promotion_seen = false, demotion_seen = false 
WHERE id = 'user_uuid';
```

---

### ⚙️ Configuração e Deployment

**P: Qual a zona de erro se a função SQL não executar?**
R: O endpoint `/api/promotions` retornará:
```json
{
  "error": "mensagem de erro do supabase"
}
```
Verifique os logs do Vercel ou execute `SELECT check_league_promotions();` no SQL Editor.

**P: Posso testar localmente sem publicar?**
R: Sim! Use o `LeaguePromotionTester.tsx` ou execute diretamente no banco:
```sql
UPDATE profiles 
SET promotion_timestamp = NOW(), promotion_seen = false 
WHERE id = 'uuid_aqui';
```

**P: Como mudo o horário do cron?**
R: Edite `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/promotions",
    "schedule": "0 22 * * 0"  // 22h UTC no domingo
  }]
}
```
**Nota**: Horários UTC. Para São Paulo, subtraia 3 horas.

**P: E se tiver mais de um servidor/projeto?**
R: Cada um precisa chamar o endpoint separadamente, ou você centraliza em um único cron que processa múltiplos bancos.

---

### 🔒 Segurança

**P: Como proteger o endpoint /api/promotions?**
R: Ele valida o header `Authorization: Bearer CRON_SECRET`. Gere um secret forte:
```bash
openssl rand -base64 32
# Saída: exemplo123AbCdEfGhIjKlMnOpQrStUvWxYz==
```

**P: Quem pode ver os dados de histórico de promoções?**
R: RLS policy permite que:
- Qualquer pessoa veja seu próprio histórico
- Admins vejam tudo (se adicionar RLS específica)
```sql
-- Adicionar RLS para admin se necessário
CREATE POLICY "admin_view_all" ON season_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND is_admin = true
    )
  );
```

**P: Como garantir que `check_league_promotions()` só executa 1x por semana?**
R: O cron job do Vercel garante isso. Se quiser mais controle, adicione na função:
```sql
-- Adicione coluna
ALTER TABLE profiles ADD COLUMN last_promotion_run_at timestamptz;

-- Na função
IF (last_promotion_run_at IS NULL 
    OR EXTRACT(WEEK FROM now()) != EXTRACT(WEEK FROM last_promotion_run_at))
THEN
  -- executar processamento
  UPDATE profiles SET last_promotion_run_at = NOW();
END IF;
```

---

### 📊 Dados e Histórico

**P: Como acessar o histórico de promoções de um usuário?**
R: Query na tabela `season_history`:
```sql
SELECT * FROM season_history 
WHERE user_id = 'uuid_aqui'
ORDER BY created_at DESC;
```

**P: Posso ver estatísticas de promoções por liga?**
R: Sim!
```sql
SELECT 
  league_after,
  COUNT(*) as total_promoted,
  AVG(score) as avg_score
FROM season_history
WHERE promoted = true
  AND season_year = EXTRACT(YEAR FROM NOW())
GROUP BY league_after;
```

**P: Como limpar dados antigos?**
R: Você pode arquivar ou deletar:
```sql
-- Manter últimos 12 meses
DELETE FROM season_history
WHERE created_at < NOW() - INTERVAL '1 year';

-- Ou arquivar em outra tabela
INSERT INTO season_history_archive
SELECT * FROM season_history
WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM season_history
WHERE created_at < NOW() - INTERVAL '1 year';
```

---

### 🐛 Troubleshooting

**P: Coluna 'league' não existe na tabela profiles**
R: Execute novamente o SQL em `supabase/league_promotion_system.sql`. Se já executou, verifique:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'league';
```

**P: Erro "function check_league_promotions() does not exist"**
R: Funções SQL não foram criadas. Execute o SQL completo:
```bash
# No Supabase SQL Editor
-- Cole todo o conteúdo de league_promotion_system.sql
-- Clique RUN
```

**P: Modal aparece mas não fecha**
R: Verifique se `onClose` está sendo chamado:
```typescript
// Em Ranking.tsx
const handleClosePromotion = () => {
  console.log('Closing promotion modal');
  setShowPromotionModal(false);
  setPromotionData(null);
};

// Pass a função
<PromotionModal
  isOpen={showPromotionModal}
  fromLeague={promotionData?.from || ''}
  toLeague={promotionData?.to || ''}
  onClose={handleClosePromotion}
/>
```

**P: Promoção não aparece mas o campo está verdadeiro no BD**
R: Verifique:
1. `promotion_seen = false` (não true)
2. `promotion_timestamp` não é NULL
3. `previous_league` não é NULL
4. `user?.id` é válido

```sql
SELECT promotion_timestamp, promotion_seen, previous_league, league
FROM profiles WHERE id = 'uuid';
```

**P: Erro ao chamar `mark_promotion_seen`**
R: Verifique permissões:
```sql
-- Grant execute
GRANT EXECUTE ON FUNCTION mark_promotion_seen(uuid) TO authenticated;

-- Verifique se função existe
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'mark_promotion_seen';
```

---

### 🚀 Performance

**P: Vai ficar lento com muitos usuários?**
R: Depende da quantidade:
- 1-1000 usuários: Sem problemas
- 1000-10k: Monitore com EXPLAIN ANALYZE
- 10k+: Considere indexação:
```sql
CREATE INDEX idx_profiles_league_score 
ON profiles(league, score DESC);
```

**P: Quanto tempo leva para processar?**
R: A função é rápida (< 1 segundo para 1000 usuários) porque:
- Processa por liga (particionado logicamente)
- Sem loops desnecessários
- Índices automáticos

**P: Cron vai timeout?**
R: Vercel permite até 60 segundos. Com 50k usuários, pode demorar ~30s. Se for lento, optimize:
```sql
-- Análise
EXPLAIN ANALYZE SELECT * FROM profiles 
ORDER BY league, score DESC;

-- Adicione índice se necessário
CREATE INDEX CONCURRENTLY idx_league_score 
ON profiles(league, score DESC);
```

---

### 🎮 User Experience

**P: Devo notificar o usuário quando for rebaixado?**
R: Sim! Você pode:
1. **Push notification**: Integre com seu sistema de notificações
2. **Email**: Envie email ao ser rebaixado
3. **Modal**: Já implementado ✅
4. **Notificação In-App**: Adicione badge na navbar

Exemplo com push notifications:
```typescript
// Em Ranking.tsx checkPromotionStatus
if (profileData.demotion_timestamp && !profileData.demotion_seen) {
  // Enviar notificação
  await sendNotification({
    title: 'Você foi rebaixado',
    body: `${profileData.league} → ${previousLeague}`,
    icon: '⚠️'
  });
}
```

**P: Como mostrar na navbar quem foi promovido recentemente?**
R: Adicione em `Layout.tsx` ou navbar:
```typescript
const { profile } = useGameStore();

{profile?.promotion_timestamp && !profile?.promotion_seen && (
  <motion.div
    animate={{ scale: [1, 1.05, 1] }}
    transition={{ duration: 2, repeat: Infinity }}
    className="text-sm font-bold text-green-400"
  >
    ✨ Parabéns! Você foi promovido!
  </motion.div>
)}
```

**P: Devo resetar scores a cada semana?**
R: Depende do design:
- **Competição acumulada**: Mantenha scores
- **Resetar por season**: Adicione coluna `season_start_score`

```sql
-- Se quiser resetar scores
UPDATE profiles SET score = 0 
WHERE league != 'Campeonato';  -- Exceto top
```

---

### 💰 Rewards e Incentivos

**P: Posso dar prêmios por promoção?**
R: Sim! Na função SQL, ao promover:
```sql
-- Dar 100 Nous ao ser promovido
UPDATE profiles
SET nous_coins = nous_coins + 100
WHERE id IN (/* usuários promovidos */);
```

Ou em trigger:
```sql
CREATE TRIGGER after_promotion
AFTER UPDATE ON profiles
FOR EACH ROW
WHEN (NEW.promotion_timestamp IS NOT NULL 
      AND OLD.promotion_timestamp IS NULL)
EXECUTE FUNCTION grant_promotion_reward();
```

**P: Punição por regressão?**
R: Não recomendado - já é frustrante ser rebaixado. Melhor: dar escudo ou bonus defensivo na próxima liga.

---

### 📈 Métricas e Analytics

**P: Como rastrear taxa de promoção por liga?**
R: Use `season_history`:
```sql
SELECT 
  league_before,
  COUNT(*) as promoções,
  COUNT(CASE WHEN promoted THEN 1 END) as total_promoted,
  ROUND(100.0 * COUNT(CASE WHEN promoted THEN 1 END) / COUNT(*), 2) as taxa_promo
FROM season_history
GROUP BY league_before;
```

**P: Usuários mais promovidos?**
R: Ranking:
```sql
SELECT 
  p.display_name,
  COUNT(sh.id) as total_promo,
  SUM(CASE WHEN sh.promoted THEN 1 ELSE 0 END) as promotions,
  SUM(CASE WHEN sh.demoted THEN 1 ELSE 0 END) as demotions
FROM profiles p
LEFT JOIN season_history sh ON p.id = sh.user_id
GROUP BY p.id, p.display_name
ORDER BY total_promo DESC;
```

---

### 🔄 Integrações

**P: Posso integrar com Discord webhook?**
R: Sim! Adicione em `pages/api/promotions.ts`:
```typescript
const discordHook = process.env.DISCORD_WEBHOOK_URL;

// Após processar promoções
await fetch(discordHook, {
  method: 'POST',
  body: JSON.stringify({
    content: '📊 Promoções/Regressões processadas',
    embeds: [{
      title: 'Resultado da Semana',
      description: `${result.data.updated_count} usuários atualizados`
    }]
  })
});
```

**P: Integração com Slack?**
R: Similar, use webhook do Slack:
```typescript
// pages/api/slack-promotions.ts
await fetch(process.env.SLACK_WEBHOOK, {
  method: 'POST',
  body: JSON.stringify({
    text: '🏆 Promoções e Regressões da Semana',
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: '*Status*: Processado' } }
    ]
  })
});
```

---

## Resumo Rápido

| Aspecto | Resposta |
|--------|---------|
| **Quando executa?** | Domingo 20h UTC |
| **Quem decide?** | Algoritmo de top % por liga |
| **Quantas vezes?** | 1x por semana |
| **Animação?** | Framer Motion ✅ |
| **Customizável?** | Sim, cores e porcentagens |
| **Seguro?** | Sim, com CRON_SECRET |
| **Performance?** | Ótima até 10k+ usuários |
| **Histórico?** | Sim, em `season_history` |
| **Revertível?** | Sim, SQL simples |

---

## Contato / Suporte

Se tiver dúvidas:
1. Verifique `LEAGUE_SYSTEM_SETUP.md` para setup
2. Verifique `TESTING_GUIDE.md` para testes
3. Veja console do navegador (F12)
4. Verifique logs Supabase (SQL Editor)
5. Verifique logs Vercel (Dashboard → Functions)
