import { useState, useEffect } from 'react';
import { Copy, LogOut, ChevronRight, Pencil, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/useGameStore';
import { BadgeDisplay } from '../components/BadgeDisplay';
import { Avatar2D, DEFAULT_AVATAR_CONFIG } from '../components/Avatar2D';
import type { AvatarConfig } from '../components/Avatar2D';
import { AvatarEditor } from '../components/AvatarEditor';
import { AvatarAnnouncement } from '../components/AvatarAnnouncement';
import coinImg from '../assets/coin.webp';
import shieldImg from '../assets/shield.png';

export default function ProfilePage() {
    const { profile, user, updateProfile, setUser, setProfile, fetchProfile } = useGameStore();
    const [friendsCount, setFriendsCount] = useState(0);
    const [copied, setCopied] = useState(false);
    const [editorOpen, setEditorOpen] = useState(false);
    const [fullBodyOpen, setFullBodyOpen] = useState(false);
    const [announcementOpen, setAnnouncementOpen] = useState(false);

    // Derived avatar config from profile
    const avatarConfig: AvatarConfig = {
        ...DEFAULT_AVATAR_CONFIG,
        ...(profile?.avatar_config ?? {}),
    };

    // Show announcement once per user if they haven't seen it yet
    useEffect(() => {
        if (profile && !(profile as any).avatar_seen_announcement) {
            // Slight delay so the page loads first
            const t = setTimeout(() => setAnnouncementOpen(true), 600);
            return () => clearTimeout(t);
        }
    }, [profile]);

    const handleDismissAnnouncement = async () => {
        setAnnouncementOpen(false);
        if (user?.id) {
            await supabase.from('profiles').update({ avatar_seen_announcement: true }).eq('id', user.id);
            if (user?.id) fetchProfile(user.id);
        }
    };

    const handleCustomizeFromAnnouncement = () => {
        setAnnouncementOpen(false);
        handleDismissAnnouncement();
        setEditorOpen(true);
    };

    const handleSaveAvatar = async (cfg: AvatarConfig) => {
        await updateProfile({ avatar_config: cfg as any });
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null); setProfile(null);
    };

    const copyFriendId = () => {
        if (profile?.friend_id) {
            navigator.clipboard.writeText(profile.friend_id);
            setCopied(true); setTimeout(() => setCopied(false), 2000);
        }
    };

    useEffect(() => {
        if (!user) return;
        const fetchFriendsCount = async () => {
            const { count } = await supabase
                .from('friendships')
                .select('*', { count: 'exact', head: true })
                .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
                .eq('status', 'accepted');
            setFriendsCount(count || 0);
        };
        fetchFriendsCount();
    }, [user]);

    const accuracy = 85;

    return (
        <div className="min-h-screen pb-24 text-white font-body">

            {/* ── Avatar bust section ── */}
            <div className="px-5 pt-10 flex flex-col items-center">
                <div className="relative mb-4">

                    {/* Bust avatar frame */}
                    <div className="relative"
                        style={{
                            background: 'linear-gradient(to bottom, rgba(168,85,247,0.1), rgba(0,0,0,0))',
                            borderRadius: '50% 50% 0 0',
                            padding: '16px 24px 0',
                        }}>
                        <Avatar2D config={avatarConfig} mode="bust" width={140} />

                        {/* Purple glow beneath */}
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-24 h-6 rounded-full blur-xl opacity-50"
                            style={{ background: '#A855F7' }} />
                    </div>

                    {/* Edit pencil button */}
                    <button
                        onClick={() => setEditorOpen(true)}
                        className="absolute top-0 right-0 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95"
                        style={{
                            background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                            boxShadow: '0 2px 12px rgba(168,85,247,0.5)',
                        }}>
                        <Pencil size={15} className="text-white" />
                    </button>
                </div>

                {/* "Ver completo" button */}
                <button
                    onClick={() => setFullBodyOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-bold py-1.5 px-4 rounded-full mb-4 transition-all active:scale-95"
                    style={{
                        color: '#C084FC',
                        background: 'rgba(168,85,247,0.1)',
                        border: '1px solid rgba(168,85,247,0.25)',
                    }}>
                    Ver completo
                    <ChevronRight size={12} />
                </button>

                {/* Name */}
                <h1 className="text-3xl font-black text-center tracking-tight mb-6">
                    {profile?.display_name || 'Estudante'}
                </h1>

                {/* Stats grid */}
                <div className="w-full grid grid-cols-4 gap-2 mb-6 max-w-sm">
                    <div className="flex flex-col items-center justify-center bg-[var(--color-glass)] rounded-2xl py-3 border border-[var(--color-border)]">
                        <img src={coinImg} className="w-5 h-5 mb-1 object-contain" alt="" />
                        <span className="text-sm font-black">{profile?.nous_coins || 0}</span>
                        <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--color-text-muted)] mt-0.5">Nous</span>
                    </div>
                    <div className="flex flex-col items-center justify-center bg-[var(--color-glass)] rounded-2xl py-3 border border-[var(--color-border)]">
                        <span className="text-xl mb-1 text-[var(--color-fire)]">🔥</span>
                        <span className="text-sm font-black">{profile?.streak || 0}</span>
                        <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--color-text-muted)] mt-0.5">Ofensiva</span>
                    </div>
                    <div className="flex flex-col items-center justify-center bg-[var(--color-glass)] rounded-2xl py-3 border border-[var(--color-border)]">
                        <span className="text-xl mb-1 text-[var(--color-success)]">👥</span>
                        <span className="text-sm font-black">{friendsCount}</span>
                        <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--color-text-muted)] mt-0.5">Amigos</span>
                    </div>
                    <div className="flex flex-col items-center justify-center bg-[var(--color-glass)] rounded-2xl py-3 border border-[var(--color-border)]">
                        <img src={shieldImg} className="w-4 h-4 mb-1 object-contain" alt="" />
                        <span className="text-sm font-black">{profile?.shield_count || 0}</span>
                        <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--color-text-muted)] mt-0.5">Escudos</span>
                    </div>
                </div>
            </div>

            {/* Friend ID and Logout */}
            <div className="px-5 flex justify-between items-center mb-6">
                <p className="text-sm font-medium text-[var(--color-text-muted)] flex items-center gap-2">
                    ID: {profile?.friend_id ?? '---'}
                    <button onClick={copyFriendId} title="Copiar ID">
                        <Copy size={13} style={{ color: copied ? 'var(--color-success)' : 'inherit' }} />
                    </button>
                </p>
                <button onClick={handleLogout}
                    className="w-10 h-10 rounded-2xl flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
                    title="Sair">
                    <LogOut size={18} className="text-white" />
                </button>
            </div>

            {/* Stats row */}
            <div className="px-5 mb-6">
                <p className="text-xs uppercase font-bold text-[var(--color-text-muted)] tracking-widest pl-2 mb-3">Resumo</p>
                <div className="flex gap-3 w-full">
                    <div className="flex-1 bg-[var(--color-glass)] border border-[var(--color-border)] rounded-2xl p-4 flex flex-col justify-between">
                        <div className="text-[var(--color-success)] text-2xl mb-2">🎯</div>
                        <div>
                            <p className="text-2xl font-black leading-none">{accuracy}%</p>
                            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mt-1">Acertos</p>
                        </div>
                    </div>
                    <div className="flex-1 bg-[var(--color-glass)] border border-[var(--color-border)] rounded-2xl p-4 flex flex-col justify-between">
                        <div className="text-[var(--color-primary)] text-2xl mb-2">🧠</div>
                        <div>
                            <p className="text-2xl font-black leading-none">{profile?.score || 0}</p>
                            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mt-1">XP Total</p>
                        </div>
                    </div>
                    <div className="flex-1 bg-[var(--color-glass)] border border-[var(--color-border)] rounded-2xl p-4 flex flex-col justify-between">
                        <div className="text-[var(--color-gold)] text-2xl mb-2">⚡</div>
                        <div>
                            <p className="text-2xl font-black leading-none">{profile?.word_count || 0}</p>
                            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mt-1">Palavras</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Badges */}
            <div className="px-5 mb-6">
                <div className="flex justify-between items-end mb-4 border-b-2 pb-2" style={{ borderColor: 'var(--color-border)' }}>
                    <h2 className="text-xl font-bold text-[var(--color-text)]">Broches de Conquista</h2>
                </div>
                {user?.id && (
                    <BadgeDisplay userId={user.id} showTitle={false} maxDisplay={12} variant="grid" />
                )}
            </div>

            {/* ── Avatar Editor bottom sheet ── */}
            <AvatarEditor
                open={editorOpen}
                current={avatarConfig}
                onSave={handleSaveAvatar}
                onClose={() => setEditorOpen(false)}
            />

            {/* ── Full-body avatar modal ── */}
            {createPortal(
                <AnimatePresence>
                    {fullBodyOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[200] flex items-center justify-center px-6"
                            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(14px)' }}
                            onClick={() => setFullBodyOpen(false)}>
                            <motion.div
                                initial={{ scale: 0.85, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.85, opacity: 0 }}
                                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                                className="relative flex flex-col items-center"
                                onClick={e => e.stopPropagation()}>
                                {/* Close button */}
                                <button
                                    onClick={() => setFullBodyOpen(false)}
                                    className="absolute -top-4 -right-4 w-9 h-9 rounded-full flex items-center justify-center z-10"
                                    style={{ background: 'var(--color-glass)', border: '1px solid var(--color-border)' }}>
                                    <X size={16} style={{ color: 'var(--color-text-muted)' }} />
                                </button>

                                {/* Full avatar */}
                                <div className="relative">
                                    <Avatar2D config={avatarConfig} mode="full" width={200} />
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-8 rounded-full blur-xl opacity-40"
                                        style={{ background: '#A855F7' }} />
                                </div>

                                <p className="mt-6 text-base font-black text-white">
                                    {profile?.display_name || 'Estudante'}
                                </p>
                                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                                    Toque fora para fechar
                                </p>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* ── New feature announcement (one-time) ── */}
            <AvatarAnnouncement
                open={announcementOpen}
                onCustomize={handleCustomizeFromAnnouncement}
                onDismiss={handleDismissAnnouncement}
            />
        </div>
    );
}
