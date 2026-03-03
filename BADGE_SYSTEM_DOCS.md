# 🏆 Sistema de Broches de Posição - Documentação

## 📌 Visão Geral

Um sistema de recompensa visual que concede **broches (badges)** aos usuários quando atingem posições específicas ou marcos de sucesso. Esses broches ficam expostos no perfil do usuário como conquistas.

---

## 🎯 Como Funciona

### Quando os Broches são Concedidos?

1. **Ao Ser Promovido** 
   - Qualquer promoção concede o broche "Master Promoter"
   
2. **Ao Alcançar Posições no Campeonato**
   - 1º lugar → "Campeão Supremo" 🥇 + "Vencedor da Season" 👑
   - 2º lugar → "Vice-Campeão" 🥈
   - 3º lugar → "Bronze Honroso" 🥉
   - Top 5 → "Dominador Absoluto" 💎
   - Top 10 → "Elite Domadora" ⭐

3. **Marcos Especiais** (implementação futura)
   - 5+ promoções na mesma season → "Escalador Mestre" 📈
   - 30+ dias de streak → "Mestre do Streak" 🔥
   - Bronze → Campeonato em uma season → "Guerreiro da Escalada" ⚔️

---

## 🎨 Tipos de Broches

| Broche | Emoji | Raridade | Condição |
|--------|-------|----------|----------|
| Campeão Supremo | 🥇 | Legendary | 1º lugar em Campeonato |
| Vice-Campeão | 🥈 | Epic | 2º lugar em Campeonato |
| Bronze Honroso | 🥉 | Epic | 3º lugar em Campeonato |
| Elite Domadora | ⭐ | Rare | Top 10 em Campeonato |
| Dominador Absoluto | 💎 | Legendary | Top 5 em Campeonato |
| Escalador Mestre | 📈 | Epic | 5+ promoções em season |
| Vencedor da Season | 👑 | Legendary | Terminar season em 1º |
| Mestre do Streak | 🔥 | Rare | 30+ dias de streak |
| Guerreiro da Escalada | ⚔️ | Epic | Bronze → Campeonato |

---

## 📊 Raridade dos Broches

```
LEGENDARY (👑) - Mais raro e valioso
    ├─ Campeão Supremo
    ├─ Dominador Absoluto
    ├─ Vencedor da Season
    └─ Muito difícil de obter

EPIC (🎭) - Raro
    ├─ Vice-Campeão
    ├─ Bronze Honroso
    ├─ Escalador Mestre
    └─ Guerreiro da Escalada
    └─ Desafiador

RARE (🌟) - Pouco comum
    ├─ Elite Domadora
    └─ Mestre do Streak
    └─ Moderadamente desafiador

COMMON (⚪) - Comum
    ├─ Master Promoter
    └─ Mais fácil de obter
```

---

## 🎛️ Configuração

### 1. Executar Migrations SQL

```sql
-- Abrir Supabase SQL Editor
-- Colar conteúdo de supabase/badge_system.sql
-- Clique RUN
```

Este arquivo cria:
- Tabela `position_badges` (tipos de broches)
- Tabela `user_badges` (broches conquistados)
- Funções para concessão e listagem
- Dados padrão (9 broches)

### 2. Campos Adicionados ao Profile

```typescript
interface Profile {
  featured_badge?: string;      // Broche em destaque
  badge_count?: number;         // Total de broches
}
```

---

## 💻 Componentes

### BadgeDisplay.tsx

Componente React para exibir broches com 3 variantes:

#### Variante `grid` (Padrão - Perfil)
```tsx
<BadgeDisplay 
  userId={user.id}
  showTitle={true}
  maxDisplay={12}
  variant="grid"
/>
```
Exibe broches em grade 3-6 colunas com tooltips ao passar mouse.

#### Variante `carousel` (Mobile)
```tsx
<BadgeDisplay 
  userId={user.id}
  variant="carousel"
/>
```
Exibe broches em carrossel horizontal scrollável.

#### Variante `showcase` (Destaque)
```tsx
<BadgeDisplay 
  userId={user.id}
  variant="showcase"
/>
```
Exibe broche mais recente/raro em grande tamanho + galeria dos demais.

### Props

```typescript
interface BadgeDisplayProps {
  userId: string;           // UUID do usuário
  showTitle?: boolean;      // Mostrar título "Broches de Conquista"
  maxDisplay?: number;      // Máximo de broches a mostrar (padrão: 9)
  variant?: 'grid' | 'carousel' | 'showcase';  // Layout (padrão: grid)
}
```

---

## 🔄 Fluxo de Concessão

```
Domingo 20h UTC
    ↓
process_league_promotions() executa
    ↓
Para cada usuário que foi promovido:
    ├─ Concede "Master Promoter"
    └─ Se em Campeonato:
       ├─ 1º lugar → "Campeão Supremo" + "Vencedor"
       ├─ 2º lugar → "Vice-Campeão"
       ├─ 3º lugar → "Bronze Honroso"
       ├─ Top 5 → "Dominador Absoluto"
       └─ Top 10 → "Elite Domadora"
    ↓
Inserir em user_badges
    ↓
Contar total em badge_count
    ↓
Segunda-feira+
    ↓
Usuário acessa Perfil
    ↓
BadgeDisplay carrega via RPC
    ↓
Broches aparecem com animações
```

---

## 📱 Integração no Perfil

O componente `BadgeDisplay` foi integrado em `src/pages/Profile.tsx`:

```tsx
import { BadgeDisplay } from '../components/BadgeDisplay';

export default function ProfilePage() {
  const { user } = useGameStore();
  
  return (
    <div>
      {/* ... outros conteúdos ... */}
      
      {/* Seção de Broches */}
      {user?.id && (
        <BadgeDisplay 
          userId={user.id}
          showTitle={true}
          maxDisplay={12}
          variant="grid"
        />
      )}
    </div>
  );
}
```

---

## 🎨 Customização

### Adicionar Novo Broche

1. **No SQL** (`badge_system.sql`):
```sql
INSERT INTO position_badges (
  badge_type, name, description, icon_emoji, 
  color, rarity, unlock_condition
) VALUES (
  'novo_broche',
  'Nome do Broche',
  'Descrição completa',
  '🎭',
  '#FF00FF',
  'epic',
  'Descrição da condição'
);
```

2. **Lógica de Concessão**:
```sql
-- Em process_league_promotions() ou função customizada
IF (condição) THEN
  PERFORM award_position_badge(v_user_rec.id, 'novo_broche');
END IF;
```

### Alterar Cores de Raridade

Em `BadgeDisplay.tsx`:
```typescript
const RARITY_COLORS = {
  common: 'sua_cor_aqui',
  rare: '#4ADE80',
  epic: '#00FFFF',
  legendary: '#FF00FF'
};
```

### Modificar Emojis

```sql
UPDATE position_badges
SET icon_emoji = '🆕'
WHERE badge_type = 'seu_broche';
```

---

## 🧪 Testar Localmente

### Simular Concessão de Broche

```sql
-- No Supabase SQL Editor
SELECT award_position_badge(
  'seu_user_uuid_aqui',
  'champion_rank1',
  1,  -- posição
  extract(week from now())::integer,
  extract(year from now())::integer
);

-- Verificar concessão
SELECT * FROM user_badges 
WHERE user_id = 'seu_user_uuid_aqui';
```

### Verificar Broches do Usuário

```sql
SELECT * FROM get_user_badges('seu_user_uuid_aqui');
```

### Limpar Broches (desenvolvimento)

```sql
DELETE FROM user_badges 
WHERE user_id = 'seu_user_uuid_aqui';
```

---

## 🔐 Segurança (RLS Policies)

```sql
-- Qualquer pessoa pode VER badges públicos
CREATE POLICY "user_badges_select_public" ON user_badges 
  FOR SELECT USING (true);

-- Apenas usuário pode atualizar seus próprios badges
CREATE POLICY "user_badges_update_own" ON user_badges 
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role (cron job) pode inserir
CREATE POLICY "user_badges_insert_service" ON user_badges 
  FOR INSERT WITH CHECK (true);
```

---

## 📊 Estatísticas & Queries

### Broches Mais Comuns
```sql
SELECT badge_type, COUNT(*) as total
FROM user_badges
GROUP BY badge_type
ORDER BY total DESC;
```

### Usuários com Mais Broches
```sql
SELECT p.display_name, COUNT(ub.id) as badge_count
FROM profiles p
LEFT JOIN user_badges ub ON p.id = ub.user_id
GROUP BY p.id
ORDER BY badge_count DESC
LIMIT 10;
```

### Broches por Raridade
```sql
SELECT pb.rarity, COUNT(ub.id) as total
FROM user_badges ub
JOIN position_badges pb ON ub.badge_type = pb.badge_type
GROUP BY pb.rarity
ORDER BY CASE 
  WHEN pb.rarity = 'legendary' THEN 1
  WHEN pb.rarity = 'epic' THEN 2
  WHEN pb.rarity = 'rare' THEN 3
  ELSE 4
END;
```

---

## 🐛 Troubleshooting

### Broches não aparecem no perfil

**Problema**: BadgeDisplay mostra "Nenhum broche"

**Solução**:
```sql
-- 1. Verificar se tabelas existem
SELECT * FROM position_badges;
SELECT * FROM user_badges;

-- 2. Verificar se RPC function existe
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'get_user_badges';

-- 3. Verificar se usuário tem badges
SELECT * FROM user_badges WHERE user_id = 'uuid';
```

### Erro ao chamar `award_position_badge`

**Problema**: "Function does not exist"

**Solução**:
```sql
-- Verificar grant de permissão
GRANT EXECUTE ON FUNCTION award_position_badge(uuid, text, integer, integer, integer) 
TO authenticated, service_role;
```

### Badges aparecem duplicados

**Problema**: Múltiplas cópias do mesmo broche

**Solução**:
```sql
-- Verificar e remover duplicatas
DELETE FROM user_badges ub1
WHERE ub1.ctid < (
  SELECT min(ctid) FROM user_badges ub2
  WHERE ub1.user_id = ub2.user_id 
    AND ub1.badge_type = ub2.badge_type
);
```

---

## 🚀 Próximas Implementações

1. **Filtro de Raridade**: Mostrar apenas Legend, Epic, etc.
2. **Marketplace de Badges**: Trocar ou vender broches
3. **Notificação de Novo Broche**: Alert quando ganha broche
4. **Histórico de Broches**: Mostrar quando ganhou cada um
5. **Badges Customizáveis**: Escolher qual broche mostrar em destaque
6. **Conquistas Sociais**: Comparar broches com amigos
7. **Weekly Challenges**: Broches temporários por evento
8. **Leaderboard de Colecionadores**: Quem tem mais broches

---

## 📚 Arquivos Relacionados

- `supabase/badge_system.sql` - Migrations e funções SQL
- `src/components/BadgeDisplay.tsx` - Componente React
- `src/pages/Profile.tsx` - Integração no perfil
- `supabase/league_promotion_system.sql` - Concessão automática

---

## 🎓 Exemplos de Uso

### Mostrar apenas broches Legendary
```tsx
<BadgeDisplay userId={user.id} maxDisplay={99} />
{/* Filtrar manualmente após renderização */}
```

### Showcase de melhor broche
```tsx
<BadgeDisplay userId={user.id} variant="showcase" />
```

### Mini widget no navbar
```tsx
<BadgeDisplay userId={user.id} maxDisplay={3} variant="carousel" />
```

---

**Status**: ✅ Implementado e Integrado

**Última Atualização**: 2 de Março de 2026
