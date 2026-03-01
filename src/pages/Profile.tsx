import { useState, useRef, useEffect } from 'react';
import { Copy, LogOut, Loader2, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/useGameStore';
import type { AvatarConfig } from '../components/Avatar2D';
import coinImg from '../assets/coin.webp';
import shieldImg from '../assets/shield.png';

const AVATAR_OPTIONS = {
    body: [{ id: 'body_01', label: 'Claro' }, { id: 'body_02', label: 'Médio' }, { id: 'body_03', label: 'Escuro' }],
    hair: [{ id: 'none', label: 'Nenhum' }, { id: 'hair_short', label: 'Curto' }, { id: 'hair_long', label: 'Longo' }, { id: 'hair_curly', label: 'Cacheado' }],
    shirt: [{ id: 'shirt_blue', label: 'Azul' }, { id: 'shirt_red', label: 'Vermelho' }, { id: 'shirt_purple', label: 'Roxo' }, { id: 'shirt_white', label: 'Branco' }],
    accessory: [{ id: 'none', label: 'Nenhum' }, { id: 'glasses_round', label: 'Óculos R.' }, { id: 'glasses_classic', label: 'Óculos C.' }, { id: 'crown_gold', label: 'Coroa' }],
    shoes: [{ id: 'shoes_white', label: 'Branco' }, { id: 'shoes_black', label: 'Preto' }, { id: 'shoes_sneaker', label: 'Tênis' }],
};

const SECTION_LABELS: Record<string, string> = {
    body: 'Tom de pele', hair: 'Cabelo', shirt: 'Camisa', accessory: 'Acessório', shoes: 'Calçado',
};

const DEFAULT_AVATAR: AvatarConfig = {
    body: 'body_01', hair: 'hair_short', shirt: 'shirt_blue', accessory: 'none', shoes: 'shoes_white',
};

export default function ProfilePage() {
    const { profile, user, updateProfile, setUser, setProfile, fetchProfile } = useGameStore();
    const [friendsCount, setFriendsCount] = useState(0);
    const [copied, setCopied] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const avatarConfig: AvatarConfig = { ...DEFAULT_AVATAR, ...(profile?.avatar_config ?? {}) };
    const avatarUrl = (profile as any)?.avatar_url as string | null;

    const handleAvatarChange = (key: keyof AvatarConfig, value: string) => {
        const newConfig = { ...avatarConfig, [key]: value };
        updateProfile({ avatar_config: newConfig });
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


    // Fetch accepted friends count

    useEffect(() => {
        if (!user) return;
        const fetchFriendsCount = async () => {
            const { count, error } = await supabase
                .from('friendships')
                .select('*', { count: 'exact', head: true })
                .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
                .eq('status', 'accepted');
            if (error) console.error("Error fetching friends count:", error);
            setFriendsCount(count || 0);
        };
        fetchFriendsCount();
    }, [user]);

    // ── Photo upload ──────────────────────────────────────────────────────────
    const handlePhotoClick = () => fileInputRef.current?.click();

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.id) return;

        // Validate
        if (file.size > 2 * 1024 * 1024) { setUploadError('Arquivo muito grande (máx. 2MB)'); return; }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setUploadError('Use JPG, PNG ou WebP'); return;
        }

        setUploading(true); setUploadError(null);
        try {
            const ext = file.name.split('.').pop();
            const path = `${user.id}/avatar.${ext}`;

            const { error: upErr } = await supabase.storage
                .from('avatars')
                .upload(path, file, { upsert: true, contentType: file.type });

            if (upErr) throw upErr;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(path);

            // Add cache-busting timestamp
            const url = `${publicUrl}?t=${Date.now()}`;

            await supabase.from('profiles')
                .update({ avatar_url: url })
                .eq('id', user.id);

            await fetchProfile(user.id);
        } catch (err: any) {
            setUploadError(err?.message ?? 'Erro ao fazer upload. Verifique o bucket "avatars" no Supabase Storage.');
        } finally {
            setUploading(false);
            // Reset input so same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Placeholder for accuracy, assuming it's calculated elsewhere or will be added
    const accuracy = 85; // Example value

    return (
        <div className="min-h-screen pb-24 text-white font-body relative">
            {/* Transparent Top Section (Avatar & Basic Info) */}
            <div className="px-5 pt-12 relative z-10 flex flex-col items-center">
                <div className="relative mb-6">
                    <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-[var(--color-border-glow)] shadow-2xl">
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-[var(--color-surface)] flex items-center justify-center text-5xl">
                                🧠
                            </div>
                        )}
                    </div>
                    <button onClick={handlePhotoClick} disabled={uploading}
                        className="absolute bottom-1 right-1 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--color-primary)] hover:brightness-110 transition-colors shadow-lg" title="Alterar Foto">
                        {uploading ? <Loader2 size={16} className="animate-spin text-white" /> : <Edit2 size={16} className="text-white" />}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                        className="hidden" onChange={handlePhotoChange} />
                </div>

                {uploadError && <p className="text-xs text-[var(--color-danger)] mb-2 text-center">{uploadError}</p>}

                <h1 className="text-3xl font-black text-center tracking-tight mb-6">
                    {profile?.display_name || 'Estudante'}
                </h1>

                {/* ── Core Markers (Nous, Streak, Friends, Shields) ── */}
                <div className="w-full grid grid-cols-4 gap-2 mb-8 max-w-sm">
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
            <div className="px-5 mt-4 flex justify-between items-center relative z-10">
                <p className="text-sm font-medium text-[var(--color-text-muted)] flex items-center gap-2">
                    ID: {profile?.friend_id ?? '---'}
                    <button onClick={copyFriendId} title="Copiar ID">
                        <Copy size={13} style={{ color: copied ? 'var(--color-success)' : 'inherit' }} />
                    </button>
                </p>
                <button onClick={handleLogout} className="w-10 h-10 rounded-2xl flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors" title="Sair">
                    <LogOut size={18} className="text-white" />
                </button>
            </div>

            {/* Avatar customizer — only shown if no photo */}
            {!avatarUrl && (
                <div className="px-5 mb-6 mt-4">
                    <p className="text-xs uppercase font-bold text-[var(--color-text-muted)] mb-3 tracking-wider">
                        Personalizar Avatar
                    </p>
                    <div className="rounded-2xl p-4 space-y-4" style={{ background: 'var(--color-surface)', border: '2px solid var(--color-border)' }}>
                        {(Object.keys(AVATAR_OPTIONS) as (keyof typeof AVATAR_OPTIONS)[]).map(key => (
                            <div key={key}>
                                <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-[var(--color-text-sub)]">
                                    {SECTION_LABELS[key]}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {AVATAR_OPTIONS[key].map(({ id, label }) => {
                                        const active = avatarConfig[key as keyof AvatarConfig] === id;
                                        return (
                                            <button key={id} onClick={() => handleAvatarChange(key as keyof AvatarConfig, id)}
                                                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2"
                                                style={{
                                                    background: active ? 'rgba(28, 176, 246, 0.1)' : 'transparent',
                                                    color: active ? 'var(--color-primary)' : 'var(--color-text-sub)',
                                                    borderColor: active ? 'var(--color-primary)' : 'var(--color-border)',
                                                }}>
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Compact Stats Row ── */}
            <div className="px-5 mt-2 relative z-10 w-full">
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

            {/* Badges / Broches (Phase 6.3) */}
            <div className="px-5 mt-8 mb-6">
                <div className="flex justify-between items-end mb-4 border-b-2 pb-2" style={{ borderColor: 'var(--color-border)' }}>
                    <h2 className="text-xl font-bold text-[var(--color-text)]">Conquistas</h2>
                    <span className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-widest cursor-pointer">
                        VER TODAS
                    </span>
                </div>
                {profile?.badges && profile.badges.length > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                        {profile.badges.map(b => {
                            const [league, posStr] = b.split('_');
                            const pos = parseInt(posStr) || 3;
                            let icon = '🥉';
                            if (league === 'campeonato' || league === 'diamante') { icon = '💎'; }
                            if (league === 'ouro' || pos === 1) { icon = '🥇'; }
                            if (league === 'prata' || pos === 2) { icon = '🥈'; }

                            return (
                                <div key={b} className="flex flex-col items-center justify-center p-2 rounded-2xl relative overflow-hidden"
                                    style={{ border: `2px solid var(--color-border)`, background: 'var(--color-surface)' }}>
                                    <span className="text-3xl mb-1">{icon}</span>
                                    <span className="text-[8px] font-black uppercase text-center w-full truncate" style={{ color: 'var(--color-text)' }}>
                                        {league}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-2xl p-6 text-center" style={{ border: '2px dashed var(--color-border)' }}>
                        <p className="text-xs font-bold text-[var(--color-text-muted)]">Nenhuma conquista ainda.</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Gere conquistas vencendo Ligas semanais.</p>
                    </div>
                )}
            </div>

            {/* Avatar customizer — only shown if no photo */}
            {!avatarUrl && (
                <div className="px-5 mb-6 mt-4">
                    <p className="text-xs uppercase font-bold text-[var(--color-text-muted)] mb-3 tracking-wider pl-2">
                        Personalizar Avatar
                    </p>
                    <div className="rounded-3xl p-5 space-y-5 bg-[var(--color-glass)] border border-[var(--color-border)]">
                        {(Object.keys(AVATAR_OPTIONS) as (keyof typeof AVATAR_OPTIONS)[]).map(key => (
                            <div key={key}>
                                <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-[var(--color-text-sub)]">
                                    {SECTION_LABELS[key]}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {AVATAR_OPTIONS[key].map(({ id, label }) => {
                                        const active = avatarConfig[key as keyof AvatarConfig] === id;
                                        return (
                                            <button key={id} onClick={() => handleAvatarChange(key as keyof AvatarConfig, id)}
                                                className="px-4 py-2 rounded-2xl text-xs font-bold transition-all border-2"
                                                style={{
                                                    background: active ? 'rgba(28, 176, 246, 0.15)' : 'transparent',
                                                    color: active ? 'var(--color-primary)' : 'var(--color-text-sub)',
                                                    borderColor: active ? 'var(--color-primary)' : 'var(--color-border)',
                                                }}>
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
