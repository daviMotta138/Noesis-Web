import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Badge {
  badge_type: string;
  name: string;
  icon_emoji: string;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earned_at: string;
  position?: number;
  displayed: boolean;
}

interface BadgeDisplayProps {
  userId: string;
  showTitle?: boolean;
  maxDisplay?: number;
  variant?: 'grid' | 'carousel' | 'showcase';
}

const RARITY_COLORS = {
  common: 'rgba(200, 200, 200, 0.1)',
  rare: '#4ADE80',
  epic: '#00FFFF',
  legendary: '#FF00FF'
};

const RARITY_BORDERS = {
  common: '#808080',
  rare: '#4ADE80',
  epic: '#00FFFF',
  legendary: '#FF00FF'
};

export function BadgeDisplay({ userId, showTitle = true, maxDisplay = 9, variant = 'grid' }: BadgeDisplayProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);

  useEffect(() => {
    fetchUserBadges();
  }, [userId]);

  const fetchUserBadges = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_badges', { p_user_id: userId });

      if (!error && data) {
        // Ordenar por raridade (legendary primeiro) e depois por data
        const sorted = (data as Badge[]).sort((a, b) => {
          const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
          const rarityDiff = rarityOrder[a.rarity] - rarityOrder[b.rarity];
          if (rarityDiff !== 0) return rarityDiff;
          return new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime();
        });
        setBadges(sorted.slice(0, maxDisplay));
      }
    } catch (e) {
      console.error('Erro ao carregar broches:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="inline-block animate-spin">
            <Trophy size={24} style={{ color: 'var(--color-gold-dim)' }} />
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
            Carregando broches...
          </p>
        </div>
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className="text-center py-8">
        <Trophy size={32} style={{ color: 'var(--color-text-muted)', opacity: 0.5, margin: '0 auto' }} />
        <p className="text-sm mt-3" style={{ color: 'var(--color-text-muted)' }}>
          Nenhum broche obtido ainda. Melhore seu desempenho!
        </p>
      </div>
    );
  }

  const renderGrid = () => (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {badges.map((badge, idx) => (
        <motion.div
          key={`${badge.badge_type}-${badge.earned_at}`}
          initial={{ scale: 0, opacity: 0, rotate: -180 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ delay: idx * 0.05, type: 'spring', stiffness: 100 }}
          onHoverStart={() => setHoveredBadge(badge.badge_type)}
          onHoverEnd={() => setHoveredBadge(null)}
          className="relative group"
        >
          {/* Broche */}
          <div
            className="w-full aspect-square rounded-lg flex items-center justify-center cursor-pointer relative overflow-hidden transition-all"
            style={{
              background: RARITY_COLORS[badge.rarity],
              border: `2px solid ${RARITY_BORDERS[badge.rarity]}`,
              boxShadow: hoveredBadge === badge.badge_type
                ? `0 0 20px ${badge.color}, inset 0 0 10px ${badge.color}30`
                : 'none'
            }}
          >
            {/* Background glow on hover */}
            {hoveredBadge === badge.badge_type && (
              <motion.div
                layoutId="badgeGlow"
                className="absolute inset-0 rounded-lg blur-lg opacity-50"
                style={{ background: badge.color }}
              />
            )}

            {/* Emoji */}
            <motion.div
              animate={hoveredBadge === badge.badge_type ? { scale: 1.2, y: -2 } : { scale: 1, y: 0 }}
              className="text-3xl relative z-10"
            >
              {badge.icon_emoji}
            </motion.div>

            {/* Rarity indicator */}
            <div
              className="absolute top-1 right-1 w-2 h-2 rounded-full"
              style={{ background: RARITY_BORDERS[badge.rarity] }}
            />
          </div>

          {/* Tooltip */}
          {hoveredBadge === badge.badge_type && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 w-40"
            >
              <div
                className="rounded-lg p-3 text-xs text-center"
                style={{
                  background: 'var(--color-overlay-heavy)',
                  border: `1px solid ${badge.color}`,
                  boxShadow: `0 0 15px ${badge.color}40`
                }}
              >
                <div className="font-bold mb-1" style={{ color: badge.color }}>
                  {badge.name}
                </div>
                <div style={{ color: 'var(--color-text-muted)' }} className="text-[10px]">
                  {new Date(badge.earned_at).toLocaleDateString('pt-BR')}
                </div>
                {badge.position && (
                  <div style={{ color: badge.color }} className="text-[10px] mt-1 font-bold">
                    Posição #{badge.position}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  );

  const renderCarousel = () => (
    <div className="flex overflow-x-auto gap-4 pb-2" style={{ scrollbarWidth: 'thin' }}>
      {badges.map((badge, idx) => (
        <motion.div
          key={`${badge.badge_type}-${badge.earned_at}`}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="flex-shrink-0 relative group"
        >
          <div
            className="w-24 h-24 rounded-xl flex items-center justify-center cursor-pointer relative overflow-hidden transition-all flex-shrink-0"
            style={{
              background: RARITY_COLORS[badge.rarity],
              border: `3px solid ${RARITY_BORDERS[badge.rarity]}`,
              boxShadow: `0 0 15px ${RARITY_BORDERS[badge.rarity]}40`
            }}
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="text-5xl"
            >
              {badge.icon_emoji}
            </motion.div>
          </div>

          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
            <div
              className="rounded-lg p-3 text-xs text-center w-32"
              style={{
                background: 'var(--color-overlay-heavy)',
                border: `1px solid ${badge.color}`,
              }}
            >
              <div className="font-bold mb-1" style={{ color: badge.color }}>
                {badge.name}
              </div>
              <div style={{ color: 'var(--color-text-muted)' }} className="text-[10px]">
                {new Date(badge.earned_at).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderShowcase = () => (
    <div className="relative">
      {/* Featured badge (largest) */}
      {badges.length > 0 && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-8"
        >
          <div
            className="w-32 h-32 mx-auto rounded-2xl flex items-center justify-center cursor-pointer relative overflow-hidden"
            style={{
              background: RARITY_COLORS[badges[0].rarity],
              border: `4px solid ${RARITY_BORDERS[badges[0].rarity]}`,
              boxShadow: `0 0 40px ${RARITY_BORDERS[badges[0].rarity]}, inset 0 0 20px ${RARITY_BORDERS[badges[0].rarity]}20`
            }}
            onMouseEnter={() => setHoveredBadge(badges[0].badge_type)}
            onMouseLeave={() => setHoveredBadge(null)}
          >
            <motion.div
              animate={hoveredBadge === badges[0].badge_type ? { scale: 1.15, rotate: 10 } : { scale: 1, rotate: 0 }}
              className="text-8xl"
            >
              {badges[0].icon_emoji}
            </motion.div>

            {/* Sparkles animation */}
            {hoveredBadge === badges[0].badge_type && (
              <>
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    className="absolute text-2xl pointer-events-none"
                    style={{
                      left: `${25 + 50 * Math.cos((i * Math.PI) / 2)}%`,
                      top: `${25 + 50 * Math.sin((i * Math.PI) / 2)}%`
                    }}
                  >
                    ✨
                  </motion.div>
                ))}
              </>
            )}
          </div>

          {/* Featured badge info */}
          <div className="text-center mt-4">
            <h3 className="font-bold text-lg" style={{ color: RARITY_BORDERS[badges[0].rarity] }}>
              {badges[0].name}
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Obtido em {new Date(badges[0].earned_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </motion.div>
      )}

      {/* Other badges */}
      {badges.length > 1 && (
        <div className="mt-8">
          <p className="text-xs font-bold mb-3 text-center" style={{ color: 'var(--color-gold-dim)' }}>
            Outras Conquistas ({badges.length - 1})
          </p>
          <div className="grid grid-cols-4 gap-2">
            {badges.slice(1).map((badge, idx) => (
              <motion.div
                key={`${badge.badge_type}-${badge.earned_at}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: (idx + 1) * 0.05 }}
              >
                <div
                  className="w-full aspect-square rounded-lg flex items-center justify-center text-2xl cursor-pointer transition-all hover:scale-110"
                  style={{
                    background: RARITY_COLORS[badge.rarity],
                    border: `2px solid ${RARITY_BORDERS[badge.rarity]}`
                  }}
                  title={badge.name}
                >
                  {badge.icon_emoji}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full">
      {showTitle && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-6"
        >
          <Trophy size={24} style={{ color: 'var(--color-gold-dim)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Broches de Conquista
          </h2>
          {badges.length > 0 && (
            <span
              className="ml-auto text-sm font-bold px-3 py-1 rounded-full"
              style={{
                background: 'rgba(255, 215, 0, 0.1)',
                color: 'var(--color-gold-dim)'
              }}
            >
              {badges.length}
            </span>
          )}
        </motion.div>
      )}

      {variant === 'grid' && renderGrid()}
      {variant === 'carousel' && renderCarousel()}
      {variant === 'showcase' && renderShowcase()}
    </div>
  );
}
