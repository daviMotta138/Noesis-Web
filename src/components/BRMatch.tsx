// src/components/BRMatch.tsx
// Battle Royale game board: card grid, turn mechanics, scoring

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { useMatchStore } from '../store/useMatchStore';

interface BRMatchProps {
  matchId: string;
  onMatchEnd: () => void;
}

interface FlipState {
  flipped: Set<number>;
  selecting: boolean;
  result?: 'match' | 'no_match';
  message?: string;
}

export default function BRMatch({ matchId, onMatchEnd }: BRMatchProps) {
  const { user } = useGameStore();
  const { match, players, cards, getMatchState, reportPair, subscribeToMatch, error: storeError } = useMatchStore();

  const [flipState, setFlipState] = useState<FlipState>({
    flipped: new Set(),
    selecting: false
  });
  const [error, setError] = useState<string | null>(null);

  // Initialize match state and subscriptions
  useEffect(() => {
    if (!user?.id) return;

    const init = async () => {
      try {
        await getMatchState(matchId, user.id);
      } catch (e: any) {
        setError(e.message);
      }
    };

    init();

    // Subscribe to Realtime updates
    const unsub = subscribeToMatch(matchId, user.id);

    // Poll for updates every 2 seconds (fallback for Realtime)
    const pollInterval = setInterval(() => {
      getMatchState(matchId, user.id).catch(console.error);
    }, 2000);

    return () => {
      clearInterval(pollInterval);
      unsub();
    };
  }, [matchId, user?.id]);

  const currentPlayer = players.find(p => p.is_current_turn);
  const isMyTurn = currentPlayer?.id === user?.id;
  const sortedPlayers = [...players].sort((a, b) => b.total_score - a.total_score);

  // Handle card flip
  const handleCardFlip = async (idx: number) => {
    if (!match || !user?.id || !isMyTurn || flipState.selecting) return;
    if (flipState.flipped.has(idx)) return; // Can't flip same card twice

    const newFlipped = new Set(flipState.flipped);
    newFlipped.add(idx);
    setFlipState({ ...flipState, flipped: newFlipped });

    // If 2 cards selected, report the pair
    if (newFlipped.size === 2) {
      const [idx1, idx2] = Array.from(newFlipped).sort((a, b) => a - b);
      setFlipState(prev => ({ ...prev, selecting: true }));

      try {
        const result = await reportPair(matchId, user.id, idx1, idx2);

        setFlipState(prev => ({
          ...prev,
          result: result.result,
          message: result.result === 'match' ? '✨ Match!' : '❌ No match'
        }));

        // Keep cards revealed for 1s if match, then reset
        setTimeout(() => {
          if (result.result === 'no_match') {
            setFlipState({
              flipped: new Set(),
              selecting: false
            });
          } else {
            // If match, keep revealed and refresh state
            setFlipState({
              flipped: new Set(),
              selecting: false
            });
            getMatchState(matchId, user.id).catch(console.error);
          }
        }, 1000);
      } catch (e: any) {
        setError(e.message);
        setFlipState({
          flipped: new Set(),
          selecting: false
        });
      }
    }
  };

  if (!match || !user?.id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-400">Loading match...</p>
      </div>
    );
  }

  if (match.status === 'finished') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-yellow-400 mb-4">🏆 Match Over!</h1>
          <p className="text-slate-400 mb-8">Final Rankings:</p>

          <div className="space-y-2 mb-8">
            {sortedPlayers.slice(0, 3).map((p, idx) => (
              <div key={p.id} className="text-lg">
                <span className="text-yellow-400">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} {p.display_name}
                </span>
                <span className="text-slate-300 ml-4">{p.total_score} pts</span>
              </div>
            ))}
          </div>

          <button
            onClick={onMatchEnd}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Back to Lobby
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Error Alert */}
      <AnimatePresence>
        {(error || storeError) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-4 left-4 right-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-sm"
          >
            {error || storeError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header + Score board */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="lg:col-span-3">
          {/* Turn indicator */}
          <motion.div
            initial={{ y: -10 }}
            animate={{ y: 0 }}
            className="p-4 rounded-lg bg-gradient-to-r from-slate-700 to-slate-600 border border-slate-500 mb-4"
          >
            <p className="text-slate-400 text-sm mb-2">Current Turn:</p>
            <p className="text-xl font-bold text-white flex items-center gap-2">
              {isMyTurn ? '👉' : '👀'} {currentPlayer?.display_name || 'Unknown'}
              {currentPlayer?.is_bot && ' 🤖'}
            </p>
            {isMyTurn && (
              <p className="text-blue-400 text-sm mt-2">It's your turn! Select 2 cards.</p>
            )}
          </motion.div>

          {/* Game board */}
          <div
            className="p-6 rounded-lg bg-slate-700/50 border border-slate-600"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${match.grid_cols}, minmax(0, 1fr))`,
              gap: '0.75rem'
            }}
          >
            {cards.map((card, idx) => (
              <motion.button
                key={idx}
                onClick={() => handleCardFlip(idx)}
                disabled={!isMyTurn || flipState.selecting || card.revealed}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.02 }}
                className="aspect-square rounded-lg font-bold text-lg transition-all disabled:cursor-not-allowed"
                style={{
                  minHeight: '60px'
                }}
              >
                <AnimatePresence mode="wait">
                  {flipState.flipped.has(idx) || card.revealed ? (
                    <motion.div
                      key="back"
                      initial={{ rotateY: -90 }}
                      animate={{ rotateY: 0 }}
                      exit={{ rotateY: -90 }}
                      className="w-full h-full flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg"
                    >
                      {/* Card is revealed, but we don't show the value (server-side validation) */}
                      ✓
                    </motion.div>
                  ) : (
                    <motion.div
                      key="front"
                      initial={{ rotateY: 90 }}
                      animate={{ rotateY: 0 }}
                      exit={{ rotateY: 90 }}
                      className="w-full h-full flex items-center justify-center rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 text-slate-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/20 transition-shadow"
                    >
                      {idx + 1}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </div>

          {/* Pair result feedback */}
          <AnimatePresence>
            {flipState.message && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-4 p-3 rounded-lg text-center font-bold text-lg ${
                  flipState.result === 'match'
                    ? 'bg-green-900/30 border border-green-500/50 text-green-300'
                    : 'bg-red-900/30 border border-red-500/50 text-red-300'
                }`}
              >
                {flipState.message}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right sidebar: Rankings */}
        <div className="p-4 rounded-lg bg-slate-700/50 border border-slate-600 h-fit sticky top-4">
          <h3 className="text-white font-bold mb-4">📊 Rankings</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sortedPlayers.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ x: 10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-2 rounded text-sm border transition-colors ${
                  p.id === user.id
                    ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                    : p.is_current_turn
                    ? 'bg-yellow-600/20 border-yellow-500/50 text-yellow-200'
                    : 'bg-slate-600/30 border-slate-500 text-slate-300'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold">
                    #{idx + 1} {p.display_name}
                    {p.is_bot && ' 🤖'}
                  </span>
                </div>
                <div className="text-xs mt-1">
                  <span className="block">Score: {p.total_score}</span>
                  <span className="block text-slate-400">
                    Hits: {p.consecutive_hits}x | Errors: {p.errors}
                  </span>
                </div>
                {p.status === 'eliminated' && (
                  <span className="text-red-400 text-xs mt-1 block">❌ Eliminated</span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Game info footer */}
      <div className="max-w-6xl mx-auto text-center text-slate-400 text-sm">
        <p>Round {match.round_number} • Cards remaining: {match.cards_remaining}</p>
      </div>
    </div>
  );
}
