import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Send, Search, Check, X, Users, MessageCircle, ChevronLeft, Gift } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/useGameStore';
import { FlippableProfilePic } from '../components/FlippableProfilePic';
import { FullBodyAvatarModal } from '../components/FullBodyAvatarModal';
import type { AvatarConfig } from '../components/Avatar2D';
import coinImg from '../assets/coin.webp';
import shieldImg from '../assets/shield.png';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FriendProfile {
    id: string;
    display_name: string;
    avatar_url: string | null;
    friend_id: string;
    streak: number;
    score: number;
    nous_coins: number;
    status: 'accepted' | 'pending_sent' | 'pending_received';
    friendshipId: string;
    avatar_config?: Partial<AvatarConfig> | null;
    badges?: string[];
}

interface Message {
    id: string;
    sender_id: string;
    recipient_id: string;
    content: string;
    created_at: string;
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────
function ChatPanel({ friend, myId, onBack }: { friend: FriendProfile; myId: string; onBack: () => void }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [chatError, setChatError] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Fetch messages
    useEffect(() => {
        let cancelled = false;
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(
                    `and(sender_id.eq.${myId},recipient_id.eq.${friend.id}),and(sender_id.eq.${friend.id},recipient_id.eq.${myId})`
                )
                .order('created_at', { ascending: false })
                .limit(100);
            if (!cancelled) {
                if (error) {
                    setChatError('Não foi possível carregar mensagens. Verifique as permissões da tabela no Supabase.');
                    console.error('[Chat] Supabase error:', error);
                } else {
                    setMessages(data?.reverse() ?? []);
                }
                setLoading(false);
            }
        };
        fetchMessages();

        // Realtime subscription
        const channel = supabase
            .channel(`chat-${[myId, friend.id].sort().join('-')}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'messages',
                filter: `recipient_id=eq.${myId}`,
            }, payload => {
                const msg = payload.new as Message;
                if (msg.sender_id === friend.id) {
                    setMessages(prev => [...prev, msg]);
                }
            })
            .subscribe();

        return () => { cancelled = true; supabase.removeChannel(channel); };
    }, [friend.id, myId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        const content = text.trim();
        if (!content) return;
        setText('');
        const tempId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `temp_${Date.now()}_${Math.random()}`;
        const optimistic: Message = {
            id: tempId, sender_id: myId, recipient_id: friend.id,
            content, created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimistic]);

        const { error } = await supabase.from('messages').insert({
            sender_id: myId, recipient_id: friend.id, content,
        });

        if (error) {
            console.error('[Chat Insert Error]:', error);
            setChatError(`Erro ao enviar: ${error.message}`);
            setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        }
    };


    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Chat header */}
            <div className="flex items-center gap-3 p-5 flex-shrink-0"
                style={{ borderBottom: '1px solid var(--color-border)' }}>
                <button onClick={onBack} className="p-1 rounded-lg transition-all"
                    style={{ color: 'var(--color-text-muted)' }}>
                    <ChevronLeft size={20} />
                </button>
                <FlippableProfilePic
                    avatarUrl={friend.avatar_url}
                    avatarConfig={friend.avatar_config}
                    fallbackAvatar={friend.display_name.charAt(0).toUpperCase()}
                    size={36}
                    autoFlip={false}
                    className="rounded-xl overflow-hidden shadow-md flex-shrink-0"
                />
                <div>
                    <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{friend.display_name}</p>
                    <p className="text-xs flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                        🔥 {friend.streak} · <img src={coinImg} className="w-3 h-3 object-contain" alt="" /> {friend.nous_coins}
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-sm animate-pulse" style={{ color: 'var(--color-text-muted)' }}>Carregando...</p>
                    </div>
                ) : chatError ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-4">
                        <p className="text-sm font-bold" style={{ color: 'var(--color-danger)' }}>Erro no chat</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{chatError}</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                        <MessageCircle size={36} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            Nenhuma mensagem ainda.<br />Diga olá para {friend.display_name}!
                        </p>
                    </div>
                ) : (
                    messages.map(msg => {
                        const isMine = msg.sender_id === myId;
                        return (
                            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                <div className="max-w-[72%] space-y-1">
                                    <div className="px-4 py-2.5 rounded-2xl text-sm"
                                        style={{
                                            background: isMine
                                                ? 'linear-gradient(135deg, #C49333 0%, #E8B84B 100%)'
                                                : 'var(--color-card)',
                                            color: isMine ? '#0D0F1C' : 'var(--color-text)',
                                            border: isMine ? 'none' : '1px solid var(--color-border)',
                                            borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                            fontWeight: isMine ? 600 : 400,
                                        }}>
                                        {msg.content}
                                    </div>
                                    <p className="text-[10px] px-1"
                                        style={{ color: 'var(--color-text-muted)', textAlign: isMine ? 'right' : 'left' }}>
                                        {formatTime(msg.created_at)}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
                <div className="flex gap-3 items-center">
                    <input
                        className="field flex-1 text-sm"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="Escreva uma mensagem..."
                        style={{ borderRadius: 14, padding: '11px 16px' }}
                    />
                    <button onClick={handleSend} disabled={!text.trim()}
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                            background: text.trim() ? 'linear-gradient(135deg, #C49333, #E8B84B)' : 'var(--color-card)',
                            border: text.trim() ? 'none' : '1px solid var(--color-border)',
                            color: text.trim() ? '#0D0F1C' : 'var(--color-text-muted)',
                        }}>
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Friend Profile Modal ─────────────────────────────────────────────────────
function FriendProfileView({ friend, onClose, onChat, onAvatarClick }: { friend: FriendProfile; onClose: () => void; onChat: () => void; onAvatarClick: () => void; }) {
    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }} className="flex flex-col h-full">
            <div className="flex items-center gap-3 p-5 flex-shrink-0"
                style={{ borderBottom: '1px solid var(--color-border)' }}>
                <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}><ChevronLeft size={20} /></button>
                <p className="font-bold" style={{ color: 'var(--color-text)' }}>Perfil do Amigo</p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-8">
                {/* Avatar */}
                <div className="flex justify-center mb-6">
                    <button onClick={onAvatarClick} className="transition-transform active:scale-95">
                        <FlippableProfilePic
                            avatarUrl={friend.avatar_url}
                            avatarConfig={friend.avatar_config}
                            fallbackAvatar={friend.display_name.charAt(0).toUpperCase()}
                            size={112} // 28 * 4
                            autoFlip={true}
                            className="shadow-xl flex-shrink-0"
                        />
                    </button>
                </div>

                <h2 className="text-2xl font-black text-display text-center text-gradient-gold mb-1">
                    {friend.display_name}
                </h2>
                <p className="text-center text-xs mb-8" style={{ color: 'var(--color-text-muted)' }}>{friend.friend_id}</p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                    {[
                        { label: 'Ofensiva', val: `${friend.streak}`, icon: '🔥' },
                        { label: 'Pontos', val: friend.score.toLocaleString(), icon: '⭐' },
                        { label: 'Nous', val: `${friend.nous_coins}`, icon: '🪙' },
                    ].map(({ label, val, icon }) => (
                        <div key={label} className="panel p-3 text-center"
                            style={{ border: '1px solid var(--color-border-glow)' }}>
                            <p className="text-lg font-black flex items-center justify-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                                {label === 'Nous' ? <img src={coinImg} className="w-4 h-4 object-contain" alt="" /> : icon} {val}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
                        </div>
                    ))}
                </div>

                {/* Badges */}
                {friend.badges && friend.badges.length > 0 && (
                    <div className="mb-8">
                        <p className="text-[10px] tracking-[0.2em] uppercase font-bold text-center mb-3" style={{ color: 'var(--color-text-muted)' }}>
                            Coleção de Broches
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {friend.badges.map(b => {
                                const [league, posStr] = b.split('_');
                                const pos = parseInt(posStr) || 3;
                                let color = '#CD7F32';
                                let icon = '🥉';
                                if (league === 'campeonato' || league === 'diamante') { color = '#00FFFF'; icon = '💎'; }
                                if (league === 'ouro' || pos === 1) { color = '#FFD700'; icon = '🥇'; }
                                if (league === 'prata' || pos === 2) { color = '#C0C0C0'; icon = '🥈'; }

                                return (
                                    <div key={b} className="flex flex-col items-center justify-center p-2 rounded-xl border relative overflow-hidden"
                                        style={{ borderColor: `${color}40`, background: `${color}10`, width: 70, height: 80 }}>
                                        <span className="text-2xl drop-shadow-lg mb-0.5" style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}>{icon}</span>
                                        <span className="text-[8px] font-black uppercase text-center w-full truncate" style={{ color }}>{league}</span>
                                        <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full mt-1" style={{ color: 'var(--color-text-sub)', background: 'var(--color-overlay)' }}>Top {pos}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <button onClick={onChat} className="btn-gold w-full flex items-center justify-center gap-2">
                    <MessageCircle size={16} /> Chat
                </button>
            </div>
        </motion.div>
    );
}

// ─── Main Friends Page ────────────────────────────────────────────────────────
export default function FriendsPage() {
    const { user, profile, fetchProfile } = useGameStore();
    const [friends, setFriends] = useState<FriendProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchId, setSearchId] = useState('');
    const [searchResult, setSearchResult] = useState<{ display_name: string; friend_id: string; id: string } | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [searching, setSending] = useState(false);
    const [activePanel, setActivePanel] = useState<'none' | 'chat' | 'profile'>('none');
    const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
    const [giftModalFriend, setGiftModalFriend] = useState<FriendProfile | null>(null);
    const [fullBodyFriend, setFullBodyFriend] = useState<FriendProfile | null>(null);
    const [giftStatus, setGiftStatus] = useState<{ loading: boolean; error: string | null; success: string | null }>({ loading: false, error: null, success: null });

    const fetchFriends = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const { data: fs } = await supabase
                .from('friendships')
                .select('id, user_id, friend_id, status')
                .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

            if (!fs || fs.length === 0) { setFriends([]); setLoading(false); return; }

            const profileIds = fs.map(f => f.user_id === user.id ? f.friend_id : f.user_id);
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, display_name, avatar_url, friend_id, streak, score, nous_coins, avatar_config, badges')
                .in('id', profileIds);

            const combined: FriendProfile[] = fs.map(f => {
                const otherId = f.user_id === user.id ? f.friend_id : f.user_id;
                const profile = profiles?.find(p => p.id === otherId);
                return {
                    ...(profile ?? { id: otherId, display_name: 'Desconhecido', avatar_url: null, friend_id: '?', streak: 0, score: 0, nous_coins: 0, avatar_config: {} }),
                    status: f.status === 'accepted' ? 'accepted'
                        : f.user_id === user.id ? 'pending_sent' : 'pending_received',
                    friendshipId: f.id,
                };
            });

            setFriends(combined);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFriends(); }, [user?.id]);

    const handleSearch = async () => {
        if (!searchId.trim()) return;
        setSending(true); setSearchResult(null); setSearchError(null);
        const { data } = await supabase
            .from('profiles')
            .select('id, display_name, friend_id')
            .eq('friend_id', searchId.trim())
            .single();
        setSending(false);
        if (!data) { setSearchError('Usuário não encontrado.'); return; }
        if (data.id === user?.id) { setSearchError('Esse é você!'); return; }
        setSearchResult(data);
    };

    const handleAddFriend = async (targetId?: string) => {
        const tid = targetId ?? searchResult?.id;
        if (!tid || !user?.id) return;
        const already = friends.find(f => f.id === tid);
        if (already) { setSearchError('Já é seu amigo ou pedido pendente.'); return; }

        // Insert pending friendship
        await supabase.from('friendships').insert({
            user_id: user.id, friend_id: tid, status: 'pending',
        });

        // Notify the target user
        await supabase.from('notifications').insert({
            user_id: tid,
            type: 'friend_request',
            title: 'Solicitação de amizade',
            body: `${profile?.display_name ?? 'Alguém'} quer ser seu amigo!`,
            metadata: JSON.stringify({ sender_id: user.id, sender_name: profile?.display_name }),
        });

        setSearchResult(null); setSearchId('');
        fetchFriends();
    };

    const handleAccept = async (friendshipId: string, senderId?: string) => {
        await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
        // Notify sender that request was accepted
        if (senderId) {
            await supabase.from('notifications').insert({
                user_id: senderId,
                type: 'friend_accepted',
                title: 'Amizade aceita! 🎉',
                body: `${profile?.display_name ?? 'Alguém'} aceitou seu pedido de amizade!`,
            });
        }
        fetchFriends();
    };

    const handleRemove = async (friendshipId: string) => {
        await supabase.from('friendships').delete().eq('id', friendshipId);
        if (selectedFriend?.friendshipId === friendshipId) { setActivePanel('none'); setSelectedFriend(null); }
        fetchFriends();
    };

    const accepted = friends.filter(f => f.status === 'accepted');
    const pending = friends.filter(f => f.status !== 'accepted');

    const openProfile = (f: FriendProfile) => { setSelectedFriend(f); setActivePanel('profile'); };
    const openChat = (f: FriendProfile) => { setSelectedFriend(f); setActivePanel('chat'); };
    const closePanel = () => { setActivePanel('none'); setSelectedFriend(null); };

    const handleSendGift = async (type: 'nous100' | 'shield1') => {
        if (!user || !giftModalFriend) return;
        setGiftStatus({ loading: true, error: null, success: null });

        try {
            const { data, error } = await supabase.rpc('send_gift', {
                sender_id: user.id,
                receiver_id: giftModalFriend.id,
                gift_type: type
            });

            if (error) throw error;
            if (data && !data.success) throw new Error(data.error || 'Erro ao enviar presente.');

            setGiftStatus({ loading: false, error: null, success: type === 'nous100' ? '100 Nous enviados com sucesso!' : '1 Escudo enviado com sucesso!' });

            // Refresh user profile so local stats update
            fetchProfile(user.id);

            setTimeout(() => {
                setGiftModalFriend(null);
                setGiftStatus({ loading: false, error: null, success: null });
            }, 2000);
        } catch (err: any) {
            setGiftStatus({ loading: false, error: err.message, success: null });
        }
    };

    return (
        <div className="flex gap-6" style={{ height: 'calc(100vh - 4rem)' }}>

            {/* ── Left: Friend list — hidden on mobile when a panel is open ── */}
            <div
                className={`flex-col gap-4 overflow-y-auto pr-1 flex-shrink-0 w-full md:w-[320px] ${activePanel !== 'none' ? 'hidden md:flex' : 'flex'}`}
            >
                <div className="friends-list flex flex-col gap-4">
                    <div>
                        <p className="text-xs tracking-[0.3em] uppercase mb-1" style={{ color: 'var(--color-gold-dim)' }}>Social</p>
                        <h1 className="text-3xl font-black text-display text-gradient-gold">Amigos</h1>
                    </div>

                    {/* Search & Add */}
                    <div className="panel p-4" style={{ border: '1px solid var(--color-border-glow)' }}>
                        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>
                            <UserPlus size={11} className="inline mr-1" />Adicionar amigo
                        </p>
                        <div className="flex gap-2">
                            <input className="field text-sm" style={{ borderRadius: 12, padding: '10px 14px' }}
                                type="text" value={searchId} onChange={e => setSearchId(e.target.value)}
                                placeholder="ID (ex: João#4FB7D7)"
                                onKeyDown={e => e.key === 'Enter' && handleSearch()} />
                            <button onClick={handleSearch} disabled={searching}
                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-glow)', color: 'var(--color-gold)' }}>
                                <Search size={15} />
                            </button>
                        </div>

                        {/* Search result */}
                        <AnimatePresence>
                            {searchResult && (
                                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    className="mt-3 p-3 rounded-xl flex items-center justify-between"
                                    style={{ background: 'rgba(212,168,83,0.08)', border: '1px solid rgba(212,168,83,0.2)' }}>
                                    <div>
                                        <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{searchResult.display_name}</p>
                                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{searchResult.friend_id}</p>
                                    </div>
                                    <button onClick={() => handleAddFriend(searchResult.id)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-black"
                                        style={{ background: 'linear-gradient(135deg, #C49333, #E8B84B)', color: '#0D0F1C' }}>
                                        + Solicitar
                                    </button>
                                </motion.div>
                            )}
                            {searchError && (
                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="mt-2 text-xs" style={{ color: 'var(--color-danger)' }}>
                                    {searchError}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Pending requests */}
                    {pending.length > 0 && (
                        <div className="panel p-4">
                            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>
                                Pendentes ({pending.length})
                            </p>
                            <div className="space-y-2">
                                {pending.map(f => (
                                    <div key={f.id} className="flex items-center gap-3 rounded-xl p-3"
                                        style={{ background: 'var(--color-glass)', border: '1px solid var(--color-border)' }}>
                                        <FlippableProfilePic
                                            avatarUrl={f.avatar_url}
                                            avatarConfig={f.avatar_config}
                                            fallbackAvatar={f.display_name.charAt(0).toUpperCase()}
                                            size={32}
                                            autoFlip={false}
                                            className="rounded-xl shadow-sm flex-shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold truncate" style={{ color: 'var(--color-text)' }}>{f.display_name}</p>
                                            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                                                {f.status === 'pending_sent' ? 'Aguardando resposta' : 'Quer ser seu amigo'}
                                            </p>
                                        </div>
                                        {f.status === 'pending_received' && (
                                            <div className="flex gap-1">
                                                <button onClick={() => handleAccept(f.friendshipId, f.id)}
                                                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                                                    style={{ background: 'rgba(45,212,191,0.15)', color: 'var(--color-success)' }}>
                                                    <Check size={13} />
                                                </button>
                                                <button onClick={() => handleRemove(f.friendshipId)}
                                                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                                                    style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--color-danger)' }}>
                                                    <X size={13} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Friends list */}
                    <div className="panel p-4 flex-1">
                        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>
                            <Users size={11} className="inline mr-1" />Amigos ({accepted.length})
                        </p>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <p className="text-sm animate-pulse" style={{ color: 'var(--color-text-muted)' }}>Carregando...</p>
                            </div>
                        ) : accepted.length === 0 ? (
                            <div className="text-center py-8">
                                <Users size={32} style={{ color: 'var(--color-text-muted)', margin: '0 auto 12px', opacity: 0.4 }} />
                                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                    Adicione amigos para começar a conversar!
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {accepted.map(f => (
                                    <div key={f.id}
                                        className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all"
                                        style={{
                                            background: selectedFriend?.id === f.id ? 'rgba(212,168,83,0.08)' : 'transparent',
                                            border: selectedFriend?.id === f.id ? '1px solid rgba(212,168,83,0.2)' : '1px solid transparent',
                                        }}>
                                        {/* Avatar image/initial */}
                                        <FlippableProfilePic
                                            avatarUrl={f.avatar_url}
                                            avatarConfig={f.avatar_config}
                                            fallbackAvatar={f.display_name.charAt(0).toUpperCase()}
                                            size={40}
                                            autoFlip={false}
                                            className="rounded-xl flex-shrink-0 shadow-sm border border-white/5"
                                        />
                                        <div className="flex-1 min-w-0" onClick={() => openProfile(f)}>
                                            <p className="text-sm font-bold truncate" style={{ color: 'var(--color-text)' }}>{f.display_name}</p>
                                            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                                {f.streak} streak · {f.score.toLocaleString()} pts
                                            </p>
                                        </div>
                                        <button onClick={() => openChat(f)}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                                            style={{ background: 'var(--color-card)', color: 'var(--color-gold)' }}>
                                            <MessageCircle size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                {/* Close friends-list wrapper div */}
            </div>

            {/* ── Right: Chat or Profile ── */}
            <div className={`flex-1 flex-col panel overflow-hidden ${activePanel === 'none' ? 'hidden md:flex' : 'flex'}`} style={{ border: '1px solid var(--color-border-glow)' }}>
                <AnimatePresence mode="wait">
                    {activePanel === 'none' && (
                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
                            <MessageCircle size={56} style={{ color: 'var(--color-text-muted)', opacity: 0.3 }} />
                            <div>
                                <p className="font-bold text-lg mb-1" style={{ color: 'var(--color-text)' }}>Selecione um amigo</p>
                                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                    Clique em um amigo para ver o perfil ou iniciar uma conversa.
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {activePanel === 'chat' && selectedFriend && user?.id && (
                        <motion.div key={`chat-${selectedFriend.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="h-full">
                            <ChatPanel friend={selectedFriend} myId={user.id}
                                onBack={() => setActivePanel('profile')} />
                        </motion.div>
                    )}

                    {activePanel === 'profile' && selectedFriend && (
                        <motion.div key={`profile-${selectedFriend.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="h-full">
                            <FriendProfileView
                                friend={selectedFriend}
                                onClose={closePanel}
                                onChat={() => openChat(selectedFriend)}
                                onAvatarClick={() => setFullBodyFriend(selectedFriend)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Gift Modal Overlay ── */}
            <AnimatePresence>
                {giftModalFriend && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-5"
                        style={{ background: 'rgba(7,8,15,0.85)', backdropFilter: 'blur(8px)' }}>
                        <div className="w-full max-w-sm rounded-[24px] overflow-hidden"
                            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-glow)', boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}>
                            <div className="p-6 relative">
                                <button onClick={() => !giftStatus.loading && setGiftModalFriend(null)}
                                    className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>

                                <div className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center text-xl"
                                    style={{ background: 'linear-gradient(135deg, rgba(45,212,191,0.2), rgba(45,212,191,0.05))', color: 'var(--color-success)', border: '1px solid rgba(45,212,191,0.3)' }}>
                                    <Gift size={28} />
                                </div>

                                <h3 className="text-xl font-black text-center mb-1 text-white">Enviar Presente</h3>
                                <p className="text-center text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
                                    Para: <strong className="text-white">{giftModalFriend.display_name}</strong>
                                </p>

                                {giftStatus.error && (
                                    <div className="mb-4 p-3 rounded-lg text-xs text-center border" style={{ background: 'rgba(248,113,113,0.1)', borderColor: 'rgba(248,113,113,0.2)', color: 'var(--color-danger)' }}>
                                        {giftStatus.error}
                                    </div>
                                )}

                                {giftStatus.success ? (
                                    <div className="mb-4 p-3 rounded-lg text-sm text-center font-bold border" style={{ background: 'rgba(45,212,191,0.1)', borderColor: 'rgba(45,212,191,0.2)', color: 'var(--color-success)' }}>
                                        {giftStatus.success}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <button onClick={() => handleSendGift('nous100')} disabled={giftStatus.loading}
                                            className="w-full p-4 rounded-xl flex items-center justify-between border transition-all hover:border-[var(--color-gold)] group"
                                            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', opacity: giftStatus.loading ? 0.5 : 1 }}>
                                            <div className="flex items-center gap-3">
                                                <img src={coinImg} className="w-5 h-5 object-contain" alt="" />
                                                <div className="text-left">
                                                    <p className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">100 Nous</p>
                                                    <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Ajudar na compra de acessórios</p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-bold" style={{ color: 'var(--color-gold)' }}>Custa 100</span>
                                        </button>

                                        <button onClick={() => handleSendGift('shield1')} disabled={giftStatus.loading}
                                            className="w-full p-4 rounded-xl flex items-center justify-between border transition-all hover:border-[var(--color-success)] group"
                                            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', opacity: giftStatus.loading ? 0.5 : 1 }}>
                                            <div className="flex items-center gap-3">
                                                <img src={shieldImg} className="w-5 h-5 object-contain" alt="" />
                                                <div className="text-left">
                                                    <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">1 Escudo</p>
                                                    <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Proteger a ofensiva do amigo</p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-bold" style={{ color: 'var(--color-success)' }}>Custa 1</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Full Body Avatar Modal ── */}
            <FullBodyAvatarModal
                open={!!fullBodyFriend}
                onClose={() => setFullBodyFriend(null)}
                avatarConfig={fullBodyFriend?.avatar_config}
                displayName={fullBodyFriend?.display_name || ''}
            />
        </div>
    );
}
