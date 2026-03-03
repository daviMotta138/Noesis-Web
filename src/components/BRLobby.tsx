// src/components/BRLobby.tsx
// Battle Royale lobby: shows available matches, join/create functionality

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { useMatchStore } from '../store/useMatchStore';

interface BRLobbyProps {
  onMatchStart: (matchId: string) => void;
}

export default function BRLobby({ onMatchStart }: BRLobbyProps) {
  const { user } = useGameStore();
  const { match, players, startMatch, getMatchState, error: storeError } = useMatchStore();

  const [queueInfo, setQueueInfo] = useState<{match_id:string|null;queue_count:number;needed:number} | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Join matchmaking queue (automatic)
  const joinQueue = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await useMatchStore.getState().enqueueQueue(
        user.id,
        user.user_metadata?.display_name || 'Player'
      );
      setQueueInfo(result);
      if (result?.match_id) {
        onMatchStart(result.match_id);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch matches on component mount
  useEffect(() => {
    joinQueue();
  }, []);


  // Handle start match (host only)
  const handleStartMatch = async () => {
    if (!match?.id) return;
    setLoading(true);
    try {
      await startMatch(match.id);
      await getMatchState(match.id, user?.id || '');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Leave queue (if waiting)
  const handleLeaveQueue = async () => {
    if (!user?.id) return;
    try {
      await useMatchStore.getState().leaveQueue(user.id);
      setQueueInfo(null);
    } catch (e: any) {
      setError(e.message);
    }
  };
  if (!user?.id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-gray-400">Please log in to play</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2">🏆 Battle Royale</h1>
        <p className="text-slate-400">Last pair standing wins</p>
      </motion.div>

      {/* Error Alert */}
      <AnimatePresence>
        {(error || storeError) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-sm"
          >
            {error || storeError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue view if not yet matched */}
      {!match && queueInfo && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <p className="text-center text-white mb-4">
            Procurando jogadores... ({queueInfo.queue_count} esperando, faltam {queueInfo.needed})
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={handleLeaveQueue}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Sair da fila
            </button>
            <button
              onClick={() => {
                /* copy link */
                navigator.clipboard.writeText(window.location.href);
                alert('Link copiado! Compartilhe com seus amigos.');
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Convidar Amigos
            </button>
          </div>
        </motion.div>
      )}


      {/* Lobby (waiting for players) */}
      {match && match.status === 'waiting' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-2xl mx-auto"
        >
          <div className="p-6 rounded-lg bg-slate-700/50 border border-slate-600">
            <h2 className="text-2xl font-bold text-white mb-2">Room Lobby</h2>
            <p className="text-slate-400 text-sm mb-6">
              Waiting for players... ({players.filter(p => p.status !== 'left').length}/{match.max_players})
            </p>

            {/* Player list */}
            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
              {players.map((p, idx) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-3 rounded bg-slate-600/50 flex justify-between items-center border border-slate-500"
                >
                  <div className="flex items-center gap-2">
                    <span>{p.is_bot ? '🤖' : '👤'}</span>
                    <span>{p.display_name}</span>
                  </div>
                  {p.id === match.host_id && <span className="text-yellow-400 text-xs">HOST</span>}
                </motion.div>
              ))}
            </div>

            {/* Start button (host only) */}
            {user?.id === match.host_id && players.length >= 2 && (
              <button
                onClick={handleStartMatch}
                disabled={loading}
                className="w-full px-4 py-3 rounded bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-lg transition"
              >
                {loading ? '⏳ Starting...' : '▶️ Start Game'}
              </button>
            )}

            {players.length < 2 && (
              <p className="text-center text-slate-400 text-sm">Need at least 2 players to start</p>
            )}

            {user?.id !== match.host_id && (
              <p className="text-center text-slate-400 text-sm">Host will start the match when ready</p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
