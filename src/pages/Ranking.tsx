import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Star, Crown, Shield, UserPlus, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/useGameStore';
import { PromotionModal } from '../components/PromotionModal';
import { DemotionModal } from '../components/DemotionModal';
import { FlippableProfilePic } from '../components/FlippableProfilePic';
import { FullBodyAvatarModal } from '../components/FullBodyAvatarModal';
import type { AvatarConfig } from '../components/Avatar2D';
import { TutorialOverlay } from '../components/TutorialOverlay';

function getNextSunday20h() {
    const now = new Date();
    const d = new Date(now);
    const day = d.getDay(); // 0 is Sunday
    let diff = 0 - day;
    if (diff < 0 || (diff === 0 && d.getHours() >= 20)) {
        diff += 7;
    }
    d.setDate(d.getDate() + diff);
    d.setHours(20, 0, 0, 0);
    return d.getTime();
}

interface RankEntry {
    id: string;
    display_name: string;
    avatar_url: string | null;
    friend_id: string;
    streak: number;
    score: number;
    league: string;
    avatar_config?: Partial<AvatarConfig> | null;
    isMe?: boolean;
}

const LEAGUES = [
    { id: 'Bronze', label: 'Bronze', icon: Shield, color: '#CD7F32' },
    { id: 'Prata', label: 'Prata', icon: Medal, color: '#C0C0C0' },
    { id: 'Ouro', label: 'Ouro', icon: Star, color: '#FFD700' },
    { id: 'Diamante', label: 'Diamante', icon: Trophy, color: '#00FFFF' },
    { id: 'Campeonato', label: 'Campeonato', icon: Crown, color: '#FF00FF' }
];

export default function RankingPage() {
    const { user, profile } = useGameStore();
    const location = useLocation();
    const [tab, setTab] = useState<string>(profile?.league || 'Bronze');
    const [data, setData] = useState<RankEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number } | null>(null);
    const [showPromotionModal, setShowPromotionModal] = useState(false);
    const [showDemotionModal, setShowDemotionModal] = useState(false);
    const [promotionData, setPromotionData] = useState<{ from: string; to: string } | null>(null);
    const [demotionData, setDemotionData] = useState<{ from: string; to: string } | null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<RankEntry | null>(null);
    const [friendStatus, setFriendStatus] = useState<'none' | 'pending_sent' | 'accepted'>('none');
    const [addingFriend, setAddingFriend] = useState(false);
    const [fullBodyPlayer, setFullBodyPlayer] = useState<RankEntry | null>(null);

    // Close panel when navigating away
    useEffect(() => { setSelectedPlayer(null); }, [location.pathname]);

    useEffect(() => {
        const target = getNextSunday20h();
        const update = () => {
            const diff = Math.max(0, target - Date.now());
            setTimeLeft({
                d: Math.floor(diff / (1000 * 60 * 60 * 24)),
                h: Math.floor((diff / (1000 * 60 * 60)) % 24),
                m: Math.floor((diff / 1000 / 60) % 60)
            });
        };
        update();
        const interval = setInterval(update, 60000); // update every minute
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (profile?.league && !tab) setTab(profile.league);
    }, [profile?.league]);

    useEffect(() => {
        fetchRanking();
        checkPromotionStatus();
    }, [tab, user?.id]);

    const checkPromotionStatus = async () => {
        if (!user?.id) return;

        try {
            const { data: profileData, error } = await supabase
                .from('profiles')
                .select('promotion_timestamp, demotion_timestamp, previous_league, promotion_seen, demotion_seen, league')
                .eq('id', user.id)
                .single();

            if (!error && profileData) {
                // Check for unseen promotion
                if (profileData.promotion_timestamp && !profileData.promotion_seen && profileData.previous_league) {
                    setPromotionData({
                        from: profileData.previous_league,
                        to: profileData.league
                    });
                    setShowPromotionModal(true);

                    // Mark as seen
                    await supabase.rpc('mark_promotion_seen', { p_user_id: user.id });
                }

                // Check for unseen demotion
                if (profileData.demotion_timestamp && !profileData.demotion_seen && profileData.previous_league) {
                    setDemotionData({
                        from: profileData.previous_league,
                        to: profileData.league
                    });
                    setShowDemotionModal(true);

                    // Mark as seen
                    await supabase.rpc('mark_demotion_seen', { p_user_id: user.id });
                }
            }
        } catch (e) {
            console.error('Error checking promotion status:', e);
        }
    };

    const fetchRanking = async () => {
        setLoading(true);
        try {
            const { data: leagueData } = await supabase
                .from('profiles')
                .select('id, display_name, avatar_url, friend_id, streak, score, league, avatar_config')
                .eq('league', tab)
                .order('score', { ascending: false })
                .limit(50);

            if (leagueData) {
                setData(leagueData.map(p => ({ ...p, isMe: p.id === user?.id })));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const activeLeagueConfig = LEAGUES.find(l => l.id === tab) || LEAGUES[0];
    const LeagueIcon = activeLeagueConfig.icon;
    const leagueColor = activeLeagueConfig.color;

    const getAvatar = (name: string) => {
        const emojis = ['🦁', '🐺', '🦊', '🐻', '🦅', '🐯', '🦋', '🐼', '⚡', '🌟'];
        return emojis[(name || 'a').charCodeAt(0) % emojis.length];
    };

    const openPlayer = async (entry: RankEntry) => {
        if (entry.id === user?.id) return;
        setSelectedPlayer(entry);
        setFriendStatus('none');
        setAddingFriend(false);
        // Check existing friendship
        if (user?.id) {
            const { data: fs } = await supabase
                .from('friendships')
                .select('status, user_id')
                .or(`and(user_id.eq.${user.id},friend_id.eq.${entry.id}),and(user_id.eq.${entry.id},friend_id.eq.${user.id})`)
                .limit(1)
                .maybeSingle();
            if (fs) {
                setFriendStatus(fs.status === 'accepted' ? 'accepted' : 'pending_sent');
            }
        }
    };

    const handleAddFriendFromRanking = async () => {
        if (!selectedPlayer || !user?.id || !profile) return;
        setAddingFriend(true);
        await supabase.from('friendships').insert({
            user_id: user.id, friend_id: selectedPlayer.id, status: 'pending',
        });
        await supabase.from('notifications').insert({
            user_id: selectedPlayer.id,
            type: 'friend_request',
            title: 'Solicitação de amizade',
            body: `${profile.display_name} quer ser seu amigo!`,
            metadata: JSON.stringify({ sender_id: user.id, sender_name: profile.display_name }),
        });
        setFriendStatus('pending_sent');
        setAddingFriend(false);
    };

    return (
        <div className="min-h-screen pb-24">
            {/* Player Profile Modal — portal escapes the canvas CSS-transform containing block */}
            {createPortal(
                <AnimatePresence>
                    {selectedPlayer && (
                        <motion.div
                            key="profile-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                width: '100vw',
                                height: '100dvh',
                                zIndex: 9998,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(0,0,0,0.82)',
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                            }}
                            onClick={() => setSelectedPlayer(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                                onClick={e => e.stopPropagation()}
                                className="w-[calc(100vw-2rem)] max-w-sm rounded-3xl p-6"
                                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-glow)' }}
                            >
                                <div className="flex items-start gap-4 mb-5">
                                    <button onClick={() => setFullBodyPlayer(selectedPlayer)} className="transition-transform active:scale-95">
                                        <FlippableProfilePic
                                            avatarUrl={selectedPlayer.avatar_url}
                                            avatarConfig={selectedPlayer.avatar_config}
                                            fallbackAvatar={getAvatar(selectedPlayer.display_name)}
                                            size={64}
                                            autoFlip={true}
                                            className="shadow-lg border border-white/10"
                                        />
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-xl font-black text-gradient-gold truncate">{selectedPlayer.display_name}</h2>
                                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{selectedPlayer.league} · #{selectedPlayer.friend_id}</p>
                                        <div className="flex gap-3 mt-2">
                                            <span className="text-xs font-bold" style={{ color: 'var(--color-gold)' }}>{selectedPlayer.score} pts</span>
                                            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>🔥 {selectedPlayer.streak} dias</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedPlayer(null)}
                                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: 'var(--color-glass)', color: 'var(--color-text-muted)' }}>
                                        <X size={16} />
                                    </button>
                                </div>
                                {friendStatus === 'none' && (
                                    <button onClick={handleAddFriendFromRanking} disabled={addingFriend}
                                        className="btn-gold w-full flex items-center justify-center gap-2">
                                        {addingFriend ? 'Enviando...' : <><UserPlus size={15} /> Adicionar como amigo</>}
                                    </button>
                                )}
                                {friendStatus === 'pending_sent' && (
                                    <div className="w-full py-3 rounded-2xl text-center text-sm font-bold flex items-center justify-center gap-2"
                                        style={{ background: 'rgba(212,168,83,0.08)', color: 'var(--color-gold-dim)', border: '1px solid rgba(212,168,83,0.2)' }}>
                                        <Check size={15} /> Solicitação enviada
                                    </div>
                                )}
                                {friendStatus === 'accepted' && (
                                    <div className="w-full py-3 rounded-2xl text-center text-sm font-bold flex items-center justify-center gap-2"
                                        style={{ background: 'rgba(45,212,191,0.08)', color: 'var(--color-success)', border: '1px solid rgba(45,212,191,0.2)' }}>
                                        <Check size={15} /> Já são amigos
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}


            {/* Full Body Overlay */}
            <FullBodyAvatarModal
                open={!!fullBodyPlayer}
                onClose={() => setFullBodyPlayer(null)}
                avatarConfig={fullBodyPlayer?.avatar_config}
                displayName={fullBodyPlayer?.display_name || ''}
            />

            {/* Modals */}
            {
                promotionData && (
                    <PromotionModal
                        isOpen={showPromotionModal}
                        fromLeague={promotionData.from}
                        toLeague={promotionData.to}
                        onClose={() => {
                            setShowPromotionModal(false);
                            setPromotionData(null);
                        }}
                    />
                )
            }
            {
                demotionData && (
                    <DemotionModal
                        isOpen={showDemotionModal}
                        fromLeague={demotionData.from}
                        toLeague={demotionData.to}
                        onClose={() => {
                            setShowDemotionModal(false);
                            setDemotionData(null);
                        }}
                    />
                )
            }

            {/* Header */}
            <div className="px-5 pt-10 pb-6">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-xs tracking-[0.3em] uppercase mb-1" style={{ color: 'var(--color-gold-dim)' }}>Divisões</p>
                        <h1 className="text-3xl font-black text-display flex items-center gap-3">
                            <span className="text-gradient-gold">Liga</span>
                            <span style={{ color: leagueColor }}>{tab}</span>
                        </h1>
                    </div>
                    {timeLeft && (
                        <div className="text-right pb-1">
                            <p className="text-[9px] uppercase font-bold mb-1" style={{ color: 'var(--color-text-muted)' }}>Encerra em</p>
                            <div className="flex gap-1.5 items-center font-mono">
                                <span className="bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded text-[10px] font-black">{timeLeft.d}d</span>
                                <span className="bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded text-[10px] font-black">{String(timeLeft.h).padStart(2, '0')}h</span>
                                <span className="bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded text-[10px] font-black">{String(timeLeft.m).padStart(2, '0')}m</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* League Tabs */}
                <div id="tutorial-ranking-leagues" className="flex overflow-x-auto gap-2 mt-6 pb-2" style={{ scrollbarWidth: 'none' }}>
                    {LEAGUES.map(({ id, icon: Icon, color }) => (
                        <button key={id} onClick={() => setTab(id)}
                            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all relative"
                            style={{
                                background: tab === id ? 'var(--color-glass-strong)' : 'var(--color-glass)',
                                color: tab === id ? color : 'var(--color-text-muted)',
                                border: `1px solid ${tab === id ? `${color}40` : 'transparent'}`,
                                opacity: tab === id ? 1 : 0.6,
                            }}>
                            <Icon size={16} style={{ color: tab === id ? color : 'var(--color-text-muted)' }} />
                            {id}
                            {profile?.league === id && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
                        </button>
                    ))}
                </div>
            </div>

            {
                loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <LoaderIcon color={leagueColor} />
                            <p className="text-sm mt-3" style={{ color: 'var(--color-text-muted)' }}>Procurando oponentes...</p>
                        </div>
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                        <LeagueIcon size={48} style={{ color: leagueColor, opacity: 0.5, marginBottom: 16 }} />
                        <p className="font-bold text-lg mb-2 text-[var(--color-text)]">Liga Vazia</p>
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Ainda não há jogadores nesta divisão.</p>
                    </div>
                ) : (
                    <div id="tutorial-ranking-list" className="px-5 space-y-3 mt-4">
                        {data.map((entry, i) => {
                            // Position info
                            const pos = i + 1;
                            let medalInfo = null;

                            // Podium medals for top 3
                            if (pos === 1) medalInfo = { icon: '🥇', bg: 'linear-gradient(135deg, #FFB800, #F29100)', shadow: 'rgba(255, 184, 0, 0.4)' };
                            else if (pos === 2) medalInfo = { icon: '🥈', bg: 'linear-gradient(135deg, #E0E0E0, #9E9E9E)', shadow: 'rgba(224, 224, 224, 0.4)' };
                            else if (pos === 3) medalInfo = { icon: '🥉', bg: 'linear-gradient(135deg, #CD7F32, #A0522D)', shadow: 'rgba(205, 127, 50, 0.4)' };

                            // League Promotion/Demotion Logic
                            const total = data.length;
                            let status: 'promo' | 'neutral' | 'down' = 'neutral';

                            if (tab === 'Bronze') {
                                if (pos <= total * 0.3) status = 'promo';
                            } else if (tab === 'Prata') {
                                if (pos <= total * 0.2) status = 'promo';
                                else if (pos > total * 0.8) status = 'down';
                            } else if (tab === 'Ouro') {
                                if (pos <= total * 0.1) status = 'promo';
                                else if (pos > total * 0.7) status = 'down';
                            } else if (tab === 'Diamante') {
                                if (pos <= total * 0.05) status = 'promo';
                                else if (pos > total * 0.5) status = 'down';
                            } else if (tab === 'Campeonato') {
                                if (pos > total * 0.3) status = 'down';
                            }

                            const statusStyle = status === 'promo'
                                ? { color: '#4ADE80', bg: 'rgba(74, 222, 128, 0.1)', label: 'ZONA DE PROMOÇÃO' }
                                : status === 'down'
                                    ? { color: '#F87171', bg: 'rgba(248, 113, 113, 0.1)', label: 'ZONA DE QUEDA' }
                                    : null;

                            return (
                                <motion.div key={entry.id}
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="flex items-center justify-between p-2 rounded-full cursor-pointer"
                                    style={{
                                        background: entry.isMe ? 'var(--color-glass-strong)' : 'var(--color-glass)',
                                        border: entry.isMe ? '1px solid var(--color-glass-strong)' : '1px solid var(--color-glass)',
                                    }}
                                    onClick={() => openPlayer(entry)}
                                >

                                    <div className="flex items-center gap-4">
                                        {/* Avatar */}
                                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-inner flex-shrink-0 overflow-hidden"
                                            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                            {entry.avatar_url ? (
                                                <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                getAvatar(entry.display_name)
                                            )}
                                        </div>

                                        <div className="flex flex-col">
                                            <span className="font-extrabold text-[var(--color-text)] text-[15px] truncate max-w-[120px] sm:max-w-[200px]">
                                                {entry.display_name}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-bold" style={{ color: 'var(--color-gold-dim)' }}>
                                                    {entry.score} pts
                                                </span>
                                                {statusStyle && (
                                                    <span className="text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"
                                                        style={{ background: statusStyle.bg, color: statusStyle.color }}>
                                                        {statusStyle.label}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rank/Medal Circle */}
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center relative flex-shrink-0"
                                        style={{
                                            background: medalInfo ? medalInfo.bg : 'rgba(255,255,255,0.05)',
                                            boxShadow: medalInfo ? `0 0 15px ${medalInfo.shadow}` : 'none',
                                        }}>
                                        {medalInfo ? (
                                            <>
                                                <span className="text-sm drop-shadow-md relative z-10">{medalInfo.icon}</span>
                                                <div className="absolute -bottom-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black z-20"
                                                    style={{ background: 'var(--color-overlay-heavy)', color: 'var(--color-text)', border: '1px solid var(--color-glass-strong)' }}>
                                                    {pos}
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-sm font-black" style={{ color: 'var(--color-text-muted)' }}>{pos}</span>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )
            }

            <TutorialOverlay
                tutorialKey="ranking_seen"
                steps={[
                    {
                        target: 'body',
                        content: 'Bem-vindo ao Ranking!',
                        placement: 'center',
                        disableBeacon: true,
                    },
                    {
                        target: '#tutorial-ranking-leagues',
                        content: 'Estas são as divisões. Você só compete com os jogadores que estão na MESMA liga que você.',
                        disableBeacon: true,
                    },
                    {
                        target: '#tutorial-ranking-list',
                        content: 'Garantir uma boa posição até o Domingo às 20h promove você de liga. Mas cuidado com a Zona de Rebaixamento em vermelho!',
                        disableBeacon: true,
                    }
                ]}
            />
        </div >
    );
}

function LoaderIcon({ color }: { color: string }) {
    return (
        <svg width="38" height="38" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" stroke={color}>
            <g fill="none" fillRule="evenodd">
                <g transform="translate(1 1)" strokeWidth="2">
                    <circle strokeOpacity=".5" cx="18" cy="18" r="18" />
                    <path d="M36 18c0-9.94-8.06-18-18-18">
                        <animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="1s" repeatCount="indefinite" />
                    </path>
                </g>
            </g>
        </svg>
    )
}
