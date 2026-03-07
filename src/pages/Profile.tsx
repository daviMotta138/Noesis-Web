import { useState, useEffect, useRef } from 'react';
import { Copy, LogOut, Camera } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/useGameStore';
import { BadgeDisplay } from '../components/BadgeDisplay';
import { DEFAULT_AVATAR_CONFIG } from '../components/Avatar2D';
import type { AvatarConfig } from '../components/Avatar2D';
import { AvatarAnnouncement } from '../components/AvatarAnnouncement';
import { ProfileAvatarDrawer } from '../components/ProfileAvatarDrawer';
import coinImg from '../assets/coin.webp';
import shieldImg from '../assets/shield.png';

export default function ProfilePage() {
    const navigate = useNavigate();
    const { profile, user, updateProfile, setUser, setProfile, fetchProfile } = useGameStore();
    const [friendsCount, setFriendsCount] = useState(0);
    const [copied, setCopied] = useState(false);
    const [announcementOpen, setAnnouncementOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        navigate('/avatar');
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            const file = e.target.files?.[0];
            if (!file || !user?.id) return;
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}-${Math.random()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
            await updateProfile({ avatar_url: publicUrl });
        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert('Erro ao fazer upload da imagem.');
        } finally {
            setUploading(false);
        }
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
        <div className="min-h-screen relative overflow-hidden text-white font-body">

            {/* MAIN CONTENT LAYER (Blurs when drawer is hovered) */}
            <div
                className="w-full h-full pb-24 transition-all duration-300"
                style={{
                    filter: isHoveringAvatar ? 'blur(8px) brightness(0.6)' : 'none',
                    transform: isHoveringAvatar ? 'scale(0.98)' : 'scale(1)',
                }}
            >
                {/* ── Profile Header ── */}
                <div className="px-5 pt-10 flex flex-col items-center">
                    <div className="relative mb-6">
                        {/* Static Profile Photo */}
                        {profile?.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt="Profile"
                                className="w-[120px] h-[120px] rounded-full object-cover border-4 border-[var(--color-surface)] shadow-xl"
                            />
                        ) : (
                            <div className="w-[120px] h-[120px] rounded-full border-4 border-[var(--color-surface)] shadow-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl font-extrabold shadow-inner">
                                {profile?.display_name?.charAt(0).toUpperCase() || '?'}
                            </div>
                        )}

                        {/* Quick photo upload button */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 z-20"
                            style={{
                                background: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                            }}>
                            {uploading ? (
                                <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-text-muted) transparent transparent transparent' }} />
                            ) : (
                                <Camera size={14} style={{ color: 'var(--color-text)' }} />
                            )}
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                    </div>

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
            </div> {/* END MAIN CONTENT LAYER */}

            {/* ── Right-Side Avatar Drawer ── */}
            <ProfileAvatarDrawer
                avatarConfig={avatarConfig}
                onHoverChange={setIsHoveringAvatar}
            />

            {/* ── New feature announcement (one-time) ── */}
            <AvatarAnnouncement
                open={announcementOpen}
                onCustomize={handleCustomizeFromAnnouncement}
                onDismiss={handleDismissAnnouncement}
            />
        </div >
    );
}
