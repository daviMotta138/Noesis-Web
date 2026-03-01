// src/components/Layout.tsx — Desktop sidebar with notification bell
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Home, Trophy, Users, ShoppingBag, User, ShieldAlert, LogOut, Bell, Menu, X, Settings, Gamepad2 } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { supabase } from '../lib/supabase';
import { AnimatePresence, motion } from 'framer-motion';
import { audio } from '../lib/audio';
import logoImg from '../assets/logo-horizontal.png';
import { sendPushNotification } from '../lib/notifications';
import { NotificationPrompt } from './NotificationPrompt';
import { GiftClaimOverlay } from './GiftClaimOverlay';
import { MusicPlayer, MusicPlayerUI } from './MusicPlayer';
import coinImg from '../assets/coin.webp';
import shieldImg from '../assets/shield.png';

const BASE_NAV = [
    { to: '/', icon: Home, label: 'Início', adminOnly: false },
    { to: '/ranking', icon: Trophy, label: 'Ranking', adminOnly: false },
    { to: '/friends', icon: Users, label: 'Amigos', adminOnly: false },
    { to: '/shop', icon: ShoppingBag, label: 'Loja', adminOnly: false },
    { to: '/profile', icon: User, label: 'Perfil', adminOnly: false },
    { to: '/settings', icon: Settings, label: 'Ajustes', adminOnly: false },
    { to: '/admin', icon: ShieldAlert, label: 'Admin', adminOnly: true },
];

export default function Layout() {
    const { profile, user, setUser, setProfile, setPendingGift, unreadMessages, setUnreadMessages } = useGameStore();
    const navigate = useNavigate();
    const location = useLocation();
    const NAV = BASE_NAV.filter(n => !n.adminOnly || profile?.is_admin);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [chatToast, setChatToast] = useState<any | null>(null);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
        if (location.pathname === '/friends') {
            setUnreadMessages(false);
        }
    }, [location.pathname]);

    // Bottom nav shortcuts
    const bottomNavPaths = ['/', '/ranking', '/profile'];
    const bottomNavItems = NAV.filter(n => bottomNavPaths.includes(n.to));
    const drawerNavItems = NAV.filter(n => !bottomNavPaths.includes(n.to));

    useEffect(() => {
        if (!user?.id) return;
        // Fetch unread count
        const fetchUnread = async () => {
            const { count } = await supabase
                .from('notifications')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .is('read_at', null);
            setUnreadCount(count ?? 0);
        };
        fetchUnread();

        // Realtime subscription for notifications
        const channel = supabase
            .channel(`notifications:${user.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`,
            }, (payload) => {
                const newData = payload.new as any;
                setUnreadCount(c => c + 1);

                // Handle Gift Detection
                if (newData.type === 'gift_received' && !newData.claimed) {
                    setPendingGift(newData);
                    audio.play('achievement');
                } else {
                    audio.play('match');
                }

                if (newData.message) {
                    sendPushNotification('Aviso do Noesis', { body: newData.message });
                }
            })
            .subscribe();

        // Realtime Messages for Chat Notifs
        const chatChannel = supabase
            .channel(`chat_notifs:${user.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `recipient_id=eq.${user.id}`
            }, (payload) => {
                const newMsg = payload.new as any;
                setUnreadMessages(true);
                audio.play('nav');
                window.dispatchEvent(new CustomEvent('new_chat_message', { detail: newMsg }));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(chatChannel);
        };
    }, [user?.id, setPendingGift, setUnreadMessages]);

    useEffect(() => {
        const handleNewMsg = (e: any) => {
            if (location.pathname !== '/friends') {
                setChatToast(e.detail);
                setTimeout(() => setChatToast(null), 5000);
            }
        };
        window.addEventListener('new_chat_message', handleNewMsg);
        return () => window.removeEventListener('new_chat_message', handleNewMsg);
    }, [location.pathname]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null); setProfile(null);
    };

    return (
        <div className="flex min-h-screen bg-transparent">
            <NotificationPrompt />
            <GiftClaimOverlay />
            <MusicPlayer />
            <MusicPlayerUI className="hidden md:block fixed bottom-6 right-6 z-[100]" />

            {/* ── Sidebar (Desktop) ── */}
            <aside className="hidden md:flex w-60 flex-shrink-0 flex-col h-screen sticky top-0"
                style={{ background: 'var(--color-deep)', borderRight: '1px solid var(--color-border)' }}>

                {/* Logo */}
                <div className="px-6 pt-8 pb-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <div className="flex flex-col gap-2">
                        <img src={logoImg} className="h-10 w-auto object-contain self-start" alt="NOESIS" />
                        <p className="text-[9px] tracking-[0.3em] pl-1 font-bold" style={{ color: 'var(--color-gold-dim)' }}>PALÁCIO DA MEMÓRIA</p>
                    </div>
                </div>

                {/* Nav items */}
                <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
                    {NAV.map(({ to, icon: Icon, label }) => (
                        <NavLink key={to} to={to} end={to === '/'}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 group ${isActive ? 'active-nav' : ''}`
                            }
                            style={({ isActive }) => ({
                                background: isActive ? 'rgba(212,168,83,0.1)' : 'transparent',
                                color: isActive ? 'var(--color-gold)' : 'var(--color-text-muted)',
                                border: isActive ? '1px solid rgba(212,168,83,0.2)' : '1px solid transparent',
                            })}>
                            {({ isActive }) => (
                                <>
                                    <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8}
                                        style={{ filter: isActive ? 'drop-shadow(0 0 6px rgba(212,168,83,0.5))' : 'none', flexShrink: 0 }} />
                                    {label}
                                    {label === 'Amigos' && unreadMessages && !isActive && (
                                        <div className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                    )}
                                    {isActive && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full"
                                            style={{ background: 'var(--color-gold)' }} />
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}

                    {/* Notifications link */}
                    <NavLink to="/notifications"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${isActive ? 'active-nav' : ''}`
                        }
                        style={({ isActive }) => ({
                            background: isActive ? 'rgba(212,168,83,0.1)' : 'transparent',
                            color: isActive ? 'var(--color-gold)' : 'var(--color-text-muted)',
                            border: isActive ? '1px solid rgba(212,168,83,0.2)' : '1px solid transparent',
                        })}>
                        {({ isActive }) => (
                            <>
                                <div className="relative flex-shrink-0">
                                    <Bell size={18} strokeWidth={isActive ? 2.5 : 1.8}
                                        style={{ filter: isActive ? 'drop-shadow(0 0 6px rgba(212,168,83,0.5))' : 'none' }} />
                                    {unreadCount > 0 && (
                                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black"
                                            style={{ background: 'var(--color-danger)', color: '#fff' }}>
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </div>
                                    )}
                                </div>
                                Alertas
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full"
                                        style={{ background: 'var(--color-gold)' }} />
                                )}
                            </>
                        )}
                    </NavLink>
                </nav>

                {/* Playground Link */}
                <div className="px-5 mt-auto mb-4">
                    <button onClick={() => navigate('/playground')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black transition-all hover:scale-[1.02] active:scale-95 group"
                        style={{
                            background: 'var(--color-gold-opacity)',
                            border: '1px solid var(--color-gold-dim)',
                            color: 'var(--color-gold)',
                            boxShadow: '0 0 20px rgba(212,168,83,0.1)'
                        }}>
                        <Gamepad2 size={18} className="group-hover:rotate-12 transition-transform" />
                        OUTROS MODOS
                    </button>
                </div>

                {/* User info + logout */}
                <div className="px-3 pb-5" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <button onClick={() => navigate('/profile')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mt-3 transition-all cursor-pointer"
                        style={{ background: 'var(--color-glass)', border: '1px solid var(--color-border)' }}>
                        {/* Avatar thumbnail */}
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 overflow-hidden"
                            style={{ background: 'var(--color-card)' }}>
                            {(profile as any)?.avatar_url
                                ? <img src={(profile as any).avatar_url} alt="" className="w-full h-full object-cover" />
                                : <span>🧠</span>}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                            <p className="text-xs font-bold truncate" style={{ color: 'var(--color-text)' }}>
                                {profile?.display_name ?? 'Usuário'}
                                {profile?.is_admin && <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(248,113,113,0.2)', color: 'var(--color-danger)' }}>ADMIN</span>}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-[10px] font-bold" style={{ color: 'var(--color-fire)' }}>
                                    🔥 {profile?.streak ?? 0}
                                </span>
                                <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: 'var(--color-gold)' }}>
                                    <img src={coinImg} className="w-3 h-3 object-contain" alt="" />
                                    {profile?.is_admin ? '∞' : (profile?.nous_coins ?? 0)}
                                </span>
                                {(profile?.shield_count ?? 0) > 0 && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: 'var(--color-success)' }}>
                                        <img src={shieldImg} className="w-2.5 h-2.5 object-contain" alt="" />
                                        {profile?.shield_count}
                                    </span>
                                )}
                            </div>
                        </div>
                    </button>
                    <button onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 rounded-xl mt-1.5 text-xs font-medium transition-all"
                        style={{ color: 'var(--color-text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}>
                        <LogOut size={13} /> Sair
                    </button>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className="flex-1 w-full bg-transparent overflow-y-auto pb-20 md:pb-0 min-h-screen">
                <div className="max-w-4xl mx-auto px-8 py-8">
                    <Outlet />
                </div>
            </main>

            {/* ── Mobile Bottom Nav ── */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[60] flex items-center justify-around h-16 px-2 safe-area-pb"
                style={{ background: 'var(--color-overlay-heavy)', borderTop: '1px solid var(--color-border)', backdropFilter: 'blur(10px)' }}>

                {/* Main bottom tabs */}
                {bottomNavItems.map(({ to, icon: Icon, label }) => (
                    <NavLink key={to} to={to} end={to === '/'}
                        onClick={() => { setIsMobileMenuOpen(false); audio.play('nav'); }}
                        className={({ isActive }) => `flex flex-col items-center justify-center w-14 h-full gap-1 transition-all ${isActive && !isMobileMenuOpen ? 'active-nav' : ''}`}
                        style={({ isActive }) => ({ color: isActive && !isMobileMenuOpen ? 'var(--color-gold)' : 'var(--color-text-muted)' })}>
                        {({ isActive }) => (
                            <>
                                <Icon size={20} strokeWidth={isActive && !isMobileMenuOpen ? 2.5 : 1.8} style={{ filter: isActive && !isMobileMenuOpen ? 'drop-shadow(0 0 6px rgba(212,168,83,0.5))' : 'none' }} />
                                <span className="text-[9px] font-bold">{label}</span>
                            </>
                        )}
                    </NavLink>
                ))}

                {/* "Mais" Menu Toggle */}
                <button onClick={() => { setIsMobileMenuOpen(!isMobileMenuOpen); audio.play('nav'); }}
                    className="flex flex-col items-center justify-center w-14 h-full gap-1 transition-all relative"
                    style={{ color: isMobileMenuOpen ? 'var(--color-gold)' : 'var(--color-text-muted)' }}>
                    <div className="relative">
                        {isMobileMenuOpen ? <X size={20} strokeWidth={2.5} style={{ filter: 'drop-shadow(0 0 6px rgba(212,168,83,0.5))' }} /> : <Menu size={20} strokeWidth={1.8} />}
                        {(unreadCount > 0 || unreadMessages) && !isMobileMenuOpen && (
                            <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black"
                                style={{ background: 'var(--color-danger)', color: '#fff' }}>
                                {unreadCount > 9 ? '9+' : (unreadCount > 0 ? unreadCount : '•')}
                            </div>
                        )}
                    </div>
                    <span className="text-[9px] font-bold" style={{ color: isMobileMenuOpen ? 'var(--color-gold)' : 'var(--color-text-muted)' }}>Mais</span>
                </button>
            </nav>

            {/* ── Mobile Drawer (Mais Menu) ── */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="md:hidden fixed inset-x-0 bottom-16 z-[55] rounded-t-3xl overflow-hidden pb-4"
                        style={{ background: 'var(--color-overlay-heavy)', borderTop: '1px solid var(--color-border-glow)', backdropFilter: 'blur(20px)', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)' }}>
                        <div className="p-5 max-h-[70vh] overflow-y-auto">
                            <div className="w-12 h-1.5 bg-gray-600 rounded-full mx-auto mb-6 opacity-30" />

                            <h3 className="text-xs font-bold uppercase tracking-widest text-center mb-4" style={{ color: 'var(--color-text-muted)' }}>Menu Completo</h3>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {drawerNavItems.map(({ to, icon: Icon, label }) => (
                                    <NavLink key={to} to={to} onClick={() => { setIsMobileMenuOpen(false); audio.play('nav'); }}
                                        className={({ isActive }) => `flex items-center gap-3 p-4 rounded-2xl transition-all relative ${isActive ? 'bg-[var(--color-gold-opacity)] border border-[var(--color-gold-dim)]' : 'bg-[var(--color-glass)] border border-[var(--color-glass-strong)]'}`}
                                        style={({ isActive }) => ({ color: isActive ? 'var(--color-gold)' : 'var(--color-text)' })}>
                                        {({ isActive }) => (
                                            <>
                                                <Icon size={20} />
                                                <span className="text-sm font-bold">{label}</span>
                                                {label === 'Amigos' && unreadMessages && !isActive && (
                                                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                )}
                                            </>
                                        )}
                                    </NavLink>
                                ))}

                                <NavLink to="/notifications" onClick={() => { setIsMobileMenuOpen(false); audio.play('nav'); }}
                                    className={({ isActive }) => `flex items-center gap-3 p-4 rounded-2xl transition-all relative ${isActive ? 'bg-[var(--color-gold-opacity)] border border-[var(--color-gold-dim)]' : 'bg-[var(--color-glass)] border border-[var(--color-glass-strong)]'}`}
                                    style={({ isActive }) => ({ color: isActive ? 'var(--color-gold)' : 'var(--color-text)' })}>
                                    <div className="relative">
                                        <Bell size={20} />
                                        {unreadCount > 0 && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center text-[6px] font-black"
                                                style={{ background: 'var(--color-danger)', color: '#fff', border: '1px solid var(--color-card)' }}>
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-sm font-bold">Alertas</span>
                                </NavLink>
                            </div>

                            <div className="md:hidden mt-2 mb-4">
                                <MusicPlayerUI fullWidth className="w-full flex justify-center" />
                            </div>

                            <div className="space-y-3 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                                <button onClick={() => { setIsMobileMenuOpen(false); navigate('/playground'); }}
                                    className="w-full flex items-center gap-3 p-4 rounded-2xl"
                                    style={{ background: 'var(--color-gold-opacity)', border: '1px solid var(--color-gold-dim)', color: 'var(--color-gold)' }}>
                                    <Gamepad2 size={20} />
                                    <span className="text-sm font-black">OUTROS MODOS</span>
                                </button>

                                <button onClick={handleLogout}
                                    className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl text-sm font-bold transition-all"
                                    style={{ color: 'var(--color-danger)', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
                                    <LogOut size={16} /> Sair do App
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Toast Notification */}
            <AnimatePresence>
                {chatToast && (
                    <motion.div
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 50, scale: 0.9 }}
                        onClick={() => { setChatToast(null); navigate('/friends'); }}
                        className="fixed top-8 right-8 z-[200] panel-gold p-4 pr-6 flex items-center gap-4 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto cursor-pointer"
                        style={{ borderLeft: '4px solid var(--color-gold)', background: 'var(--color-overlay-heavy)', backdropFilter: 'blur(20px)' }}
                    >
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-xl">
                            💬
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 mb-0.5">Nova Mensagem</p>
                            <p className="text-sm font-bold text-white leading-tight">Você recebeu uma mensagem!</p>
                            <p className="text-xs text-white/60 truncate max-w-[150px]">{chatToast.content}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
