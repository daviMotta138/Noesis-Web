# ⚡ Quick Start - Sistema de Promoção/Regressão

**Tempo estimado**: 15-20 minutos para implementação básica

## 1️⃣ Executar SQL (5 min)

```bash
# 1. Abra o Supabase Dashboard
# 2. Vá para SQL Editor
# 3. Cole TODO o conteúdo de:
#    supabase/league_promotion_system.sql
# 4. Clique "RUN"
# 5. Aguarde conclusão (sem erros)
```

✅ **Verificação**:
```sql
-- Cole no SQL Editor e execute
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'league';

SELECT EXISTS (SELECT 1 FROM information_schema.tables 
WHERE table_name = 'season_history');
```

Ambos devem retornar `true` ou a coluna deve aparecer.

---

## 2️⃣ Configurar Ambiente (5 min)

Adicione ao `.env.local`:

```env
VITE_SUPABASE_URL=seu_url_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_KEY=sua_chave_service_aqui
CRON_SECRET=gerar_uma_chave_secreta_forte
```

Gerar `CRON_SECRET`:
```bash
# No terminal
openssl rand -base64 32
# Copie a saída
```

---

## 3️⃣ Deploy Vercel (5 min)

### Opção A: Via Dashboard
1. Abra [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto Noesis
3. Settings → Environment Variables
4. Adicione:
   - `SUPABASE_SERVICE_KEY`
   - `CRON_SECRET`
5. Deploy

### Opção B: Via CLI
```bash
vercel env add SUPABASE_SERVICE_KEY
# Cole sua chave

vercel env add CRON_SECRET
# Cole a chave gerada

vercel deploy --prod
```

---

## 4️⃣ Configurar Cron Job (2 min)

Atualize `vercel.json`:

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

Depois `git push` para main branch.

Vercel detectará automaticamente e agendará o cron job.

---

## 5️⃣ Testar Localmente (2-3 min)

### Simulação no Banco
```sql
-- No Supabase SQL Editor
UPDATE profiles 
SET 
  promotion_timestamp = NOW(),
  promotion_seen = false,
  previous_league = 'Bronze',
  league = 'Prata'
WHERE id = 'seu_user_id_aqui';
```

Depois acesse a página Ranking em seu app local. Modal deve aparecer!

### Usar Componente Tester
Adicione temporariamente em qualquer página:

```tsx
import { LeaguePromotionTester } from '../components/LeaguePromotionTester';

export default function MyPage() {
  return (
    <>
      <YourContent />
      <LeaguePromotionTester /> {/* Painel no canto inferior direito */}
    </>
  );
}
```

Clique nos botões para testar promoção/regressão.

---

## 6️⃣ Verificações Finais

- [ ] SQL executado sem erros
- [ ] Variáveis de ambiente configuradas
- [ ] Cron job agendado em Vercel
- [ ] App compilada sem warnings
- [ ] Modal aparece localmente ao testar
- [ ] Deploy bem-sucedido no Vercel

**Pronto! 🎉**

---

## Próximas Execuções

Seu cron job vai rodar:
- **Toda semana**: Domingo às 20h UTC
- **Automaticamente**: Não precisa de ação manual
- **Resultados**: Aparecem quando usuário acessa Ranking

---

## Troubleshooting Rápido

### "Coluna 'league' não existe"
→ SQL não foi executada. Vá para Supabase SQL Editor e execute novamente.

### "Function check_league_promotions not found"
→ SQL completo não foi executada. Cole TUDO de `league_promotion_system.sql`

### Modal não aparece
→ Cheque se `promotion_seen = false` e `promotion_timestamp` não é null:
```sql
SELECT id, promotion_seen, promotion_timestamp FROM profiles LIMIT 1;
```

### Cron não dispara
→ Verifique Vercel Dashboard:
1. Seu projeto
2. Settings
3. Crons
4. Deve estar lá listado

Se não estiver, atualize `vercel.json` e faça push novamente.

---

## Documentação Completa

Para detalhes completos, veja:
- **Setup**: `LEAGUE_SYSTEM_SETUP.md`
- **Testes**: `TESTING_GUIDE.md`
- **Dúvidas**: `FAQ_PROMOTIONS.md`
- **Checklist**: `IMPLEMENTATION_CHECKLIST.md`

---

## Suporte Rápido

```
Problema → Arquivo
Dúvida sobre setup → LEAGUE_SYSTEM_SETUP.md
Teste não funciona → TESTING_GUIDE.md
Pergunta geral → FAQ_PROMOTIONS.md
Implementação → IMPLEMENTATION_CHECKLIST.md
Resumo de arquivos → FILES_SUMMARY.md
```

---

## Rollback (se necessário)

Se precisar desfazer tudo:

```sql
-- No Supabase SQL Editor
DROP FUNCTION IF EXISTS mark_demotion_seen(uuid);
DROP FUNCTION IF EXISTS mark_promotion_seen(uuid);
DROP FUNCTION IF EXISTS check_league_promotions();
DROP FUNCTION IF EXISTS process_league_promotions();
DROP TABLE IF EXISTS season_history;

-- Para remover colunas (cuidado!)
-- ALTER TABLE profiles DROP COLUMN IF EXISTS league;
-- etc.
```

---

**Estimativa**: 15 minutos de seu tempo → Sistema funcionando perfeitamente! ✨

Qualquer dúvida, veja os arquivos de documentação. Boa sorte! 🚀
