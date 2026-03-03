// src/components/BRLobby.tsx
// Battle Royale lobby: shows available matches, join/create functionality

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { useMatchStore } from '../store/useMatchStore';
import { supabase } from '../lib/supabase';

interface BRLobbyProps {
  onMatchStart: (matchId: string) => void;
}

export default function BRLobby({ onMatchStart }: BRLobbyProps) {
  const { user } = useGameStore();
  const { match, players, createMatch, joinMatch, startMatch, getMatchState, error: storeError } = useMatchStore();

  const [view, setView] = useState<'browse' | 'create'>('browse');
  const [availableMatches, setAvailableMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    maxPlayers: '8',
    rows: '4',
    cols: '6'
  });

  // Fetch available matches (waiting status)
  const fetchMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('br_matches')
        .select(`
          id,
          host_id,
          max_players,
          grid_rows,
          grid_cols,
          created_at,
          br_players(count)
        `)
        .eq('status', 'waiting')
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;
      setAvailableMatches((data || []).map(m => ({
        ...m,
        player_count: m.br_players?.[0]?.count || 0
      })));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch matches on component mount
  useEffect(() => {
    fetchMatches();
  }, []);

  // Handle create match
  const handleCreateMatch = async () => {
    if (!user?.id) {
      setError('Must be logged in');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const matchId = await createMatch(
        user.id,
        parseInt(formData.maxPlayers),
        parseInt(formData.rows),
        parseInt(formData.cols)
      );
      // Auto-join as host
      await joinMatch(matchId, user.id, user.user_metadata?.display_name || 'Host');
      // Fetch match state and redirect
      await getMatchState(matchId, user.id);
      onMatchStart(matchId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle join match
  const handleJoinMatch = async (matchId: string) => {
    if (!user?.id) {
      setError('Must be logged in');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await joinMatch(matchId, user.id, user.user_metadata?.display_name || 'Player');
      // Fetch match state and redirect
      await getMatchState(matchId, user.id);
      onMatchStart(matchId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle start match (host only)
  const handleStartMatch = async () => {
    if (!match?.id) return;
    setLoading(true);
    try {
      await startMatch(match.id);
      // Fetch updated match state
      await getMatchState(match.id, user?.id || '');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
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

      {/* Browsing matches view */}
      {view === 'browse' && !match && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={fetchMatches}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => setView('create')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
            >
              ➕ Create Room
            </button>
          </div>

          {/* Available matches grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableMatches.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-slate-400 mb-4">No available matches</p>
                <button
                  onClick={() => setView('create')}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  Create the first room
                </button>
              </div>
            ) : (
              availableMatches.map((m, idx) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-4 rounded-lg bg-slate-700/50 border border-slate-600 hover:border-blue-500 transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-white font-semibold text-sm">Room #{m.id.slice(0, 8)}</p>
                      <p className="text-slate-400 text-xs mt-1">
                        Grid: {m.grid_rows}×{m.grid_cols}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-yellow-400 font-bold">
                        {m.player_count}/{m.max_players}
                      </p>
                      <p className="text-slate-400 text-xs">players</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoinMatch(m.id)}
                    disabled={loading}
                    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded transition"
                  >
                    Join
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* Create match view */}
      {view === 'create' && !match && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-md mx-auto"
        >
          <div className="p-6 rounded-lg bg-slate-700/50 border border-slate-600">
            <h2 className="text-xl font-bold text-white mb-4">Create Room</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">Max Players</label>
                <select
                  value={formData.maxPlayers}
                  onChange={(e) => setFormData({ ...formData, maxPlayers: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-slate-600 text-white border border-slate-500 focus:outline-none focus:border-blue-500"
                >
                  <option value="4">4 Players</option>
                  <option value="6">6 Players</option>
                  <option value="8">8 Players</option>
                  <option value="12">12 Players</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Rows</label>
                  <select
                    value={formData.rows}
                    onChange={(e) => setFormData({ ...formData, rows: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-slate-600 text-white border border-slate-500 focus:outline-none focus:border-blue-500"
                  >
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Cols</label>
                  <select
                    value={formData.cols}
                    onChange={(e) => setFormData({ ...formData, cols: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-slate-600 text-white border border-slate-500 focus:outline-none focus:border-blue-500"
                  >
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="7">7</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setView('browse')}
                  className="flex-1 px-4 py-2 rounded bg-slate-600 hover:bg-slate-700 text-white transition"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateMatch}
                  disabled={loading}
                  className="flex-1 px-4 py-2 rounded bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold transition"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
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
