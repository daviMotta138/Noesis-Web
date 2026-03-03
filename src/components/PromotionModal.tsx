import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowUp, Sparkles } from 'lucide-react';
// Star icon and state for displayProgress removed because they were unused
// no need to import useState/useEffect either

const LEAGUE_COLORS = {
  Bronze: '#CD7F32',
  Prata: '#C0C0C0',
  Ouro: '#FFD700',
  Diamante: '#00FFFF',
  Campeonato: '#FF00FF'
};

const LEAGUE_EMOJIS = {
  Bronze: '🛡️',
  Prata: '🥈',
  Ouro: '⭐',
  Diamante: '💎',
  Campeonato: '👑'
};

interface PromotionModalProps {
  isOpen: boolean;
  fromLeague: string;
  toLeague: string;
  onClose: () => void;
}

export function PromotionModal({ isOpen, fromLeague, toLeague, onClose }: PromotionModalProps) {

  const fromColor = LEAGUE_COLORS[fromLeague as keyof typeof LEAGUE_COLORS];
  const toColor = LEAGUE_COLORS[toLeague as keyof typeof LEAGUE_COLORS];
  const fromEmoji = LEAGUE_EMOJIS[fromLeague as keyof typeof LEAGUE_EMOJIS];
  const toEmoji = LEAGUE_EMOJIS[toLeague as keyof typeof LEAGUE_EMOJIS];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.5, y: 100, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.5, y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 100 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm"
          >
            {/* Background glow effect */}
            <div className="absolute inset-0 rounded-3xl blur-2xl opacity-50"
              style={{
                background: `linear-gradient(135deg, ${fromColor}, ${toColor})`,
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}
            />

            {/* Main card */}
            <div className="relative rounded-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                border: `2px solid ${toColor}`,
                boxShadow: `0 0 30px ${toColor}40, 0 0 60px ${toColor}20`
              }}
            >
              {/* Top accent bar */}
              <div className="h-1 w-full"
                style={{
                  background: `linear-gradient(90deg, ${fromColor}, ${toColor})`
                }}
              />

              <div className="p-8 text-center">
                {/* Celebration animation */}
                <motion.div
                  animate={{ y: [-5, 5, -5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mb-6"
                >
                  <Sparkles size={40} style={{ color: toColor, margin: '0 auto' }} />
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl font-black mb-2"
                  style={{ color: toColor }}
                >
                  PARABÉNS!
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm mb-8"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Você foi promovido!
                </motion.p>

                {/* League transition visualization */}
                <div className="flex items-center justify-center gap-4 mb-8">
                  {/* From League */}
                  <motion.div
                    initial={{ scale: 1, opacity: 1 }}
                    animate={{ scale: 0.7, opacity: 0.5 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col items-center"
                  >
                    <div className="text-5xl mb-2">{fromEmoji}</div>
                    <span className="text-xs font-bold" style={{ color: fromColor }}>
                      {fromLeague}
                    </span>
                  </motion.div>

                  {/* Arrow */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                  >
                    <ArrowUp size={32} style={{ color: '#4ADE80' }} />
                  </motion.div>

                  {/* To League */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.6, type: 'spring', stiffness: 100 }}
                    className="flex flex-col items-center"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.6, delay: 0.7 }}
                      className="text-5xl mb-2"
                    >
                      {toEmoji}
                    </motion.div>
                    <span className="text-xs font-bold" style={{ color: toColor }}>
                      {toLeague}
                    </span>
                  </motion.div>
                </div>

                {/* Message */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="text-sm mb-8 leading-relaxed"
                  style={{ color: 'var(--color-text)' }}
                >
                  Você alcançou a zona de promoção! Bem-vindo à liga <strong>{toLeague}</strong>. Continue com o ótimo desempenho!
                </motion.p>

                {/* Progress bar */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.9, duration: 0.8 }}
                  className="h-1 mb-8 rounded-full origin-left"
                  style={{
                    background: `linear-gradient(90deg, ${fromColor}, ${toColor})`
                  }}
                />

                {/* Close button */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="w-full py-3 rounded-xl font-bold uppercase tracking-widest transition-all text-sm"
                  style={{
                    background: `linear-gradient(135deg, ${fromColor}, ${toColor})`,
                    color: '#000',
                    boxShadow: `0 0 20px ${toColor}40`
                  }}
                >
                  Continuar
                </motion.button>

                {/* Trophy decoration */}
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute top-4 right-4 opacity-20"
                >
                  <Trophy size={32} style={{ color: toColor }} />
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
