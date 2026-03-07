import { useState, useEffect } from 'react';
import { motion, type PanInfo, useAnimation } from 'framer-motion';
import { Avatar2D, type AvatarConfig, DEFAULT_AVATAR_CONFIG } from './Avatar2D';

interface FlippableProfilePicProps {
    avatarUrl: string | null;
    avatarConfig?: Partial<AvatarConfig> | null;
    fallbackAvatar: React.ReactNode;
    size?: number;
    className?: string;
    /** Whether to enable the 5s auto-flip timer */
    autoFlip?: boolean;
}

export function FlippableProfilePic({
    avatarUrl,
    avatarConfig,
    fallbackAvatar,
    size = 64,
    className = '',
    autoFlip = true,
}: FlippableProfilePicProps) {
    // isFlipped: false = front (photo), true = back (3D avatar)
    const [isFlipped, setIsFlipped] = useState(false);
    const [imgError, setImgError] = useState(false);
    const controls = useAnimation();

    const hasAvatarConfig = avatarConfig && Object.keys(avatarConfig).length > 0;

    // The avatar flip mechanism runs every 5 seconds if enabled
    useEffect(() => {
        if (!autoFlip || !hasAvatarConfig) return;
        const interval = setInterval(() => {
            setIsFlipped(prev => !prev);
        }, 5000);
        return () => clearInterval(interval);
    }, [autoFlip, hasAvatarConfig]);

    // Animate rotation based on state
    useEffect(() => {
        controls.start({
            rotateY: isFlipped ? 180 : 0,
            transition: { type: 'spring', stiffness: 100, damping: 20 },
        });
    }, [isFlipped, controls]);

    const handleDragEnd = (_: any, info: PanInfo) => {
        if (!hasAvatarConfig) return;
        const threshold = 30; // pixels to trigger flip
        if (info.offset.x > threshold || info.offset.x < -threshold) {
            setIsFlipped(prev => !prev);
        } else {
            // Snap back if threshold not met
            controls.start({ rotateY: isFlipped ? 180 : 0 });
        }
    };

    const cfg: AvatarConfig = {
        ...DEFAULT_AVATAR_CONFIG,
        ...(avatarConfig || {}),
    };

    const bgStyle = 'rgba(0,0,0,0.4)';
    const borderStyle = '1px solid rgba(255,255,255,0.08)';

    return (
        <div
            className={`relative rounded-full ${className}`}
            style={{
                width: size,
                height: size,
                perspective: 1000,
            }}
        >
            <motion.div
                className="w-full h-full relative rounded-full"
                style={{ transformStyle: 'preserve-3d' }}
                animate={controls}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                // Stop dragging propagation so we don't accidentally close modals or swipe horizontal-canvas
                onPointerDownCapture={e => e.stopPropagation()}
            >
                {/* Front: Profile Photo (rotateY: 0) */}
                <div
                    className="absolute w-full h-full rounded-full overflow-hidden flex flex-col items-center justify-center text-xl shadow-inner pointer-events-none"
                    style={{
                        backfaceVisibility: 'hidden',
                        background: bgStyle,
                        border: borderStyle,
                    }}
                >
                    {avatarUrl && !imgError ? (
                        <img src={avatarUrl} alt="Photo" className="w-full h-full object-cover" draggable={false} onError={() => setImgError(true)} />
                    ) : (
                        <span className="font-black text-[0.8em]">{fallbackAvatar}</span>
                    )}
                </div>

                {/* Back: 3D Avatar (rotateY: 180) */}
                <div
                    className="absolute w-full h-full rounded-full overflow-hidden pointer-events-none"
                    style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        background: 'linear-gradient(to bottom, rgba(168,85,247,0.1), transparent)',
                        border: borderStyle,
                    }}
                >
                    <div className="absolute inset-x-0 bottom-0 top-3 flex justify-center">
                        {/* Bust mode inside the circular/rounded container */}
                        <Avatar2D config={cfg} mode="bust" width={size * 1.9} />
                    </div>
                    {/* Purple floor glow */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3/4 h-2 rounded-full blur-md opacity-60 pointer-events-none"
                        style={{ background: '#A855F7' }} />
                </div>
            </motion.div>
        </div>
    );
}
