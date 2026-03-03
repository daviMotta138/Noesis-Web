// src/components/BRLobby.tsx
// Battle Royale lobby: shows available matches, join/create functionality

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { useMatchStore } from '../store/useMatchStore';
import type { BRPlayer } from '../store/useMatchStore';
import { supabase } from '../lib/supabase';

// mirror of interface from Friends page, only fields we care about
interface FriendProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  friend_id: string;
  status: 'accepted' | 'pending_sent' | 'pending_received';
  friendshipId: string;
}

interface BRLobbyProps {
  onMatchStart: (matchId: string) => void;
}

export default function BRLobby({ onMatchStart }: BRLobbyProps) {
  const { user } = useGameStore();
  const { match, players, startMatch, getMatchState, error: storeError } = useMatchStore();

  const [queueInfo, setQueueInfo] = useState<{match_id:string|null;queue_count:number;needed:number} | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // friend invite states
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteCountdown, setInviteCountdown] = useState<number>(0);
  const [inviteTarget, setInviteTarget] = useState<FriendProfile | null>(null);

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
  // if an invite token is present in the URL we should join directly
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (token && user?.id) {
      // attempt to join by invite
      (async () => {
        try {
          const result: any = await useMatchStore.getState().joinByInvite(
            token,
            user.id,
            user.user_metadata?.display_name || 'Player'
          );
          const matchId = result.match_id as string;
          // fetch state for player just in case
          await useMatchStore.getState().getMatchState(matchId, user.id);
          onMatchStart(matchId);
          // clear query param so refresh doesn't try again
          window.history.replaceState(null, '', window.location.pathname);
        } catch (e: any) {
          setError(e.message || 'Falha ao entrar via convite');
          // fallback to queue after a moment
          setTimeout(() => joinQueue(), 1000);
        }
      })();
    } else {
      joinQueue();
    }
  }, [user?.id]);


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

  // fetch accepted friends for inviting
  const fetchFriends = async () => {
    if (!user?.id) return;
    try {
      const { data: fs } = await supabase
        .from('friendships')
        .select('id, user_id, friend_id, status')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
      if (!fs) return;
      const profileIds = fs.map((f: any) => (f.user_id === user.id ? f.friend_id : f.user_id));
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', profileIds);
      const combined: FriendProfile[] = fs.map((f: any) => {
        const otherId = f.user_id === user.id ? f.friend_id : f.user_id;
        const profile = profiles?.find((p: any) => p.id === otherId);
        return {
          ...(profile ?? { id: otherId, display_name: 'Desconhecido', avatar_url: null }),
          status: f.status === 'accepted' ? 'accepted' : 'pending_received',
          friend_id: otherId,
          friendshipId: f.id
        } as FriendProfile;
      });
      setFriends(combined.filter((f) => f.status === 'accepted'));
    } catch (err) {
      console.error('Erro ao buscar amigos', err);
    }
  };

  // invite a specific friend: create a match for host, generate link and start countdown
  const handleInviteFriend = async (friend: FriendProfile) => {
    if (!user?.id) return;
    try {
      // leave queue if currently queued
      if (queueInfo) {
        await useMatchStore.getState().leaveQueue(user.id);
        setQueueInfo(null);
      }

      const matchId = await useMatchStore.getState().createMatch(user.id);
      await useMatchStore.getState().joinMatch(matchId, user.id, user.user_metadata?.display_name || 'Player');
      // update local state with the new match
      await useMatchStore.getState().getMatchState(matchId, user.id);
      onMatchStart(matchId);

      // create invite token and link
      const token = await useMatchStore.getState().createInvite(matchId, 30);
      const link = `${window.location.origin}/battle-royale?invite=${token}`;
      setInviteLink(link);
      setInviteTarget(friend);
      setInviteCountdown(30);
      setInviteModalOpen(false);
    } catch (e: any) {
      setError(e.message);
    }
  };

  // countdown effect for invite flow
  useEffect(() => {
    if (inviteCountdown <= 0 || !inviteLink || !useMatchStore.getState().match) return;

    const id = setInterval(async () => {
      setInviteCountdown((c) => c - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [inviteCountdown, inviteLink]);

  // subscribe to match updates so lobby can refresh when players join
  useEffect(() => {
    const m = useMatchStore.getState().match;
    if (m && user?.id) {
      const unsub = useMatchStore.getState().subscribeToMatch(m.id, user.id);
      // also fetch initial state
      useMatchStore.getState().getMatchState(m.id, user.id).catch(console.error);
      return () => unsub();
    }
  }, [useMatchStore((s: any) => s.match?.id), user?.id]);

  // clear invite data when match starts or ends
  useEffect(() => {
    const m = useMatchStore.getState().match;
    if (m && m.status !== 'waiting') {
      setInviteLink(null);
      setInviteCountdown(0);
      setInviteTarget(null);
    }
  }, [useMatchStore((s: any) => s.match?.status)]);

  // once countdown hits zero, fill with bots and start automatically
  useEffect(() => {
    if (inviteCountdown === 0 && inviteLink) {
      const m = useMatchStore.getState().match;
      // avoid calling multiple times
      if (m && m.status === 'waiting') {
        useMatchStore.getState().fillWithBotsAndStart(m.id).catch(console.error);
      }
    }
  }, [inviteCountdown, inviteLink]);

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
          <div className="flex flex-col items-center gap-3">
            {inviteLink && (
              <div className="text-sm text-yellow-300 mb-2">
                Convite para {inviteTarget?.display_name} (ou copie o link abaixo)
                <br />Iniciando em {inviteCountdown}s...
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleLeaveQueue}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                Sair da fila
              </button>
              <button
                onClick={() => {
                  if (inviteLink) {
                    navigator.clipboard.writeText(inviteLink);
                    alert('Link copiado! Envie para seu amigo.');
                  } else {
                    // open friend selection modal
                    fetchFriends();
                    setInviteModalOpen(true);
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                {inviteLink ? 'Copiar convite' : 'Convidar Amigos'}
              </button>
            </div>
            {inviteLink && (
              <textarea
                readOnly
                className="w-full mt-2 p-2 bg-slate-800 text-xs text-white rounded"
                value={inviteLink}
              />
            )}
          </div>
        </motion.div>
      )}

      {/* invite modal */}
      <AnimatePresence>
        {inviteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-20"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-slate-700 p-6 rounded-lg max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-white mb-4">Escolha um amigo para convidar</h3>
              <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
                {friends.map((f) => (
                  <div key={f.id} className="flex justify-between items-center p-2 bg-slate-600 rounded">
                    <span className="text-white">{f.display_name}</span>
                    <button
                      onClick={() => handleInviteFriend(f)}
                      className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded"
                    >
                      Convidar
                    </button>
                  </div>
                ))}
                {friends.length === 0 && <p className="text-sm text-slate-300">Nenhum amigo disponível.</p>}
              </div>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded w-full"
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Lobby (waiting for players) */}
      {match && match.status === 'waiting' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-2xl mx-auto"
        >
          <div className="p-6 rounded-lg bg-slate-700/50 border border-slate-600">
            <h2 className="text-2xl font-bold text-white mb-2">Room Lobby</h2>
            {inviteLink && (
              <div className="mb-4 text-sm text-yellow-300">
                Convite enviado para {inviteTarget?.display_name || 'seu amigo'}
                <br />
                Link (copie e compartilhe):
                <textarea
                  readOnly
                  className="w-full mt-1 p-1 text-xs bg-slate-800 text-white rounded"
                  value={inviteLink}
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    alert('Link copiado!');
                  }}
                />
                <br />Iniciando em {inviteCountdown}s...
              </div>
            )}
            <p className="text-slate-400 text-sm mb-6">
              Waiting for players... ({players.filter((p: BRPlayer) => p.status !== 'left').length}/{match.max_players})
            </p>

            {/* Player list */}
            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
              {players.map((p: BRPlayer, idx: number) => (
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
