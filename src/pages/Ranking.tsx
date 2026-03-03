import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Star, Crown, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/useGameStore';
import { PromotionModal } from '../components/PromotionModal';
import { DemotionModal } from '../components/DemotionModal';

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
    const [tab, setTab] = useState<string>(profile?.league || 'Bronze');
    const [data, setData] = useState<RankEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number } | null>(null);
    const [showPromotionModal, setShowPromotionModal] = useState(false);
    const [showDemotionModal, setShowDemotionModal] = useState(false);
    const [promotionData, setPromotionData] = useState<{ from: string; to: string } | null>(null);
    const [demotionData, setDemotionData] = useState<{ from: string; to: string } | null>(null);

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
                .select('id, display_name, avatar_url, friend_id, streak, score, league')
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

    return (
        <div className="min-h-screen pb-24">
            {/* Modals */}
            {promotionData && (
                <PromotionModal
                    isOpen={showPromotionModal}
                    fromLeague={promotionData.from}
                    toLeague={promotionData.to}
                    onClose={() => {
                        setShowPromotionModal(false);
                        setPromotionData(null);
                    }}
                />
            )}
            {demotionData && (
                <DemotionModal
                    isOpen={showDemotionModal}
                    fromLeague={demotionData.from}
                    toLeague={demotionData.to}
                    onClose={() => {
                        setShowDemotionModal(false);
                        setDemotionData(null);
                    }}
                />
            )}

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
                <div className="flex overflow-x-auto gap-2 mt-6 pb-2" style={{ scrollbarWidth: 'none' }}>
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

            {loading ? (
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
                <div className="px-5 space-y-3 mt-4">
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
                                className="flex items-center justify-between p-2 rounded-full"
                                style={{
                                    background: entry.isMe ? 'var(--color-glass-strong)' : 'var(--color-glass)',
                                    border: entry.isMe ? '1px solid var(--color-glass-strong)' : '1px solid var(--color-glass)',
                                }}>

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
            )}
        </div>
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
