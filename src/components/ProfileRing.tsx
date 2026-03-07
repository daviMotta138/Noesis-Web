// src/components/ProfileRing.tsx
// Instagram-style ring that flips between photo and avatar every 5 seconds (or on swipe/tap)

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar2D, DEFAULT_AVATAR_CONFIG } from './Avatar2D';
import type { AvatarConfig } from './Avatar2D';

interface ProfileRingProps {
    /** Photo URL from Supabase Storage */
    photoUrl?: string | null;
    /** Avatar config JSON from profile.avatar_config */
    avatarConfig?: Record<string, string> | null;
    /** Size in px (width = height of outer ring) */
    size?: number;
    /** Show ring glow border */
    ring?: boolean;
    /** Ring color, default gold */
    ringColor?: string;
    className?: string;
}

export function ProfileRing({
    photoUrl,
    avatarConfig,
    size = 64,
    ring = true,
    ringColor = 'var(--color-border-glow)',
    className = '',
}: ProfileRingProps) {
    const hasPhoto = !!photoUrl;
    const hasAvatar = !!avatarConfig && Object.keys(avatarConfig).length > 0;
    const hasBoth = hasPhoto && hasAvatar;

    // Which face to show: 'photo' or 'avatar'
    const [face, setFace] = useState<'photo' | 'avatar'>('photo');

    // Auto-flip every 5 seconds if both exist
    useEffect(() => {
        if (!hasBoth) return;
        const t = setInterval(() => {
            setFace(f => f === 'photo' ? 'avatar' : 'photo');
        }, 5000);
        return () => clearInterval(t);
    }, [hasBoth]);

    const flip = useCallback(() => {
        if (!hasBoth) return;
        setFace(f => f === 'photo' ? 'avatar' : 'photo');
    }, [hasBoth]);

    const cfg: AvatarConfig = { ...DEFAULT_AVATAR_CONFIG, ...(avatarConfig ?? {}) };

    const showAvatar = hasBoth ? face === 'avatar' : (!hasPhoto && hasAvatar);
    const showPhoto = hasBoth ? face === 'photo' : hasPhoto;

    return (
        <div
            className={`relative flex-shrink-0 ${hasBoth ? 'cursor-pointer' : ''} ${className}`}
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                border: ring ? `2px solid ${ringColor}` : 'none',
                overflow: 'hidden',
                background: 'rgba(0,0,0,0.4)',
            }}
            onClick={flip}
            title={hasBoth ? 'Toque para alternar foto e avatar' : undefined}
        >
            <AnimatePresence mode="wait">
                {showPhoto && photoUrl ? (
                    <motion.img
                        key="photo"
                        src={photoUrl}
                        alt="Foto"
                        initial={{ rotateY: -90, opacity: 0 }}
                        animate={{ rotateY: 0, opacity: 1 }}
                        exit={{ rotateY: 90, opacity: 0 }}
                        transition={{ duration: 0.35, ease: 'easeInOut' }}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                    />
                ) : showAvatar ? (
                    <motion.div
                        key="avatar"
                        initial={{ rotateY: -90, opacity: 0 }}
                        animate={{ rotateY: 0, opacity: 1 }}
                        exit={{ rotateY: 90, opacity: 0 }}
                        transition={{ duration: 0.35, ease: 'easeInOut' }}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            background: 'linear-gradient(to bottom, rgba(168,85,247,0.12), rgba(0,0,0,0.3))',
                        }}
                    >
                        {/* Avatar bust, scaled to fill the ring */}
                        <Avatar2D
                            config={cfg}
                            mode="bust"
                            width={size * 1.15}
                        />
                    </motion.div>
                ) : (
                    // Fallback: initials or emoji
                    <motion.div
                        key="fallback"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: size * 0.4,
                        }}
                    >
                        🧠
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Flip indicator dots — only when both exist */}
            {hasBoth && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: 3,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: 3,
                    }}
                >
                    {(['photo', 'avatar'] as const).map(f => (
                        <div
                            key={f}
                            style={{
                                width: 4,
                                height: 4,
                                borderRadius: '50%',
                                background: face === f ? '#fff' : 'rgba(255,255,255,0.35)',
                                transition: 'background 0.3s',
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default ProfileRing;
