// src/pages/Admin.tsx — Painel Admin Completo
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, Clock, Image as ImageIcon,
    Search, Trash2, Upload, Shield, Coins, Loader2, User, Music, Bell, Send
} from 'lucide-react';
// test utilities
import { LeaguePromotionTester } from '../components/LeaguePromotionTester';
import { useGameStore } from '../store/useGameStore';
import { supabase } from '../lib/supabase';

type Tab = 'overview' | 'users' | 'time' | 'banners' | 'radio' | 'push' | 'promo';

export default function AdminPage() {
    const navigate = useNavigate();
    const { profile, user, phase, session, setPhase, setUnlockAt, loadActiveSession, fetchProfile } = useGameStore();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [log, setLog] = useState<string[]>([]);

    if (!profile?.is_admin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <Shield size={48} style={{ color: 'var(--color-danger)' }} />
                <p className="text-lg font-bold" style={{ color: 'var(--color-danger)' }}>Acesso restrito</p>
                <button onClick={() => navigate('/')} className="btn-ghost">Voltar ao início</button>
            </div>
        );
    }

    const addLog = (msg: string) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);

    return (
        <div className="flex flex-col md:flex-row bg-void min-h-[calc(100vh-64px)] rounded-3xl overflow-hidden" style={{ border: '1px solid var(--color-border)', background: 'var(--color-deep)' }}>
            {/* Admin Sidebar */}
            <div className="w-full md:w-56 flex-shrink-0 flex flex-col pt-4 md:pt-6 pb-4 md:pb-6" style={{ borderRight: '1px solid var(--color-border)', background: 'var(--color-glass-strong)' }}>
                <div className="px-5 mb-4 md:mb-8">
                    <p className="text-[10px] tracking-[0.3em] font-bold" style={{ color: 'var(--color-danger)' }}>ZONA RESTRITA</p>
                    <h2 className="text-xl font-black text-white mt-1">Admin Panel</h2>
                </div>
                <nav className="px-3 flex md:flex-col flex-row gap-2 md:gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={LayoutDashboard} label="Visão Geral" />
                    <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="Usuários" />
                    <TabButton active={activeTab === 'banners'} onClick={() => setActiveTab('banners')} icon={ImageIcon} label="Atualizações" />
                    <TabButton active={activeTab === 'radio'} onClick={() => setActiveTab('radio')} icon={Music} label="Rádio" />
                    <TabButton active={activeTab === 'push'} onClick={() => setActiveTab('push')} icon={Bell} label="Push Notif" />
                    <TabButton active={activeTab === 'promo'} onClick={() => setActiveTab('promo')} icon={LayoutDashboard} label="Promoções" />
                    <TabButton active={activeTab === 'time'} onClick={() => setActiveTab('time')} icon={Clock} label="Testes/Tempo" />
                </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-[calc(100vh-100px)] overflow-y-auto">
                <div className="p-8 max-w-5xl mx-auto w-full">
                    <AnimatePresence mode="wait">
                        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                            {activeTab === 'overview' && <OverviewTab />}
                            {activeTab === 'users' && <UsersTab addLog={addLog} />}
                            {activeTab === 'banners' && <BannersTab addLog={addLog} />}
                            {activeTab === 'radio' && <RadioTab addLog={addLog} />}
                            {activeTab === 'push' && <PushTab addLog={addLog} />}
                            {activeTab === 'time' && <TimeTab addLog={addLog} session={session} user={user} phase={phase} setPhase={setPhase} setUnlockAt={setUnlockAt} loadActiveSession={loadActiveSession} fetchProfile={fetchProfile} />}
                            {activeTab === 'promo' && <LeaguePromotionTester />}
                        </motion.div>
                    </AnimatePresence>

                    {/* Console Log */}
                    {log.length > 0 && (
                        <div className="mt-12 panel p-4 bg-[var(--color-glass)] border-gray-800">
                            <p className="text-xs font-mono text-gray-400 mb-3 uppercase tracking-widest">System Log</p>
                            <div className="space-y-1 font-mono text-[11px] h-32 overflow-y-auto">
                                {log.map((l, i) => (
                                    <p key={i} style={{ color: l.includes('Erro') ? '#f87171' : '#a1a1aa' }}>{l}</p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Shared UI Components ──
function TabButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
    return (
        <button onClick={onClick} className={`flex-shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20' : 'text-gray-400 hover:bg-white/5 border border-transparent'}`}>
            <Icon size={16} /> <span className="whitespace-nowrap">{label}</span>
        </button>
    );
}

function StatCard({ label, value, icon: Icon, color }: { label: string, value: string | number, icon: any, color: string }) {
    return (
        <div className="panel p-5 relative overflow-hidden" style={{ border: `1px solid ${color}30` }}>
            <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
                <Icon size={100} style={{ color }} />
            </div>
            <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                    <Icon size={16} style={{ color }} />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</p>
            </div>
            <p className="text-3xl font-black text-white">{value}</p>
        </div>
    );
}

// ── 1. Overview Tab ──
function OverviewTab() {
    const [stats, setStats] = useState({ users: 0, sessionsToday: 0, totalNous: 0 });

    useEffect(() => {
        async function fetchStats() {
            const { count: uCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            const { count: sCount } = await supabase.from('daily_sessions').select('*', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().split('T')[0]);

            // For total nous, we'd normally use an RPC, but let's just fetch profiles
            const { data: profiles } = await supabase.from('profiles').select('nous_coins');
            const totalNous = profiles?.reduce((acc, p) => acc + (p.nous_coins || 0), 0) ?? 0;

            setStats({ users: uCount ?? 0, sessionsToday: sCount ?? 0, totalNous });
        }
        fetchStats();
    }, []);

    return (
        <div className="space-y-6">
            <h3 className="text-2xl font-black text-white">Visão Geral</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Total Usuários" value={stats.users} icon={Users} color="#818cf8" />
                <StatCard label="Sessões Hoje" value={stats.sessionsToday} icon={Clock} color="#34d399" />
                <StatCard label="Economia (Nous)" value={stats.totalNous.toLocaleString()} icon={Coins} color="#fbbf24" />
            </div>
        </div>
    );
}

// ── 2. Users Tab ──
function UsersTab({ addLog }: { addLog: (m: string) => void }) {
    const [search, setSearch] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const searchUsers = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setLoading(true);
        const term = `%${search}%`;
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`display_name.ilike.${term},friend_id.ilike.${term}`)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) addLog(`Erro ao buscar usuários: ${error.message}`);
        else setUsers(data || []);
        setLoading(false);
    };

    const updateUserValue = async (id: string, field: string, value: number) => {
        const { error } = await supabase.from('profiles').update({ [field]: value }).eq('id', id);
        if (error) {
            addLog(`Erro ao atualizar ${field} para ${id}`);
        } else {
            addLog(`✓ Usuário atualizado: ${field} = ${value}`);
            setUsers(prev => prev.map(u => u.id === id ? { ...u, [field]: value } : u));
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-2xl font-black text-white">Gestão de Usuários</h3>

            <form onSubmit={searchUsers} className="flex gap-2">
                <div className="flex-1 relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por nome ou Friend ID..." className="field w-full pl-10" />
                </div>
                <button type="submit" disabled={loading} className="btn-gold px-6">Buscar</button>
            </form>

            <div className="space-y-3">
                {users.map(u => (
                    <div key={u.id} className="panel p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center flex-shrink-0 border border-gray-700">
                                {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <User size={20} className="text-gray-500" />}
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-white truncate">{u.display_name}</p>
                                <p className="text-xs font-mono text-gray-500 truncate">{u.friend_id} • {u.id.substring(0, 8)}...</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 md:gap-3 border-t md:border-t-0 border-gray-800 pt-3 md:pt-0">
                            <div className="flex flex-col gap-1 items-start md:items-end flex-1 md:flex-none">
                                <span className="text-[10px] text-gray-500 font-bold uppercase">Nous</span>
                                <input type="number" defaultValue={u.nous_coins} onBlur={e => updateUserValue(u.id, 'nous_coins', parseInt(e.target.value))} className="field w-full md:w-20 py-1 text-left md:text-right text-sm" />
                            </div>
                            <div className="flex flex-col gap-1 items-start md:items-end flex-1 md:flex-none">
                                <span className="text-[10px] text-gray-500 font-bold uppercase">Ofensiva</span>
                                <input type="number" defaultValue={u.streak} onBlur={e => updateUserValue(u.id, 'streak', parseInt(e.target.value))} className="field w-full md:w-16 py-1 text-left md:text-right text-sm" />
                            </div>
                            <div className="flex flex-col gap-1 items-start md:items-end flex-1 md:flex-none">
                                <span className="text-[10px] text-gray-500 font-bold uppercase">Escudos</span>
                                <input type="number" defaultValue={u.shield_count} onBlur={e => updateUserValue(u.id, 'shield_count', parseInt(e.target.value))} className="field w-full md:w-16 py-1 text-left md:text-right text-sm" />
                            </div>
                        </div>
                    </div>
                ))}
                {users.length === 0 && !loading && (
                    <div className="text-center py-10 text-gray-500 text-sm">Use a busca para encontrar usuários.</div>
                )}
            </div>
        </div>
    );
}

// ── 3. Time Control Tab ──
function TimeTab({ addLog, session, user, phase, setPhase, setUnlockAt, loadActiveSession, fetchProfile }: any) {
    // ── Admin's own session shortcuts ──────────────────────────────────────
    const handleSkipTimer = async () => {
        if (!session || !user) { addLog('Sem sessão ativa para avançar.'); return; }
        const now = Date.now() - 1000;
        await supabase.from('daily_sessions').update({ unlocks_at: new Date(now).toISOString() }).eq('id', session.id);
        setUnlockAt(now); setPhase('recall'); addLog(`✓ Meu cronômetro avançado → Fase: recall`);
    };
    const handleSetShort = async () => {
        if (!session || !user) { addLog('Minha conta Admin não tem sessão ativa.'); return; }
        const ts = Date.now() + 10_000;
        await supabase.from('daily_sessions').update({ unlocks_at: new Date(ts).toISOString() }).eq('id', session.id);
        setUnlockAt(ts); setPhase('waiting'); addLog('✓ Meu cronômetro → 10 segundos');
    };
    const handleResetSession = async () => {
        if (!session) { addLog('Não tenho sessão pessoal para resetar.'); return; }
        await supabase.from('daily_sessions').delete().eq('id', session.id);
        setPhase('viewing'); setUnlockAt(null); addLog('✓ Minha sessão deletada → fase: viewing');
    };
    const handleReload = async () => {
        if (user?.id) { await loadActiveSession(user.id); await fetchProfile(user.id); addLog('✓ Session e perfil recarregados'); }
    };

    // ── User session picker ─────────────────────────────────────────────────
    const [userSearch, setUserSearch] = useState('');
    const [foundUsers, setFoundUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [targetSession, setTargetSession] = useState<any | null>(null);
    const [loadingSession, setLoadingSession] = useState(false);
    const [customMinutes, setCustomMinutes] = useState('60');
    const [customHours, setCustomHours] = useState('');

    // Load initial list of users
    useEffect(() => {
        const loadInitialUsers = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('id, display_name, friend_id, avatar_url, streak')
                .order('created_at', { ascending: false })
                .limit(50);
            setFoundUsers(data || []);
        };
        loadInitialUsers();
    }, []);

    const searchUsers = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const term = `%${userSearch}%`;
        const { data } = await supabase
            .from('profiles')
            .select('id, display_name, friend_id, avatar_url, streak')
            .or(`display_name.ilike.${term},friend_id.ilike.${term}`)
            .limit(foundUsers.length > 10 ? 50 : 10);
        setFoundUsers(data || []);
    };

    const selectUser = async (u: any) => {
        setSelectedUser(u);
        setFoundUsers([]);
        setUserSearch(u.display_name);
        setTargetSession(null);
        setLoadingSession(true);
        const { data, error } = await supabase
            .from('daily_sessions')
            .select('*')
            .eq('user_id', u.id)
            .is('recalled_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            addLog(`Erro ao carregar sessão de ${u.display_name}: ${error.message}`);
        } else {
            setTargetSession(data || null);
            if (data) {
                addLog(`✓ Sessão ativa de ${u.display_name} carregada`);
            } else {
                addLog(`ℹ ${u.display_name} não possui sessão ativa no momento`);
            }
        }
        setLoadingSession(false);
    };

    const updateTargetSession = async (unlockMs: number) => {
        if (!targetSession) { addLog('Usuário não tem sessão ativa.'); return; }
        const iso = new Date(unlockMs).toISOString();
        const { error } = await supabase
            .from('daily_sessions')
            .update({ unlocks_at: iso })
            .eq('id', targetSession.id);
        if (error) { addLog(`Erro ao atualizar usuário: ${error.message}`); return; }
        setTargetSession((s: any) => ({ ...s, unlocks_at: iso }));
        const remaining = unlockMs > Date.now()
            ? `${Math.round((unlockMs - Date.now()) / 60000)} min restantes`
            : 'Liberado agora';
        addLog(`✓ Timer de ${selectedUser?.display_name} atualizado → ${remaining}`);
    };

    const deleteTargetSession = async () => {
        if (!targetSession) { addLog(`Usuário ${selectedUser?.display_name} não tem sessão para deletar.`); return; }
        const { error } = await supabase.from('daily_sessions').delete().eq('id', targetSession.id);
        if (error) { addLog(`Erro ao deletar sessão do usuário: ${error.message}`); return; }
        setTargetSession(null);
        addLog(`✓ Sessão de ${selectedUser?.display_name} deletada`);
    };

    const unlockNow = () => updateTargetSession(Date.now() - 1000);
    const setTenSeconds = () => updateTargetSession(Date.now() + 10_000);
    const setCustomTime = () => {
        const mins = parseInt(customMinutes) || 0;
        const hours = parseFloat(customHours) || 0;
        const ms = (mins + hours * 60) * 60 * 1000;
        if (ms <= 0) { addLog('Informe um tempo válido.'); return; }
        updateTargetSession(Date.now() + ms);
    };

    const unlockAtMs = targetSession ? new Date(targetSession.unlocks_at).getTime() : null;
    const remainingMs = unlockAtMs ? unlockAtMs - Date.now() : null;
    const isLocked = remainingMs !== null && remainingMs > 0;

    return (
        <div className="space-y-8">
            <h3 className="text-2xl font-black text-white">Controle de Tempo</h3>

            {/* ── User Picker ── */}
            <div className="panel p-5 space-y-4">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2">
                    🔍 Selecionar Usuário
                </p>
                <form onSubmit={searchUsers} className="flex gap-2">
                    <div className="flex-1 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)}
                            placeholder="Nome ou Friend ID..." className="field w-full pl-10" />
                    </div>
                </form>

                {/* User list */}
                <div className="rounded-xl overflow-hidden border border-gray-800 max-h-60 overflow-y-auto custom-scrollbar">
                    {foundUsers.map(u => (
                        <button key={u.id} onClick={() => selectUser(u)}
                            className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left border-b border-gray-800 last:border-0 ${selectedUser?.id === u.id ? 'bg-[var(--color-gold)]/10 text-gold' : 'hover:bg-white/5'}`}>
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 flex-shrink-0">
                                {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <User size={16} className="text-gray-500 m-auto mt-1" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate">{u.display_name}</p>
                                <p className="text-[10px] text-gray-500 font-mono">{u.friend_id}</p>
                            </div>
                            <div className="text-[10px] font-bold text-gray-600">🔥{u.streak}</div>
                        </button>
                    ))}
                    {foundUsers.length === 0 && <p className="p-4 text-center text-xs text-gray-600">Nenhum usuário encontrado</p>}
                </div>
            </div>

            {/* ── Selected User's Session ── */}
            {selectedUser && (
                <div className="panel p-5 space-y-5" style={{ border: '1px solid rgba(212,168,83,0.25)' }}>
                    <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 flex-shrink-0">
                            {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} className="w-full h-full object-cover" /> : <User size={18} className="text-gray-500 m-auto mt-1.5" />}
                        </div>
                        <div>
                            <p className="font-black text-white">{selectedUser.display_name}</p>
                            <p className="text-xs text-gray-500 font-mono">{selectedUser.friend_id}</p>
                        </div>
                        <div className="ml-auto text-right">
                            {loadingSession ? (
                                <Loader2 size={18} className="animate-spin text-gold" />
                            ) : targetSession ? (
                                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${isLocked ? 'bg-amber-500/15 text-amber-400' : 'bg-green-500/15 text-green-400'}`}>
                                    {isLocked ? `⏳ ${Math.ceil(remainingMs! / 60000)} min restantes` : '✅ Liberado'}
                                </span>
                            ) : (
                                <span className="text-xs text-gray-500">Sem sessão ativa</span>
                            )}
                        </div>
                    </div>

                    {targetSession && (
                        <>
                            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                <div className="bg-gray-900 rounded-lg p-2">
                                    <p className="text-gray-500 mb-1">Sessão ID</p>
                                    <p className="text-gray-300 truncate">{targetSession.id.substring(0, 16)}...</p>
                                </div>
                                <div className="bg-gray-900 rounded-lg p-2">
                                    <p className="text-gray-500 mb-1">Libera em</p>
                                    <p className="text-gray-300">{new Date(targetSession.unlocks_at).toLocaleString('pt-BR')}</p>
                                </div>
                                <div className="bg-gray-900 rounded-lg p-2">
                                    <p className="text-gray-500 mb-1">Palavras</p>
                                    <p className="text-gray-300">{targetSession.words?.length ?? 0} palavras</p>
                                </div>
                                <div className="bg-gray-900 rounded-lg p-2">
                                    <p className="text-gray-500 mb-1">Criado em</p>
                                    <p className="text-gray-300">{new Date(targetSession.created_at).toLocaleString('pt-BR')}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                                    Controle do Usuário
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={unlockNow} className="btn-gold py-2.5 text-xs font-black">
                                        ⚡ Liberar {selectedUser.display_name.split(' ')[0]}
                                    </button>
                                    <button onClick={setTenSeconds} className="btn-ghost py-2.5 text-xs">
                                        ⏱ 10s para {selectedUser.display_name.split(' ')[0]}
                                    </button>
                                </div>

                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pt-1">Tempo Customizado</p>
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <label className="text-[9px] text-gray-500 block mb-1">Mins</label>
                                        <input type="number" value={customMinutes} onChange={e => setCustomMinutes(e.target.value)}
                                            className="field w-full text-xs h-9" placeholder="60" min="0" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[9px] text-gray-500 block mb-1">Horas</label>
                                        <input type="number" value={customHours} onChange={e => setCustomHours(e.target.value)}
                                            className="field w-full text-xs h-9" placeholder="0" min="0" step="0.5" />
                                    </div>
                                    <button onClick={setCustomTime} className="btn-ghost px-3 text-xs h-9 font-bold bg-white/5">
                                        Aplicar
                                    </button>
                                </div>

                                <button onClick={deleteTargetSession}
                                    className="w-full py-2 rounded-xl text-xs font-bold border border-danger/20 hover:bg-danger/10 transition-all text-danger">
                                    🗑 Deletar Sessão do Usuário
                                </button>
                            </div>
                        </>
                    )}

                    {!loadingSession && !targetSession && (
                        <p className="text-center text-gray-500 text-sm py-4">Este usuário não tem sessão ativa no momento.</p>
                    )}
                </div>
            )}

            {/* ── Admin's own session (legacy tools) ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="panel p-5 space-y-4">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2">Meu Status (Admin)</p>
                    <div className="text-sm text-gray-300 grid grid-cols-2 gap-2">
                        <span className="text-gray-500">Fase Atual:</span> <span className="font-mono text-gold">{phase}</span>
                        <span className="text-gray-500">ID Sessão:</span> <span className="font-mono truncate">{session?.id?.substring(0, 8) ?? 'Nenhuma'}...</span>
                    </div>
                </div>

                <div className="panel p-5 space-y-3">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2">Atalhos (Minha Sessão)</p>
                    <button onClick={handleSkipTimer} className="btn-ghost w-full text-sm">Zerar Timer → Recall</button>
                    <button onClick={handleSetShort} className="btn-ghost w-full text-sm">Timer para 10 segundos</button>
                    <button onClick={handleResetSession} className="w-full py-2 rounded-xl text-sm font-bold border transition-all"
                        style={{ color: 'var(--color-danger)', borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.05)' }}>
                        Resetar Minha Sessão
                    </button>
                    <button onClick={handleReload} className="btn-ghost w-full text-sm">Forçar Reload</button>
                </div>
            </div>
        </div>
    );
}


// ── 4. Banners Tab ──
function BannersTab({ addLog }: { addLog: (m: string) => void }) {
    const [banners, setBanners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // New banner state
    const [title, setTitle] = useState('');
    const [link, setLink] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchBanners = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('update_banners').select('*').order('created_at', { ascending: false });
        if (error) addLog(`Erro banners: ${error.message}`);
        else setBanners(data || []);
        setLoading(false);
    };

    useEffect(() => { fetchBanners(); }, []);

    const handleDelete = async (id: string, imgUrl: string) => {
        if (!confirm('Excluir este banner?')) return;

        // Excluir registro
        const { error } = await supabase.from('update_banners').delete().eq('id', id);
        if (error) { addLog(`Erro ao deletar: ${error.message}`); return; }

        // Excluir imagem do storage
        try {
            const urlObj = new URL(imgUrl);
            const pathSegments = urlObj.pathname.split('/');
            const fileName = pathSegments[pathSegments.length - 1];
            await supabase.storage.from('banners').remove([fileName]);
        } catch (e) { }

        addLog('✓ Banner excluído');
        fetchBanners();
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const file = fileInputRef.current?.files?.[0];
        if (!file || !title) { addLog('Título e imagem obrigatórios'); return; }

        setUploading(true);
        try {
            const ext = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

            const { error: upErr } = await supabase.storage.from('banners').upload(fileName, file);
            if (upErr) throw upErr;

            const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(fileName);

            const { error: dbErr } = await supabase.from('update_banners').insert({
                title, link_url: link, image_url: publicUrl, is_active: true
            });
            if (dbErr) throw dbErr;

            addLog('✓ Novo banner publicado!');
            setTitle(''); setLink('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            fetchBanners();
        } catch (err: any) {
            addLog(`Erro upload: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    const toggleActive = async (id: string, current: boolean) => {
        const { error } = await supabase.from('update_banners').update({ is_active: !current }).eq('id', id);
        if (error) addLog(`Erro status: ${error.message}`);
        else {
            addLog(`✓ Status do banner atualizado`);
            setBanners(prev => prev.map(b => b.id === id ? { ...b, is_active: !current } : b));
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-2xl font-black text-white">Carrossel de Atualizações</h3>

            <form onSubmit={handleCreate} className="panel p-5 space-y-4">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2 mb-4">Novo Banner</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Título</label>
                        <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="field w-full" placeholder="Ex: Novas Ligas Disponíveis!" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Link (Opcional)</label>
                        <input type="text" value={link} onChange={e => setLink(e.target.value)} className="field w-full" placeholder="https://..." />
                    </div>
                </div>
                <div>
                    <label className="text-xs text-gray-500 mb-1 block">Imagem Thumbnail</label>
                    <input required ref={fileInputRef} type="file" accept="image/*" className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-gray-800 file:text-white hover:file:bg-gray-700" />
                </div>
                <button disabled={uploading} type="submit" className="btn-gold w-full flex justify-center gap-2">
                    {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                    Publicar Banner
                </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {banners.map(b => (
                    <div key={b.id} className="panel p-3 relative group">
                        <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative mb-3 border border-gray-800">
                            <img src={b.image_url} alt={b.title} className={`w-full h-full object-cover transition-all ${!b.is_active ? 'opacity-30 grayscale' : ''}`} />
                            {!b.is_active && <div className="absolute inset-0 flex items-center justify-center font-black text-danger bg-black/60 tracking-widest">INATIVO</div>}
                        </div>
                        <p className="font-bold text-sm text-white truncate px-1">{b.title}</p>
                        <div className="flex gap-2 mt-3">
                            <button onClick={() => toggleActive(b.id, b.is_active)} className="flex-1 py-1.5 rounded-lg text-xs font-bold border border-gray-700 text-gray-400 hover:bg-white/5 transition-all">
                                {b.is_active ? 'Desativar' : 'Ativar'}
                            </button>
                            <button onClick={() => handleDelete(b.id, b.image_url)} className="p-1.5 rounded-lg border border-danger/30 text-danger hover:bg-danger/10 transition-all">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {banners.length === 0 && !loading && <p className="text-gray-500 text-center py-10">Nenhum banner cadastrado.</p>}
        </div>
    );
}

// ── 5. Radio Tab ──
function RadioTab({ addLog }: { addLog: (m: string) => void }) {
    const [tracks, setTracks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [editingThumbId, setEditingThumbId] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchTracks = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('music_tracks').select('*').order('created_at', { ascending: false });
        if (error) addLog(`Erro rádio: ${error.message}`);
        else setTracks(data || []);
        setLoading(false);
    };

    useEffect(() => { fetchTracks(); }, []);

    const handleDelete = async (id: string, fileUrl: string) => {
        if (!confirm('Excluir esta música?')) return;

        const { error } = await supabase.from('music_tracks').delete().eq('id', id);
        if (error) { addLog(`Erro ao deletar: ${error.message}`); return; }

        try {
            const urlObj = new URL(fileUrl);
            const pathSegments = urlObj.pathname.split('/');
            const fileName = pathSegments[pathSegments.length - 1];
            await supabase.storage.from('music').remove([fileName]);
        } catch (e) { }

        addLog('✓ Música excluída');
        fetchTracks();
    };

    const handleCreateBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        const files = fileInputRef.current?.files;
        if (!files || files.length === 0) { addLog('Nenhum arquivo selecionado.'); return; }

        setUploading(true);
        try {
            const inserts = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const cleanName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
                const title = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

                const ext = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

                const { error: upErr } = await supabase.storage.from('music').upload(fileName, file);
                if (upErr) throw upErr;

                const { data: { publicUrl: audioUrl } } = supabase.storage.from('music').getPublicUrl(fileName);
                const finalThumb = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100&auto=format&fit=crop';

                inserts.push({
                    title, artist: 'Noesis Radio', thumb: finalThumb, url: audioUrl
                });
            }

            const { error: dbErr } = await supabase.from('music_tracks').insert(inserts);
            if (dbErr) throw dbErr;

            addLog(`✓ ${files.length} música(s) enviada(s)!`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            fetchTracks();
        } catch (err: any) {
            addLog(`Erro no lote de áudio: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateThumb = async (trackId: string, file: File) => {
        setEditingThumbId(trackId);
        try {
            const ext = file.name.split('.').pop();
            const thumbName = `thumb_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

            const { error: upErr } = await supabase.storage.from('music').upload(thumbName, file);
            if (upErr) throw upErr;

            const { data: { publicUrl: thumbUrl } } = supabase.storage.from('music').getPublicUrl(thumbName);

            const { error: dbErr } = await supabase.from('music_tracks').update({ thumb: thumbUrl }).eq('id', trackId);
            if (dbErr) throw dbErr;

            addLog('✓ Capa atualizada!');
            fetchTracks();
        } catch (err: any) {
            addLog(`Erro ao atualizar capa: ${err.message}`);
        } finally {
            setEditingThumbId(null);
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-2xl font-black text-white">Rádio Noesis (Envio em Lote)</h3>

            <form onSubmit={handleCreateBatch} className="panel p-5 space-y-4 shadow-xl border-t border-[var(--color-gold)]/20">
                <p className="text-sm font-bold font-mono text-gold mb-2">Adicionar Faixas</p>
                <div>
                    <label className="text-xs text-gray-500 mb-1 block">Arquivos de Áudio (.mp3)</label>
                    <input required ref={fileInputRef} type="file" multiple accept="audio/*" className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-gray-800 file:text-white hover:file:bg-gray-700 w-full outline-none" />
                </div>
                <button disabled={uploading} type="submit" className="btn-gold w-full flex justify-center py-3 gap-2 shadow-lg">
                    {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                    {uploading ? 'Enviando pacote...' : 'Fazer Upload Lote'}
                </button>
            </form>

            <div className="flex flex-col gap-3">
                {tracks.map(t => (
                    <div key={t.id} className="panel p-3 flex items-center justify-between gap-3 group relative hover:border-gray-700 transition-colors">
                        <div className="w-14 h-14 bg-black flex-shrink-0 relative rounded-md overflow-hidden border border-gray-800 cursor-pointer group/thumb">
                            <img src={t.thumb} alt="Album Art" className={`w-full h-full object-cover transition-opacity ${editingThumbId === t.id ? 'opacity-30' : 'opacity-80 group-hover/thumb:opacity-30'}`} />
                            <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 bg-black/50 transition-all cursor-pointer">
                                {editingThumbId === t.id ? <Loader2 size={16} className="text-white animate-spin" /> : <ImageIcon size={20} className="text-white" />}
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) handleUpdateThumb(t.id, e.target.files[0])
                                }} />
                            </label>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <p className="text-sm font-bold leading-tight truncate text-white">{t.title}</p>
                            <p className="text-[10px] uppercase tracking-wider truncate mt-1 text-gold/70 font-bold hover:text-gold cursor-pointer transition-colors"
                                onClick={async () => {
                                    const newTitle = prompt('Novo título da música:', t.title);
                                    if (newTitle && newTitle !== t.title) {
                                        await supabase.from('music_tracks').update({ title: newTitle }).eq('id', t.id);
                                        fetchTracks();
                                    }
                                }}
                            >✎ Editar Título</p>
                        </div>
                        <button onClick={() => handleDelete(t.id, t.url)} className="p-2 mr-1 rounded-lg border border-danger/30 text-danger hover:bg-danger/10 transition-all">
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
            {tracks.length === 0 && !loading && <p className="text-gray-500 text-center py-10">Nenhuma faixa na rádio.</p>}
        </div>
    );
}

// ── 5. Push Notifications Tab ──
function PushTab({ addLog }: { addLog: (m: string) => void }) {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [target, setTarget] = useState<'all' | 'specific'>('all');
    const [targetUserId, setTargetUserId] = useState('');
    const [sending, setSending] = useState(false);

    const handleSendPush = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !body.trim()) {
            addLog('Título e Mensagem são obrigatórios.');
            return;
        }
        if (target === 'specific' && !targetUserId.trim()) {
            addLog('ID do Usuário é obrigatório para envio específico.');
            return;
        }

        setSending(true);
        addLog(`Iniciando disparo push... (${target})`);

        try {
            const { data, error } = await supabase.functions.invoke('send-push', {
                body: {
                    adminDispatch: true,
                    target,
                    targetUserId: target === 'specific' ? targetUserId.trim() : undefined,
                    title: title.trim(),
                    body: body.trim(),
                    data: { url: '/' }
                }
            });

            if (error) throw error;
            if (data && data.success === false) throw new Error(data.error || 'Erro interno retornado pela nuvem');

            addLog(`✓ Consulta finalizada. Recebidos por ${data?.delivered || 0} dispositivos.`);
            if (data && data.success && data.debugResults) {
                data.debugResults.forEach((res: any, i: number) => {
                    const status = res.status || '??';
                    const msg = res.msg || (res.error ? 'ERRO' : 'OK');
                    addLog(`   [Push ${i + 1}] ${msg} | Status: ${status} ${res.error ? `(${res.error})` : ''}`);
                });
            }

            setTitle('');
            setBody('');
        } catch (err: any) {
            addLog(`Erro ao enviar Push: ${err.message || err.toString()}`);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-2xl font-black text-white">Disparar Push Notifications</h3>
            <form onSubmit={handleSendPush} className="panel p-6 space-y-4 shadow-xl border-t border-[var(--color-gold)]/20">
                <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-bold">
                        <input type="radio" checked={target === 'all'} onChange={() => setTarget('all')} className="accent-gold" />
                        Para Todos (Broadcast)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-bold">
                        <input type="radio" checked={target === 'specific'} onChange={() => setTarget('specific')} className="accent-gold" />
                        Usuário Específico
                    </label>
                </div>

                {target === 'specific' && (
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block uppercase tracking-wider font-bold">ID do Usuário (UUID)</label>
                        <input type="text" value={targetUserId} onChange={e => setTargetUserId(e.target.value)} required placeholder="Ex: 123e4567-e89b-12d3..." className="field w-full text-sm" />
                    </div>
                )}

                <div>
                    <label className="text-xs text-gray-500 mb-1 block uppercase tracking-wider font-bold">Título da Notificação</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Ex: Novidade no Noesis!" className="field w-full text-base font-bold text-white placeholder-gray-600" />
                </div>

                <div>
                    <label className="text-xs text-gray-500 mb-1 block uppercase tracking-wider font-bold">Mensagem</label>
                    <textarea value={body} onChange={e => setBody(e.target.value)} required rows={3} placeholder="Ex: Venha conferir as novas atualizações da liga..." className="field w-full text-sm resize-none placeholder-gray-600" />
                </div>

                <div className="pt-2 flex justify-end">
                    <button disabled={sending} type="submit" className="btn-gold flex items-center justify-center gap-2 px-8 py-3 shadow-lg hover:scale-105 transition-transform">
                        {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                        {sending ? 'Disparando...' : 'Enviar Push Agora'}
                    </button>
                </div>
            </form>
        </div>
    );
}
