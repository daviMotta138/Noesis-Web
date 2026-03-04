// src/pages/BattleRoyale.tsx — Complete Memory Battle Royale
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords, Users, UserPlus, Zap,
  Copy, Check, ArrowLeft, Loader2, Bot,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/useGameStore';
import { useMatchStore, type BRPlayer } from '../store/useMatchStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const BOT_NAMES = ['NeuroBot', 'CortexAI', 'SynapsX', 'AxonBot', 'DendriAI', 'GliaBot', 'MyelBot', 'ThalamBot'];
const COMBO_LABELS: Record<number, { label: string; color: string }> = {
  2: { label: '×2', color: '#E8B84B' },
  3: { label: '×3', color: '#F97316' },
  5: { label: '×5', color: '#EC4899' },
  10: { label: '×10', color: '#A855F7' },
};

function getComboMultiplier(hits: number): number {
  if (hits >= 4) return 10;
  if (hits >= 3) return 5;
  if (hits >= 2) return 3;
  if (hits >= 1) return 2;
  return 1;
}

function getEmoji(name: string) {
  const emojis = ['🦁', '🐺', '🦊', '🐻', '🦅', '🐯', '🦋', '🐼', '⚡', '🌟'];
  return emojis[(name || 'A').charCodeAt(0) % emojis.length];
}

// Safe UUID generator that works in HTTP (non-secure) contexts
function makeUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts (local HTTP dev)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

type Screen = 'home' | 'queue' | 'lobby' | 'game' | 'podium';

// ─── WORD PAIRS (memory card content) ────────────────────────────────────────
const WORD_POOL = [
  'Fotossíntese', 'Neurônio', 'Átomo', 'Osmose', 'Gravidade',
  'Elétron', 'Cromossomo', 'Enzima', 'Plasma', 'Fóton',
  'Mitose', 'Antígeno', 'Simbióse', 'Catalise', 'Difusão',
  'Ribossomo', 'Vacúolo', 'Mitocôndria', 'Cloroplasto', 'Núcleo',
  'Amnésia', 'Cognição', 'Sinapsis', 'Axônio', 'Mielina',
];

function buildDeck(rows: number, cols: number, seed: string): string[] {
  // Use seed to deterministically shuffle
  const pairs = Math.floor((rows * cols) / 2);
  const chosen = [...WORD_POOL].slice(0, pairs);
  const items = [...chosen, ...chosen];
  // Simple seeded shuffle
  let h = seed.charCodeAt(0) || 42;
  for (let i = items.length - 1; i > 0; i--) {
    h = (Math.imul(h ^ 58, 2654435761) >>> 0) >>> 0;
    const j = h % (i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

// ─── Combo Flash Component ─────────────────────────────────────────────────
function ComboFlash({ hits }: { hits: number }) {
  const multi = getComboMultiplier(hits);
  const info = COMBO_LABELS[multi];
  if (!info || hits < 1) return null;
  return (
    <motion.div
      key={hits}
      initial={{ scale: 0, opacity: 0, y: -20 }}
      animate={{ scale: 1.3, opacity: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 500 }}
      className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] text-4xl font-black pointer-events-none"
      style={{ color: info.color, textShadow: `0 0 20px ${info.color}80` }}
    >
      COMBO {info.label}!
    </motion.div>
  );
}

// ─── Memory Card ──────────────────────────────────────────────────────────────
function BRCardCell({
  word, isFlipped, isMatched, onClick, disabled
}: {
  word: string; isFlipped: boolean; isMatched: boolean;
  onClick: () => void; disabled: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || isMatched}
      whileHover={!disabled && !isMatched ? { scale: 1.04 } : {}}
      whileTap={!disabled && !isMatched ? { scale: 0.97 } : {}}
      className="relative aspect-square rounded-2xl text-[10px] sm:text-xs font-black transition-all duration-200"
      style={{
        background: isMatched
          ? 'linear-gradient(135deg, rgba(74,222,128,0.15), rgba(74,222,128,0.05))'
          : isFlipped
            ? 'linear-gradient(135deg, #1e1b4b, #312e81)'
            : 'var(--color-glass)',
        border: isMatched
          ? '1px solid rgba(74,222,128,0.4)'
          : isFlipped
            ? '1px solid rgba(139,92,246,0.5)'
            : '1px solid var(--color-border)',
        boxShadow: isFlipped && !isMatched ? '0 0 12px rgba(139,92,246,0.3)' : 'none',
        color: isMatched ? '#4ADE80' : isFlipped ? 'white' : 'var(--color-text-muted)',
      }}
    >
      <AnimatePresence mode="wait">
        {isFlipped || isMatched ? (
          <motion.span
            key="word"
            initial={{ opacity: 0, rotateY: 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center p-1 text-center leading-tight"
          >
            {word}
          </motion.span>
        ) : (
          <motion.span
            key="back"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center text-lg"
          >
            🧠
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ─── Player Scoreboard Row ────────────────────────────────────────────────────
function PlayerRow({ player, isMe, rank }: { player: BRPlayer; isMe: boolean; rank: number }) {
  const multi = getComboMultiplier(player.consecutive_hits);
  const isEliminated = player.status === 'eliminated';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: isEliminated ? 0.35 : 1, x: 0 }}
      className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{
        background: isMe ? 'rgba(139,92,246,0.15)' : 'var(--color-glass)',
        border: isMe ? '1px solid rgba(139,92,246,0.3)' : '1px solid var(--color-border)',
        order: isEliminated ? 99 : rank,
      }}
    >
      <span className="text-sm font-black w-4" style={{ color: rank <= 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][rank - 1] : 'var(--color-text-muted)' }}>
        {isEliminated ? '💀' : rank}
      </span>
      <span className="text-base">{player.is_bot ? '🤖' : getEmoji(player.display_name)}</span>
      <span className="flex-1 text-xs font-bold truncate" style={{ color: 'var(--color-text)' }}>
        {player.display_name}
        {isMe && <span className="ml-1 text-purple-400"> (você)</span>}
      </span>
      {!isEliminated && player.consecutive_hits >= 1 && (
        <span className="text-[10px] font-black px-1 rounded" style={{ background: COMBO_LABELS[multi]?.color || '#E8B84B', color: '#000' }}>
          {COMBO_LABELS[multi]?.label}
        </span>
      )}
      <span className="text-xs font-black" style={{ color: 'var(--color-gold)' }}>
        {player.total_score}
      </span>
    </motion.div>
  );
}

// ─── Podium Screen ────────────────────────────────────────────────────────────
function PodiumScreen({ players, onBack }: { players: BRPlayer[]; onBack: () => void }) {
  const sorted = [...players].sort((a, b) => b.total_score - a.total_score);
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen flex flex-col items-center justify-center px-5 pb-24 pt-10"
    >
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-8"
      >
        <div className="text-6xl mb-3">🏆</div>
        <h1 className="text-3xl font-black text-gradient-gold">Pódio Final</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Battle concluída!</p>
      </motion.div>

      <div className="w-full max-w-sm space-y-3 mb-8">
        {sorted.slice(0, 3).map((player, i) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.15 }}
            className="flex items-center gap-4 p-4 rounded-2xl"
            style={{
              background: i === 0 ? 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,184,0,0.05))' : 'var(--color-glass)',
              border: i === 0 ? '1px solid rgba(255,215,0,0.3)' : '1px solid var(--color-border)',
            }}
          >
            <span className="text-3xl">{medals[i]}</span>
            <span className="text-2xl">{player.is_bot ? '🤖' : getEmoji(player.display_name)}</span>
            <div className="flex-1">
              <p className="font-black text-sm" style={{ color: 'var(--color-text)' }}>{player.display_name}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{player.total_score} pts</p>
            </div>
          </motion.div>
        ))}
        {sorted.slice(3).map((player, i) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 0.8 + i * 0.1 }}
            className="flex items-center gap-3 px-4 py-2 rounded-xl"
            style={{ background: 'var(--color-glass)', border: '1px solid var(--color-border)' }}
          >
            <span className="text-sm font-black w-5 text-center" style={{ color: 'var(--color-text-muted)' }}>{i + 4}</span>
            <span className="text-lg">{player.is_bot ? '🤖' : getEmoji(player.display_name)}</span>
            <span className="flex-1 text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>{player.display_name}</span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{player.total_score}pts</span>
          </motion.div>
        ))}
      </div>

      <button onClick={onBack} className="btn-gold flex items-center gap-2 px-8">
        <ArrowLeft size={16} /> Voltar ao Lobby
      </button>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BattleRoyalePage() {
  const { user, profile } = useGameStore();
  const { match, players, cards, loading, error: storeError, reset } = useMatchStore();
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Jogador';

  const [screen, setScreen] = useState<Screen>('home');
  const [queueCount, setQueueCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);

  // private room
  const [privateMatchId, setPrivateMatchId] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [showFriendPicker, setShowFriendPicker] = useState(false);

  // game state
  const [deck, setDeck] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]); // indices currently face-up
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [comboHits, setComboHits] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [turnBusy, setTurnBusy] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const me = players.find(p => p.id === myPlayerId);

  // ─── Effects ────────────────────────────────────────────────────────────
  // subscribe when in a match
  useEffect(() => {
    if (match?.id && myPlayerId) {
      unsubRef.current?.();
      unsubRef.current = useMatchStore.getState().subscribeToMatch(match.id, myPlayerId);
    }
    return () => { unsubRef.current?.(); };
  }, [match?.id, myPlayerId]);

  // build deck when match starts
  useEffect(() => {
    if (match?.status === 'playing' && match.deck_seed && cards.length) {
      const d = buildDeck(match.grid_rows, match.grid_cols, match.deck_seed);
      setDeck(d);
      const revealedSet = new Set<number>(cards.filter(c => c.revealed).map(c => c.idx));
      setMatched(revealedSet);
      setScreen('game');
    }
  }, [match?.status, match?.deck_seed, cards.length]);

  // detect whose turn it is
  useEffect(() => {
    if (!match || !myPlayerId) return;
    const myPlayer = players.find(p => p.id === myPlayerId);
    const isTurn = !!myPlayer?.is_current_turn && match.status === 'playing';
    setIsMyTurn(isTurn);
    if (myPlayer) setComboHits(myPlayer.consecutive_hits);
  }, [players, match?.current_player_id, myPlayerId]);

  // timer per turn
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (isMyTurn && screen === 'game') {
      setTimeLeft(30);
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isMyTurn, screen]);

  // detect match end → go to podium
  useEffect(() => {
    if (match?.status === 'finished' && screen === 'game') {
      setTimeout(() => setScreen('podium'), 1500);
    }
  }, [match?.status]);

  // ─── Matchmaking ─────────────────────────────────────────────────────────
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fillRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const joinQuickPlay = async () => {
    if (!user?.id) return;
    setError(null);
    setScreen('queue');
    try {
      const result = await useMatchStore.getState().enqueueQueue(user.id, displayName);
      if (result?.match_id) {
        // Supabase already matched us with existing queue players
        await enterMatch(result.match_id);
      } else {
        setQueueCount(result?.queue_count || 1);
        startQueuePolling();
        // After 15s: fill with bots and start regardless
        fillRef.current = setTimeout(async () => {
          stopQueuePolling();
          await fillAndStart();
        }, 15000);
      }
    } catch (e: any) { setError(e.message); setScreen('home'); }
  };

  const startQueuePolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        // Check if the queue RPC now has enough for a match (4 players)
        const result = await useMatchStore.getState().enqueueQueue(user!.id, displayName);
        if (result?.match_id) {
          stopQueuePolling();
          if (fillRef.current) clearTimeout(fillRef.current);
          await enterMatch(result.match_id);
        } else {
          setQueueCount(result?.queue_count || 1);
        }
      } catch { /* keep polling */ }
    }, 3000);
  };

  const stopQueuePolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const fillAndStart = async () => {
    // remove user from queue first so they don't re-match
    try { await useMatchStore.getState().leaveQueue(user!.id); } catch { /* ok */ }
    const matchId = await useMatchStore.getState().createMatch(user!.id, 4, 4, 6);
    const pid = await useMatchStore.getState().joinMatch(matchId, user!.id, displayName);
    setMyPlayerId(pid);
    const botsNeeded = 4 - 1;
    for (let i = 0; i < botsNeeded; i++) {
      await useMatchStore.getState().joinMatch(matchId, makeUUID(), BOT_NAMES[i] || 'Bot', true);
    }
    await useMatchStore.getState().startMatch(matchId);
    await useMatchStore.getState().getMatchState(matchId, pid);
  };

  const enterMatch = async (matchId: string) => {
    const pid = await useMatchStore.getState().joinMatch(matchId, user!.id, displayName);
    setMyPlayerId(pid);
    await useMatchStore.getState().getMatchState(matchId, pid);
    setScreen('lobby');
  };

  // ─── Private Room ─────────────────────────────────────────────────────────
  const createPrivateRoom = async () => {
    if (!user?.id) return;
    setError(null);
    try {
      const matchId = await useMatchStore.getState().createMatch(user.id, 8, 4, 6);
      const pid = await useMatchStore.getState().joinMatch(matchId, user.id, displayName);
      setMyPlayerId(pid);
      setPrivateMatchId(matchId);
      const token = await useMatchStore.getState().createInvite(matchId, 300);
      setInviteLink(`${window.location.origin}/battle-royale?invite=${token}`);
      await useMatchStore.getState().getMatchState(matchId, pid);
      fetchFriends();
      setScreen('lobby');
    } catch (e: any) { setError(e.message); }
  };

  const fetchFriends = async () => {
    if (!user?.id) return;
    const { data: fs } = await supabase.from('friendships').select('id, user_id, friend_id, status').or(`user_id.eq.${user.id},friend_id.eq.${user.id}`).eq('status', 'accepted');
    if (!fs?.length) return;
    const ids = fs.map((f: any) => f.user_id === user.id ? f.friend_id : f.user_id);
    const { data: profs } = await supabase.from('profiles').select('id, display_name').in('id', ids);
    setFriendsList(profs || []);
  };

  const sendInviteToFriend = async (friend: { id: string; display_name: string }) => {
    if (!inviteLink || !user?.id || !match?.id) return;
    // Chat message
    await supabase.from('messages').insert({ sender_id: user.id, recipient_id: friend.id, content: `🎮 Jogar Battle Royale comigo! ${inviteLink}` });
    // Notification
    await supabase.from('notifications').insert({
      user_id: friend.id,
      type: 'br_invite',
      title: '⚔️ Convite para Battle Royale!',
      body: `${displayName} te convidou para uma batalha de memória!`,
      metadata: JSON.stringify({ invite_link: inviteLink, sender: displayName }),
    });
    setShowFriendPicker(false);
  };

  // ─── Gameplay ─────────────────────────────────────────────────────────────
  const handleCardClick = async (idx: number) => {
    if (!isMyTurn || turnBusy || matched.has(idx) || flipped.includes(idx) || !match?.id || !myPlayerId) return;
    if (flipped.length >= 2) return;

    const next = [...flipped, idx];
    setFlipped(next);

    if (next.length === 2) {
      setTurnBusy(true);
      await new Promise(r => setTimeout(r, 600));
      try {
        const result: any = await useMatchStore.getState().reportPair(match.id, myPlayerId, next[0], next[1]);
        if (result?.result === 'match') {
          setMatched(prev => new Set([...prev, next[0], next[1]]));
          setComboHits(c => c + 1);
          setShowCombo(true);
          setTimeout(() => setShowCombo(false), 1000);
        } else {
          setComboHits(0);
        }
        await useMatchStore.getState().getMatchState(match.id, myPlayerId);
      } catch (e: any) { console.error(e); }
      setFlipped([]);
      setTurnBusy(false);
    }
  };

  const handleStartPrivate = async () => {
    if (!match?.id || !myPlayerId) return;
    const current = players.filter(p => p.status !== 'left').length;
    if (current < 2) { setError('Mínimo 2 jogadores para iniciar!'); return; }
    const needed = 4 - current;
    for (let i = 0; i < needed; i++) {
      await useMatchStore.getState().joinMatch(match.id, makeUUID(), BOT_NAMES[i] || 'Bot', true);
    }
    await useMatchStore.getState().startMatch(match.id);
    await useMatchStore.getState().getMatchState(match.id, myPlayerId);
  };

  const goHome = () => {
    stopQueuePolling();
    if (fillRef.current) clearTimeout(fillRef.current);
    reset();
    setScreen('home');
    setMyPlayerId(null);
    setPrivateMatchId(null);
    setInviteLink(null);
    setFlipped([]);
    setMatched(new Set());
    setComboHits(0);
    setDeck([]);
  };

  // ─── Join via URL invite ──────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (token && user?.id) {
      (async () => {
        try {
          const res: any = await useMatchStore.getState().joinByInvite(token, user.id, displayName);
          setMyPlayerId(res.player_id);
          await useMatchStore.getState().getMatchState(res.match_id, res.player_id);
          window.history.replaceState(null, '', window.location.pathname);
          setScreen('lobby');
        } catch { /* fallback to home */ }
      })();
    }
  }, [user?.id]);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (!user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: 'var(--color-text-muted)' }}>Faça login para jogar</p>
      </div>
    );
  }

  const activePlayers = players.filter(p => p.status !== 'left');
  const ranked = [...activePlayers].sort((a, b) => b.total_score - a.total_score);

  // ─── HOME SCREEN ──────────────────────────────────────────────────────────
  if (screen === 'home') return (
    <div className="min-h-screen pb-24 pt-10 px-5">
      {/* Bg glow */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
        <div className="text-6xl mb-4">⚔️</div>
        <h1 className="text-4xl font-black text-display">
          <span style={{ color: '#A855F7' }}>Memory</span>{' '}
          <span className="text-gradient-gold">Battle</span>
        </h1>
        <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
          Encontre os pares mais rápido, acumule combos e elimine seus rivais!
        </p>
      </motion.div>

      {/* Error */}
      {(error || storeError) && (
        <div className="mb-4 p-3 rounded-xl text-xs" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--color-danger)' }}>
          {error || storeError}
        </div>
      )}

      {/* Combo legend */}
      <div className="panel p-4 mb-6">
        <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>⚡ Sistema de Combos</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(COMBO_LABELS).map(([hit, info]) => (
            <div key={hit} className="flex flex-col items-center px-3 py-1.5 rounded-xl text-xs font-black"
              style={{ background: `${info.color}15`, border: `1px solid ${info.color}40`, color: info.color }}>
              <span>{info.label}</span>
              <span className="text-[9px] opacity-70">{hit} seguidos</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
          Acerte pares consecutivos para multiplicar seus pontos. Erre e perde o combo!
        </p>
      </div>

      {/* Mode buttons */}
      <div className="space-y-4">
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={joinQuickPlay}
          disabled={loading}
          className="w-full py-5 rounded-3xl font-black text-lg flex items-center justify-center gap-3 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: 'white', boxShadow: '0 0 30px rgba(139,92,246,0.4)' }}
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <Swords size={22} />}
          Jogo Rápido
          <span className="absolute top-2 right-3 text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
            Até 4 jogadores
          </span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={createPrivateRoom}
          disabled={loading}
          className="w-full py-5 rounded-3xl font-black text-lg flex items-center justify-center gap-3 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #C49333, #E8B84B)', color: '#0D0F1C', boxShadow: '0 0 20px rgba(212,168,83,0.3)' }}
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <Users size={22} />}
          Jogar com Amigos
          <span className="absolute top-2 right-3 text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.2)' }}>
            Mín. 2 jogadores
          </span>
        </motion.button>
      </div>

      {/* How to play */}
      <div className="panel p-4 mt-6">
        <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>📖 Como jogar</p>
        <ul className="text-xs space-y-1" style={{ color: 'var(--color-text-sub)' }}>
          <li>• Vire as cartas e encontre pares de palavras iguais</li>
          <li>• Acertos consecutivos ativam multiplicadores de pontos</li>
          <li>• Ao término de cada rodada, o jogador com menos pontos é eliminado</li>
          <li>• O pódio (top 3) ganha pontos para o ranking da liga!</li>
        </ul>
      </div>
    </div>
  );

  // ─── QUEUE SCREEN ─────────────────────────────────────────────────────────
  if (screen === 'queue') return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 pb-24">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            className="absolute inset-0 rounded-full"
            style={{ border: '3px solid transparent', borderTopColor: '#A855F7', borderRightColor: '#E8B84B' }}
          />
          <div className="absolute inset-2 rounded-full flex items-center justify-center text-3xl"
            style={{ background: 'var(--color-glass)' }}>
            ⚔️
          </div>
        </div>
        <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--color-text)' }}>Buscando batalha...</h2>
        <p className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>{queueCount} jogador{queueCount !== 1 ? 'es' : ''} na fila</p>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Bots completam se não houver jogadores suficientes</p>

        <div className="flex gap-2 justify-center mt-6">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.3 }}
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: i < queueCount ? 'rgba(139,92,246,0.3)' : 'var(--color-glass)', border: `1px solid ${i < queueCount ? 'rgba(139,92,246,0.5)' : 'var(--color-border)'}` }}
            >
              {i < queueCount ? '👤' : <Bot size={14} style={{ color: 'var(--color-text-muted)' }} />}
            </motion.div>
          ))}
        </div>

        <button onClick={goHome} className="mt-8 px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 mx-auto"
          style={{ background: 'var(--color-glass)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
          <X size={14} /> Cancelar
        </button>
      </motion.div>
    </div>
  );

  // ─── LOBBY SCREEN ─────────────────────────────────────────────────────────
  if (screen === 'lobby') return (
    <div className="min-h-screen px-5 pt-10 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={goHome} className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--color-glass)', color: 'var(--color-text-muted)' }}>
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-xl font-black" style={{ color: 'var(--color-text)' }}>
          {privateMatchId ? '🏠 Sala Privada' : '⚔️ Lobby'}
        </h1>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 p-3 rounded-xl text-xs" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--color-danger)' }}>
          {error}
        </div>
      )}

      {/* Invite section */}
      {inviteLink && (
        <div className="panel p-4 mb-4">
          <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>🔗 Convidar Amigos</p>
          <div className="flex gap-2 mb-3">
            <div className="flex-1 px-3 py-2 rounded-xl text-[10px] truncate"
              style={{ background: 'var(--color-glass)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
              {inviteLink}
            </div>
            <button onClick={() => { navigator.clipboard.writeText(inviteLink || ''); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1" style={{ background: 'var(--color-glass)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>
          <button onClick={() => { fetchFriends(); setShowFriendPicker(true); }}
            className="btn-gold w-full flex items-center justify-center gap-2 text-sm">
            <UserPlus size={15} /> Enviar convite a amigo
          </button>
        </div>
      )}

      {/* Players */}
      <div className="panel p-4 mb-4">
        <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Jogadores ({activePlayers.length}/{match?.max_players || 4})
        </p>
        <div className="space-y-2">
          {activePlayers.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: 'var(--color-glass)', border: '1px solid var(--color-border)' }}>
              <span className="text-lg">{p.is_bot ? '🤖' : getEmoji(p.display_name)}</span>
              <span className="flex-1 text-sm font-bold" style={{ color: 'var(--color-text)' }}>{p.display_name}</span>
              {p.id === match?.host_id && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(212,168,83,0.15)', color: 'var(--color-gold)', border: '1px solid rgba(212,168,83,0.2)' }}>HOST</span>
              )}
            </motion.div>
          ))}
          {!activePlayers.length && (
            <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-muted)' }}>Aguardando jogadores...</p>
          )}
        </div>
      </div>

      {/* Start button (host only) */}
      {(user?.id === match?.host_id || privateMatchId) && (
        <button onClick={handleStartPrivate} disabled={loading || activePlayers.length < 1}
          className="btn-gold w-full flex items-center justify-center gap-2 py-4 text-base font-black disabled:opacity-50">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Swords size={18} />}
          Iniciar Batalha
        </button>
      )}
      {!privateMatchId && user?.id !== match?.host_id && (
        <p className="text-center text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>Aguardando o host iniciar...</p>
      )}

      {/* Friend picker modal */}
      <AnimatePresence>
        {showFriendPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end md:items-center md:justify-center"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowFriendPicker(false)}>
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full md:max-w-sm md:mx-4 rounded-t-3xl md:rounded-3xl p-6"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-glow)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-gradient-gold">Convidar amigo</h3>
                <button onClick={() => setShowFriendPicker(false)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-glass)', color: 'var(--color-text-muted)' }}><X size={14} /></button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {friendsList.map(f => (
                  <div key={f.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                    style={{ background: 'var(--color-glass)', border: '1px solid var(--color-border)' }}>
                    <span className="text-lg">{getEmoji(f.display_name)}</span>
                    <span className="flex-1 text-sm font-bold" style={{ color: 'var(--color-text)' }}>{f.display_name}</span>
                    <button onClick={() => sendInviteToFriend(f)}
                      className="px-3 py-1.5 rounded-xl text-xs font-black"
                      style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: 'white' }}>
                      Convidar
                    </button>
                  </div>
                ))}
                {!friendsList.length && (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-muted)' }}>Nenhum amigo encontrado</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // ─── PODIUM ───────────────────────────────────────────────────────────────
  if (screen === 'podium') return <PodiumScreen players={players} onBack={goHome} />;

  // ─── GAME SCREEN ──────────────────────────────────────────────────────────
  if (screen !== 'game') return null;

  const cols = match?.grid_cols || 6;
  const isEliminated = me?.status === 'eliminated';

  return (
    <div className="min-h-screen pb-24 select-none">
      {/* Top bar */}
      <div className="sticky top-0 z-50 px-3 py-2 flex items-center justify-between"
        style={{ background: 'rgba(13,15,28,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <button onClick={goHome} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-glass)', color: 'var(--color-text-muted)' }}><ArrowLeft size={14} /></button>
          <span className="text-xs font-black" style={{ color: 'var(--color-text-muted)' }}>Rodada {match?.round_number || 1}</span>
        </div>
        <div className="flex items-center gap-2">
          {isMyTurn && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#A855F7' }}>
              <Zap size={10} /> Seu turno
              <span className="ml-1" style={{ color: timeLeft < 10 ? '#F87171' : undefined }}>{timeLeft}s</span>
            </div>
          )}
          <span className="text-xs font-black" style={{ color: 'var(--color-gold)' }}>{me?.total_score || 0} pts</span>
        </div>
      </div>

      {/* Combo Flash */}
      <AnimatePresence>
        {showCombo && <ComboFlash hits={comboHits} />}
      </AnimatePresence>

      {/* Eliminated banner */}
      {isEliminated && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mx-4 mt-3 p-3 rounded-2xl text-center text-sm font-bold"
          style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--color-danger)' }}>
          💀 Você foi eliminado — pode assistir!
        </motion.div>
      )}

      {/* Card grid */}
      <div className="px-3 py-3">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {deck.map((word, idx) => {
            const card = cards[idx];
            return (
              <BRCardCell
                key={idx}
                word={word}
                isFlipped={flipped.includes(idx)}
                isMatched={matched.has(idx) || !!card?.revealed}
                onClick={() => handleCardClick(idx)}
                disabled={!isMyTurn || turnBusy || isEliminated}
              />
            );
          })}
        </div>
      </div>

      {/* Scoreboard */}
      <div className="px-3 mt-3 space-y-1.5">
        <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>⚔️ Placar</p>
        {ranked.map((p, i) => (
          <PlayerRow key={p.id} player={p} isMe={p.id === myPlayerId} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}
