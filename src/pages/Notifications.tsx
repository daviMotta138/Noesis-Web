// src/pages/Notifications.tsx — Sistema de notificações
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Flame, Coins, Shield, Trophy, Users, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/useGameStore';

interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    read_at: string | null;
    created_at: string;
}

const TYPE_ICON: Record<string, { Icon: React.FC<{ size?: number; style?: React.CSSProperties }>, color: string }> = {
    friend_request: { Icon: Users, color: 'var(--color-indigo)' },
    nous_earned: { Icon: Coins, color: 'var(--color-gold)' },
    streak_broken: { Icon: Flame, color: 'var(--color-danger)' },
    shield_used: { Icon: Shield, color: 'var(--color-success)' },
    league_up: { Icon: Trophy, color: 'var(--color-gold)' },
    league_down: { Icon: Trophy, color: 'var(--color-danger)' },
    system: { Icon: Sparkles, color: 'var(--color-indigo)' },
};

function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}m atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

export default function NotificationsPage() {
    const { user } = useGameStore();
    const [notifs, setNotifs] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifs = async () => {
        if (!user?.id) return;
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);
        setNotifs(data ?? []);
        setLoading(false);
    };

    useEffect(() => { fetchNotifs(); }, [user?.id]);

    const markAllRead = async () => {
        if (!user?.id) return;
        await supabase.from('notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .is('read_at', null);
        setNotifs(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    };

    const deleteAllNotifs = async () => {
        if (!user?.id) return;
        await supabase.from('notifications').delete().eq('user_id', user.id);
        setNotifs([]);
    };

    const markRead = async (id: string) => {
        await supabase.from('notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('id', id);
        setNotifs(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    };

    const deleteNotif = async (id: string) => {
        await supabase.from('notifications').delete().eq('id', id);
        setNotifs(prev => prev.filter(n => n.id !== id));
    };

    const unread = notifs.filter(n => !n.read_at).length;

    return (
        <div className="min-h-screen pb-24">
            <div className="px-5 pt-10 pb-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs tracking-[0.3em] uppercase mb-1" style={{ color: 'var(--color-gold-dim)' }}>Central</p>
                        <h1 className="text-3xl font-black text-display">
                            <span className="text-gradient-gold">Notificações</span>
                        </h1>
                    </div>
                    {notifs.length > 0 && (
                        <div className="flex flex-col md:flex-row items-end md:items-center gap-2 mt-3">
                            {unread > 0 && (
                                <button onClick={markAllRead}
                                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl"
                                    style={{ background: 'rgba(212,168,83,0.1)', color: 'var(--color-gold)', border: '1px solid rgba(212,168,83,0.2)' }}>
                                    <CheckCheck size={13} /> Marcar lidas
                                </button>
                            )}
                            <button onClick={deleteAllNotifs}
                                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl"
                                style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--color-danger)', border: '1px solid rgba(248,113,113,0.2)' }}>
                                <Trash2 size={13} /> Apagar todas
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <p className="text-sm animate-pulse" style={{ color: 'var(--color-text-muted)' }}>Carregando...</p>
                </div>
            ) : (
                <div className="px-5 relative min-h-[50vh]">
                    <div className="space-y-2">
                        <AnimatePresence initial={false}>
                            {notifs.map((n) => {
                                const entry = TYPE_ICON[n.type] ?? TYPE_ICON.system;
                                const { Icon, color } = entry;
                                const isUnread = !n.read_at;
                                return (
                                    <motion.div key={n.id} layout
                                        initial={{ opacity: 0, x: -8, scale: 0.95 }}
                                        animate={{ opacity: 1, x: 0, scale: 1 }}
                                        exit={{ opacity: 0, x: 20, scale: 0.95, transition: { duration: 0.2 } }}
                                        className="panel px-4 py-4 flex items-start gap-4 cursor-pointer"
                                        style={{
                                            border: isUnread ? '1px solid rgba(212,168,83,0.3)' : '1px solid var(--color-border)',
                                            background: isUnread ? 'rgba(212,168,83,0.04)' : undefined,
                                        }}
                                        onClick={() => isUnread && markRead(n.id)}>
                                        {/* Icon */}
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{ background: `${color}18`, border: `1px solid ${color}35` }}>
                                            <Icon size={16} style={{ color }} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                                                    {n.title}
                                                </p>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {isUnread && (
                                                        <div className="w-2 h-2 rounded-full flex-shrink-0"
                                                            style={{ background: 'var(--color-gold)' }} />
                                                    )}
                                                    <button onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }}
                                                        className="opacity-40 hover:opacity-100 transition-opacity">
                                                        <Trash2 size={12} style={{ color: 'var(--color-text-muted)' }} />
                                                    </button>
                                                </div>
                                            </div>
                                            {n.body && (
                                                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-sub)' }}>
                                                    {n.body}
                                                </p>
                                            )}
                                            <p className="text-[10px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                                                {formatDate(n.created_at)}
                                            </p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {/* Empty State Overlay */}
                    <AnimatePresence>
                        {notifs.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-x-0 top-10 flex flex-col items-center justify-center py-20 px-8 text-center gap-4"
                            >
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                                    style={{ background: 'rgba(212,168,83,0.08)', border: '1px solid rgba(212,168,83,0.2)' }}>
                                    <Bell size={28} strokeWidth={1.2} style={{ color: 'var(--color-gold-dim)' }} />
                                </div>
                                <p className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Tudo em ordem</p>
                                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Nenhuma notificação ainda.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
