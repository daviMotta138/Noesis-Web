# 📊 Diagrama Visual - Sistema de Promoção/Regressão

## 🔄 Fluxo Completo do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                     DOMINGO 20h UTC                              │
│                                                                  │
│  Vercel Cron Job Dispara Automaticamente                        │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
        ┌────────────────────────┐
        │   POST /api/promotions │
        │  Authorization: Bearer │
        │     CRON_SECRET        │
        └────────┬───────────────┘
                 ↓
     ┌───────────────────────┐
     │   Endpoint valida     │
     │   Authorization       │
     │   Header e retorna    │
     │   erro se inválido    │
     └──────────┬────────────┘
                ↓
 ┌──────────────────────────────┐
 │ Chama RPC function:          │
 │ check_league_promotions()    │
 └────────────┬─────────────────┘
              ↓
 ┌──────────────────────────────────────┐
 │ process_league_promotions() executa: │
 │                                      │
 │ Para cada liga (Bronze → Campeonato):│
 │ 1. Ordena por score DESC             │
 │ 2. Calcula posições                  │
 │ 3. Determina promoções/regressões    │
 │ 4. Atualiza profiles table           │
 │ 5. Insere em season_history          │
 └────────────┬─────────────────────────┘
              ↓
     ┌────────────────────┐
     │  profiles tabela:  │
     │                    │
     │ promotion_seen=f   │
     │ demotion_seen=f    │
     │ league='Nova Liga' │
     │ previous_league=.. │
     │ timestamp=NOW()    │
     └────────┬───────────┘
              ↓
     ┌────────────────────────┐
     │  season_history:       │
     │  Registro de movimento │
     │  Para auditoria        │
     └────────────────────────┘


                        SEGUNDA-FEIRA
                        (próxima vez que
                      usuário acessa app)
                            ↓
     ┌──────────────────────────────────┐
     │  Usuário abre página Ranking     │
     └─────────────┬────────────────────┘
                   ↓
     ┌──────────────────────────────────────┐
     │  useEffect dispara checkPromotion    │
     │  Status()                            │
     └─────────────┬────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │ Verifica no Supabase:│
        │                      │
        │ promotion_timestamp? │
        │ promotion_seen=false?│
        └─────┬────┬───────────┘
              ↓    ↓
         SIM  NO   
          │    │
          ↓    └──→ (sem mudança)
     ┌─────────┐
     │Exibe    │
     │Promotion│
     │Modal ✨ │
     └────┬────┘
          ↓
     ┌──────────────────────┐
     │  Animação de entrada │
     │  - Scale from 0.5    │
     │  - Fade in           │
     │  - Spring physics    │
     └────────┬─────────────┘
              ↓
     ┌──────────────────────┐
     │  Usuário clica       │
     │  "Continuar"         │
     └────────┬─────────────┘
              ↓
     ┌──────────────────────┐
     │ mark_promotion_seen()│
     │ promotion_seen=true  │
     │ Modal fecha          │
     └──────────────────────┘


         MESMO PADRÃO PARA REGRESSÃO
          (mas com cores vermelhas)
```

---

## 🏛️ Estrutura das Ligas

```
                         CAMPEONATO (👑)
                              ↑
                         (Top 5% promove)
                              ↑
        DIAMANTE (💎) ← Regressão (Bottom 50%)
             ↑    ↓
        (Top 5%)  (Bottom 50%)
             ↑    ↓
   OURO (⭐) ← Regressão (Bottom 30%)
        ↑    ↓
   (Top 10%) (Bottom 30%)
        ↑    ↓
PRATA (🥈) ← Regressão (Bottom 20%)
    ↑    ↓
(Top 20%) (Bottom 20%)
    ↑    ↓
BRONZE (🛡️) → Promoção (Top 30%)

Total de usuários por liga: VARIÁVEL
Zona de promoção: TOP X%
Zona de regressão: BOTTOM Y%
Zona neutra: MEIO (sem mudança)
```

---

## 📈 Exemplo Real: Liga Prata com 100 usuários

```
Prata (100 jogadores)
├─ Promoção: Top 20 (20%)
│  └─ Vão para OURO ✅
├─ Neutra: 60 (60%)
│  └─ Ficam em PRATA
└─ Regressão: 20 (20%)
   └─ Vão para BRONZE ⬇️
```

---

## 🎨 Modal de Promoção - Análise Visual

```
╔════════════════════════════════════╗
║        PARABÉNS!                   ║
║     ✨✨✨ SPARKLES ✨✨✨         ║
║                                    ║
║      🛡️     ⬆️      🥈             ║
║    BRONZE         PRATA            ║
║                                    ║
║  Você foi promovido!               ║
║  Bem-vindo à liga Prata            ║
║                                    ║
║  Continue com ótimo desempenho!    ║
║                                    ║
║  ╔══════════════════════════════╗ ║
║  ║  [CONTINUAR BUTTON]          ║ ║
║  ║  (Gradient Bronze→Prata)     ║ ║
║  ╚══════════════════════════════╝ ║
║                                    ║
║           🏆 (girado)              ║
╚════════════════════════════════════╝

Animações:
- Background glow: Pulse infinito
- Sparkles: Float up/down
- League badge: Scale 0→1 com spring
- Arrow: Fade + slide
- Button: Hover scale 1.05
```

---

## 🎨 Modal de Regressão - Análise Visual

```
╔════════════════════════════════════╗
║         REBAIXO ⚠️                 ║
║     (cores em vermelho/laranja)    ║
║                                    ║
║     🥈      ⬇️     🛡️              ║
║   PRATA           BRONZE           ║
║                                    ║
║  Sua performance caiu              ║
║                                    ║
║  ┌──────────────────────────────┐  ║
║  │ Você caiu para liga Bronze.  │  ║
║  │ Melhore para retornar!       │  ║
║  └──────────────────────────────┘  ║
║                                    ║
║  Não desista! Você pode voltar!    ║
║                                    ║
║  ╔══════════════════════════════╗ ║
║  ║  [ENTENDI BUTTON]            ║ ║
║  ║  (Gradient red)              ║ ║
║  ╚══════════════════════════════╝ ║
║                                    ║
║           🛡️ (sacudindo)           ║
╚════════════════════════════════════╝

Animações:
- Background glow: Pulse com cores quentes
- Alert icon: Scale pulsante
- Warning box: Border animation
- Shield: Shake side-to-side
- Message: Appear gradually
```

---

## 🗄️ Estrutura de Dados

```
profiles table:
┌─────────────┬─────────────┬──────────┐
│ id (uuid)   │ display_name│ score    │
├─────────────┼─────────────┼──────────┤
│ abc123...   │ João        │ 15000    │
└─────────────┴─────────────┴──────────┘
         │
         ├─ league: 'Prata'  ← NEW
         ├─ previous_league: 'Bronze'  ← NEW
         ├─ promotion_timestamp: 2024-03-02T20:00:00Z  ← NEW
         ├─ demotion_timestamp: null  ← NEW
         ├─ last_season_rank: 5  ← NEW
         ├─ promotion_seen: false  ← NEW
         └─ demotion_seen: true  ← NEW


season_history table:
┌──────────┬────────────┬─────────────┬────────┐
│ id       │ user_id    │ season_week │ league │
├──────────┼────────────┼─────────────┼────────┤
│ hist01   │ abc123...  │ 10          │ before │
│ hist02   │ abc123...  │ 11          │ after  │
└──────────┴────────────┴─────────────┴────────┘
         │
         ├─ league_before: 'Bronze'
         ├─ league_after: 'Prata'
         ├─ promoted: true
         ├─ demoted: false
         ├─ score: 15000
         └─ rank_position: 15
```

---

## ⏱️ Cronograma de Execução

```
SEMANA 1
├─ Seg-Sex: Usuário joga e ganha pontos
├─ Sábado: 00:00 - 19:59 UTC (último dia)
└─ Domingo 20:00 UTC: ⚡ CRON EXECUTA ⚡

PROCESSAMENTO (em segundos):
├─ Liga Bronze: 0.5s (ordena, calcula)
├─ Liga Prata: 0.5s
├─ Liga Ouro: 0.3s (menos usuários)
├─ Liga Diamante: 0.2s
└─ Liga Campeonato: 0.1s
   ━━━━━━━━━━━━━━━━━
   TOTAL: ~1.6 segundos

RESULTADO:
- Profiles atualizadas (promotion_seen = false)
- Season_history registrada
- Pronto para usuários verem na segunda

SEMANA 2
├─ Seg-Dom: Usuário acessa app
├─ Quando entra em Ranking → MODAL APARECE ✨
└─ Flag promotion_seen = true (nunca mais aparece)
```

---

## 🔐 Segurança - Fluxo de Autenticação

```
Vercel Cron Job
     │
     ├─ Envia: POST /api/promotions
     │
     ├─ Headers inclusos:
     │  Authorization: Bearer CRON_SECRET (env variable)
     │
     └─ Endpoint verifica:
        if (req.headers.authorization !== `Bearer ${CRON_SECRET}`)
           return 401 Unauthorized
        
        OK → Processa promotions
        ERRO → Retorna erro 401
```

---

## 🎯 Regra de Promoção - Exemplos

```
BRONZE (300 jogadores):
├─ Top 30% = 90 jogadores
├─ Estes 90 → PROMOÇÃO PRATA ✅
├─ Restantes 210 → PERMANECEM BRONZE
└─ Ninguém cai (não há liga abaixo)


PRATA (250 jogadores):
├─ Top 20% = 50 jogadores
│  └─ Vão → OURO ✅
├─ Médio 60% = 150 jogadores
│  └─ Ficam → PRATA (neutra)
└─ Bottom 20% = 50 jogadores
   └─ Caem → BRONZE ⬇️


DIAMANTE (80 jogadores):
├─ Top 5% = 4 jogadores
│  └─ Vão → CAMPEONATO ✅
├─ Médio 45% = 36 jogadores
│  └─ Ficam → DIAMANTE
└─ Bottom 50% = 40 jogadores
   └─ Caem → OURO ⬇️


CAMPEONATO (20 jogadores):
├─ Top 30% = 6 jogadores
│  └─ Ficam → CAMPEONATO (campeões!)
└─ Bottom 70% = 14 jogadores
   └─ Caem → DIAMANTE ⬇️
```

---

## 📱 Interface do LeaguePromotionTester

```
┌─────────────────────────────┐
│ 🧪 League System Tester     │
├─────────────────────────────┤
│                             │
│ De:   [Dropdown: Bronze ▼] │
│ Para: [Dropdown: Prata  ▼] │
│                             │
│ [⬆️ Testar Promoção]       │
│ [⬇️ Testar Regressão]      │
│ [⚙️ Testar Cron]           │
│                             │
│ ✅ Promoção simulada!      │
│    Recarregue ranking.      │
│                             │
└─────────────────────────────┘
(Canto inferior direito, z-50)
```

---

## 🔄 Ciclo Completo (Semana)

```
SEGUNDA        TERÇA       QUARTA       QUINTA      SEXTA
Joga
Ganha 500pts
                           Joga
                           Ganha 300pts
                                                    Joga
                                                    Ganha 800pts
                                                    
SÁBADO                 DOMINGO 20h
Dia final              🎯 PROCESSAMENTO
Score congelado        ├─ Ordena por score
├─ Bronze = 15k        ├─ Calcula top 30%
├─ Prata = 18k         ├─ Promove para Prata
├─ Ouro = 42k          ├─ Insere em histórico
└─ etc...              └─ Marca flags

SEGUNDA (próxima semana)
Usuário acessa Ranking
        ↓
Modal aparece! ✨
"Parabéns! Você foi promovido!"
        ↓
Fecha modal
promotion_seen = true
Modal não aparece mais
        ↓
Nova temporada começa
```

---

## 📊 Visualização: Distribuição de Usuários

```
BRONZE  ████████████████████ (30% em promoção)
PRATA   ██████████████░░░░░░ (Mistura de estados)
OURO    ██████░░░░░░░░░░░░░░ (Élite)
DIAMANTE █████░░░░░░░░░░░░░░░ (Ultra-élite)
CAMPEONATO ██░░░░░░░░░░░░░░░░░ (Top 1%)

█ = Usuários que jogam naquela liga
░ = Zona de promoção/regressão/neutra
```

---

**Visualmente**: O sistema é um **carrossel cíclico** onde usuários competem pela liga seguinte, criando motivação constante! 🎯
