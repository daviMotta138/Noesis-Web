import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/useGameStore';
import shieldImg from '../assets/shield.png';

// ─── Calendar helpers ─────────────────────────────────────────────────────────
function buildCalendar(activeDates: Set<string>): { date: Date; active: boolean; isToday: boolean }[] {
    const today = new Date();
    const days: { date: Date; active: boolean; isToday: boolean }[] = [];
    for (let i = 34; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        days.push({ date: d, active: activeDates.has(key), isToday: i === 0 });
    }
    return days;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_PT: Record<number, string> = {
    0: 'Jan', 1: 'Fev', 2: 'Mar', 3: 'Abr', 4: 'Mai', 5: 'Jun',
    6: 'Jul', 7: 'Ago', 8: 'Set', 9: 'Out', 10: 'Nov', 11: 'Dez'
};

// ─── Streak milestones ────────────────────────────────────────────────────────
const MILESTONES = [
    { days: 7, label: '1 Semana', emoji: '⚡', color: '#5B5FDE' },
    { days: 30, label: '1 Mês', emoji: '🏆', color: '#D4A853' },
    { days: 100, label: '100 Dias', emoji: '💜', color: '#8B5CF6' },
    { days: 365, label: '1 Ano', emoji: '👑', color: '#F87171' },
];

export default function StreakPage() {
    const navigate = useNavigate();
    const { profile, user } = useGameStore();
    const streak = profile?.streak ?? 0;
    const shields = profile?.shield_count ?? 0;  // shield_count is the correct field
    const [activeDates, setActiveDates] = useState<Set<string>>(new Set());
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [bestStreak, setBestStreak] = useState(streak);

    useEffect(() => {
        if (!user?.id) return;
        const fetchHistory = async () => {
            const { data } = await supabase
                .from('daily_sessions')
                .select('recalled_at')
                .eq('user_id', user.id)
                .not('recalled_at', 'is', null)
                .order('recalled_at', { ascending: false });
            if (data) {
                const dates = new Set(data.map(s => (s.recalled_at as string).slice(0, 10)));
                setActiveDates(dates);
                setBestStreak(Math.max(streak, dates.size));
            }
            setLoadingHistory(false);
        };
        fetchHistory();
    }, [user?.id, streak]);

    const calendar = buildCalendar(activeDates);

    // Group by week (rows of 7)
    const weeks: typeof calendar[] = [];
    for (let i = 0; i < calendar.length; i += 7) { weeks.push(calendar.slice(i, i + 7)); }

    return (
        <div className="min-h-screen">
            {/* Back */}
            <div className="px-8 pt-8 pb-0">
                <button onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-sm font-semibold mb-6"
                    style={{ color: 'var(--color-text-muted)' }}>
                    <ArrowLeft size={16} /> Voltar
                </button>
            </div>

            <div className="px-8 max-w-2xl mx-auto pb-12">
                {/* ── Hero ── */}
                <div className="text-center mb-10">
                    <motion.div
                        animate={{ scale: [1, 1.12, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                            display: 'inline-block', marginBottom: 12,
                            filter: 'drop-shadow(0 0 30px rgba(255,107,53,0.8))'
                        }}>
                        <span style={{ fontSize: 80 }}>🔥</span>
                    </motion.div>
                    <p className="text-xs tracking-[0.4em] uppercase mb-2" style={{ color: 'var(--color-gold-dim)' }}>
                        Sua Ofensiva
                    </p>
                    <h1 className="font-black text-display" style={{ fontSize: 88, lineHeight: 1, color: 'var(--color-fire)' }}>
                        {streak}
                    </h1>
                    <p className="text-xl font-bold mt-1" style={{ color: 'var(--color-text-sub)' }}>
                        {streak === 1 ? 'dia seguido' : 'dias seguidos'}
                    </p>

                    {/* Encouraging message */}
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                        className="mt-4 text-sm px-4"
                        style={{ color: 'var(--color-gold)', fontWeight: 600 }}>
                        {streak === 0 ? 'Complete sua sessão de hoje para começar sua ofensiva!' :
                            streak < 7 ? `Incrível! Continue por mais ${7 - streak} dias para atingir 1 semana!` :
                                streak < 30 ? `Você está em chamas! Faltam ${30 - streak} dias para 1 mês!` :
                                    streak < 100 ? `Lendário! ${100 - streak} dias para a conquista de 100 dias!` :
                                        '🏆 Mestre supremo da memória! Continue sendo inspiração!'}
                    </motion.p>
                </div>

                {/* ── Stats row ── */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                        { label: 'Ofensiva atual', val: streak, icon: '🔥', color: 'var(--color-fire)' },
                        { label: 'Melhor sequência', val: bestStreak, icon: '🏆', color: 'var(--color-gold)' },
                        { label: 'Escudos', val: shields, icon: <img src={shieldImg} className="w-7 h-7 object-contain inline-block" alt="" />, color: '#818CF8' },
                    ].map(({ label, val, icon, color }) => (
                        <div key={label} className="panel p-4 text-center"
                            style={{ border: '1px solid var(--color-border-glow)' }}>
                            <p className="text-3xl font-black mb-1" style={{ color }}>{icon} {val}</p>
                            <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                                {label}
                            </p>
                        </div>
                    ))}
                </div>

                {/* ── Streak shields / freeze ── */}
                <div className="panel p-5 mb-8" style={{ border: '1px solid rgba(129,140,248,0.3)', background: 'rgba(129,140,248,0.05)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <img src={shieldImg} className="w-5 h-5 object-contain" alt="" />
                            <p className="font-black" style={{ color: 'var(--color-text)' }}>Escudo de Ofensiva</p>
                        </div>
                        <span className="badge-indigo">{shields} disponíveis</span>
                    </div>
                    <p className="text-sm mb-4" style={{ color: 'var(--color-text-sub)' }}>
                        Um escudo protege sua ofensiva se você perder um dia. Use com sabedoria!
                    </p>
                    <div className="flex gap-2">
                        {shields === 0 ? (
                            <button onClick={() => navigate('/shop')}
                                className="btn-ghost text-sm flex-1 flex items-center justify-center gap-2">
                                <img src={shieldImg} className="w-3.5 h-3.5 object-contain" alt="" /> Comprar escudo na loja
                            </button>
                        ) : (
                            [...Array(Math.min(shields, 7))].map((_, i) => (
                                <div key={i} className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                                    style={{ background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.3)' }}>
                                    <img src={shieldImg} className="w-5 h-5 object-contain" alt="" />
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ── Calendar ── */}
                <div className="panel p-5 mb-8" style={{ border: '1px solid var(--color-border-glow)' }}>
                    <div className="flex items-center gap-2 mb-5">
                        <Calendar size={18} style={{ color: 'var(--color-gold)' }} />
                        <p className="font-black" style={{ color: 'var(--color-text)' }}>Histórico de 35 dias</p>
                    </div>

                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                        {WEEKDAYS.map(d => (
                            <p key={d} className="text-center text-[10px] font-bold uppercase tracking-wide"
                                style={{ color: 'var(--color-text-muted)' }}>{d}</p>
                        ))}
                    </div>

                    {loadingHistory ? (
                        <div className="h-32 flex items-center justify-center">
                            <p className="text-sm animate-pulse" style={{ color: 'var(--color-text-muted)' }}>Carregando...</p>
                        </div>
                    ) : (
                        weeks.map((week, wi) => (
                            <div key={wi} className="grid grid-cols-7 gap-1.5 mb-1.5">
                                {week.map(({ date, active, isToday }, di) => (
                                    <motion.div key={di}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: (wi * 7 + di) * 0.01 }}
                                        className="aspect-square rounded-xl flex flex-col items-center justify-center"
                                        style={{
                                            background: active
                                                ? 'linear-gradient(135deg, #FF6B35 0%, #FF913A 100%)'
                                                : isToday
                                                    ? 'rgba(255,107,53,0.15)'
                                                    : 'var(--color-glass)',
                                            border: isToday
                                                ? '1.5px solid rgba(255,107,53,0.6)'
                                                : active
                                                    ? 'none'
                                                    : '1px solid var(--color-border)',
                                            boxShadow: active ? '0 2px 12px rgba(255,107,53,0.4)' : 'none',
                                        }}>
                                        {active ? (
                                            <span style={{ fontSize: 16, filter: 'drop-shadow(0 0 4px rgba(255,107,53,0.8))' }}>🔥</span>
                                        ) : (
                                            <div>
                                                <p className="text-[9px] text-center font-bold" style={{ color: isToday ? 'var(--color-fire)' : 'var(--color-text-muted)' }}>
                                                    {date.getDate()}
                                                </p>
                                                <p className="text-[8px] text-center" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                                                    {MONTHS_PT[date.getMonth()]}
                                                </p>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        ))
                    )}
                </div>

                {/* ── Milestones ── */}
                <div className="panel p-5" style={{ border: '1px solid var(--color-border-glow)' }}>
                    <div className="flex items-center gap-2 mb-5">
                        <Trophy size={18} style={{ color: 'var(--color-gold)' }} />
                        <p className="font-black" style={{ color: 'var(--color-text)' }}>Conquistas de Ofensiva</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {MILESTONES.map(m => {
                            const reached = streak >= m.days;
                            return (
                                <div key={m.days} className="rounded-2xl p-4 flex items-center gap-3"
                                    style={{
                                        background: reached ? `${m.color}15` : 'var(--color-glass)',
                                        border: `1px solid ${reached ? m.color + '50' : 'var(--color-border)'}`,
                                    }}>
                                    <span style={{ fontSize: 28, filter: reached ? `drop-shadow(0 0 8px ${m.color})` : 'grayscale(1)', opacity: reached ? 1 : 0.4 }}>
                                        {m.emoji}
                                    </span>
                                    <div>
                                        <p className="text-sm font-black" style={{ color: reached ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                                            {m.label}
                                        </p>
                                        <p className="text-xs" style={{ color: reached ? m.color : 'var(--color-text-muted)' }}>
                                            {reached ? '✓ Conquistado!' : `${m.days - streak} dias restantes`}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
