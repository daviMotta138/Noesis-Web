import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Package, Shirt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/useGameStore';
import { audio } from '../lib/audio';
import shieldImg from '../assets/shield.png';
import giftImg from '../assets/gift.png';

// Categories that can be equipped in the Avatar screen
const EQUIPPABLE_CATEGORIES = [
    'headwear', 'hair', 'shirt', 'coat', 'outfits',
    'pants', 'shoes', 'accessory', 'effect', 'item', 'pet', 'gender',
];

// Pre-generated particle data — avoids Math.random() on every render
const PARTICLE_DATA = Array.from({ length: 10 }, (_, i) => ({
    delay: i * 0.07,
    x: Math.round((Math.random() - 0.5) * 180),
    y: Math.round((Math.random() - 0.5) * 180),
}));

// ─── Magical Particle (CSS animation instead of framer-motion for perf) ────────
function Particle({ delay, x, y }: { delay: number; x: number; y: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.4], x, y }}
            transition={{ duration: 1.2, delay, ease: 'easeOut' }}
            className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
            style={{
                background: '#E8B84B',
                top: '50%',
                left: '50%',
            }}
        />
    );
}

// ─── Phase 1: Unopened Gift ──────────────────────────────────────────────────
function GiftClosedView({ senderName, onOpen }: { senderName: string; onOpen: () => void }) {
    return (
        <motion.div
            key="closed"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.08, y: -20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="flex flex-col items-center text-center"
        >
            {/* From label */}
            <div className="mb-6 flex items-center gap-2 px-4 py-2 rounded-full"
                style={{ background: 'rgba(212,168,83,0.1)', border: '1px solid rgba(212,168,83,0.2)' }}>
                <span className="text-xs" style={{ color: 'var(--color-gold-dim)' }}>PRESENTE DE</span>
                <span className="text-xs font-black" style={{ color: 'var(--color-gold)' }}>{senderName}</span>
            </div>

            {/* Gift box — single CSS float animation, no more infinite framer loops */}
            <div className="relative mb-8" style={{ animation: 'giftFloat 3s ease-in-out infinite' }}>
                {/* Single subtle glow ring */}
                <div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                        background: 'rgba(212,168,83,0.12)',
                        transform: 'scale(1.3)',
                        animation: 'giftPulse 3s ease-in-out infinite',
                    }}
                />
                <img
                    src={giftImg}
                    alt="Presente"
                    className="w-44 h-44 object-contain relative z-10"
                    style={{ filter: 'drop-shadow(0 0 20px rgba(212,168,83,0.5))' }}
                />
            </div>

            {/* Title */}
            <h2 className="text-4xl font-black text-display text-gradient-gold uppercase mb-2 tracking-tight">
                PRESENTE!
            </h2>
            <p className="text-sm mb-10" style={{ color: 'var(--color-text-sub)' }}>
                Você recebeu um item especial
            </p>

            {/* ABRIR Button — shimmer removed to avoid extra layer compositing */}
            <motion.button
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.03 }}
                onClick={onOpen}
                className="w-full max-w-xs h-16 rounded-2xl font-black text-xl uppercase tracking-widest text-[#110800] flex items-center justify-center gap-3"
                style={{
                    background: 'linear-gradient(135deg, #C49333 0%, #E8B84B 50%, #C49333 100%)',
                    boxShadow: '0 0 30px rgba(212,168,83,0.4)',
                }}
            >
                <Package size={22} />
                ABRIR
            </motion.button>
        </motion.div>
    );
}

// ─── Phase 2: Item Reveal ────────────────────────────────────────────────────
function GiftRevealView({
    metadata,
    claiming,
    claimed,
    isEquippable,
    onClaim,
    onEquip,
}: {
    metadata: any;
    claiming: boolean;
    claimed: boolean;
    isEquippable: boolean;
    onClaim: () => void;
    onEquip: () => void;
}) {
    const isShield = metadata.category === 'shield';

    return (
        <motion.div
            key="reveal"
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 240 }}
            className="flex flex-col items-center text-center"
        >
            {/* Item showcase */}
            <div className="relative mb-6 flex items-center justify-center">
                {/* Burst particles — pre-computed, rendered once */}
                {PARTICLE_DATA.map((p, i) => (
                    <Particle key={i} delay={p.delay} x={p.x} y={p.y} />
                ))}

                {/* Item frame */}
                <motion.div
                    initial={{ scale: 0, rotate: -12 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 16, stiffness: 220, delay: 0.08 }}
                    className="relative w-44 h-44 rounded-3xl flex items-center justify-center overflow-hidden"
                    style={{
                        background: 'linear-gradient(145deg, rgba(212,168,83,0.18), rgba(20,15,35,0.9))',
                        border: '2px solid rgba(212,168,83,0.55)',
                        boxShadow: '0 0 50px rgba(212,168,83,0.25)',
                    }}
                >
                    {isShield ? (
                        <img src={shieldImg} className="w-24 h-24 object-contain" alt="" />
                    ) : metadata.preview_url ? (
                        <img src={metadata.preview_url} className="w-28 h-28 object-contain" alt={metadata.name} />
                    ) : (
                        <span className="text-7xl">{metadata.emoji || '🎁'}</span>
                    )}
                </motion.div>
            </div>

            {/* Item info */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-8 space-y-1"
            >
                {metadata.category && (
                    <p className="text-xs font-black uppercase tracking-[0.2em]"
                        style={{ color: 'var(--color-gold-dim)' }}>
                        {metadata.category}
                    </p>
                )}
                <h2 className="text-3xl font-black text-display text-white uppercase tracking-tight leading-none">
                    {metadata.name || 'Item'}
                </h2>
                {isShield && metadata.shield_amount && (
                    <p className="text-sm" style={{ color: 'var(--color-text-sub)' }}>
                        {metadata.shield_amount} escudo{metadata.shield_amount > 1 ? 's' : ''} de ofensiva
                    </p>
                )}
            </motion.div>

            {/* Action buttons */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 }}
                className="w-full space-y-3"
            >
                {claimed ? (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex flex-col items-center gap-2"
                        style={{ color: 'var(--color-gold)' }}
                    >
                        <CheckCircle2 size={52} />
                        <span className="font-black text-sm uppercase tracking-widest">
                            {isEquippable ? 'Item equipado!' : 'Item recebido!'}
                        </span>
                    </motion.div>
                ) : (
                    <>
                        {isEquippable && (
                            <button
                                onClick={onEquip}
                                disabled={claiming}
                                className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"
                                style={{
                                    background: 'linear-gradient(135deg, #C49333, #E8B84B)',
                                    color: '#110800',
                                    boxShadow: '0 0 20px rgba(212,168,83,0.35)',
                                }}
                            >
                                <Shirt size={18} />
                                EQUIPAR
                            </button>
                        )}
                        <button
                            onClick={onClaim}
                            disabled={claiming}
                            className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"
                            style={{
                                background: isEquippable ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #C49333, #E8B84B)',
                                border: isEquippable ? '1px solid rgba(255,255,255,0.12)' : 'none',
                                color: isEquippable ? 'var(--color-text-sub)' : '#110800',
                                boxShadow: isEquippable ? 'none' : '0 0 20px rgba(212,168,83,0.35)',
                            }}
                        >
                            {claiming
                                ? <Loader2 className="animate-spin" size={20} />
                                : 'RECEBER'
                            }
                        </button>
                    </>
                )}
            </motion.div>
        </motion.div>
    );
}

// ─── Main Overlay ─────────────────────────────────────────────────────────────
export const GiftClaimOverlay = () => {
    const navigate = useNavigate();
    const { user, fetchProfile, pendingGift, checkPendingGifts, setPendingGift } = useGameStore();
    const [phase, setPhase] = useState<'closed' | 'reveal'>('closed');
    const [claiming, setClaiming] = useState(false);
    const [claimed, setClaimed] = useState(false);

    useEffect(() => {
        if (user?.id) checkPendingGifts();
    }, [user?.id, checkPendingGifts]);

    // Reset when a new gift arrives
    useEffect(() => {
        setPhase('closed');
        setClaimed(false);
        setClaiming(false);
    }, [pendingGift?.id]);

    const handleOpen = () => {
        audio.play('flip');
        setPhase('reveal');
    };

    const markClaimed = async () => {
        if (!pendingGift || claiming) return;
        setClaiming(true);
        try {
            await supabase.from('notifications')
                .update({ claimed: true, read_at: new Date().toISOString() })
                .eq('id', pendingGift.id);
            setClaimed(true);
            audio.play('success');
            setTimeout(() => {
                setClaimed(false);
                setClaiming(false);
                setPendingGift(null);
                if (user?.id) fetchProfile(user.id);
                checkPendingGifts();
            }, 2500);
        } catch (err) {
            console.error('Error claiming gift:', err);
            setClaiming(false);
        }
    };

    const handleEquip = async () => {
        await markClaimed();
        setTimeout(() => navigate('/avatar'), 2600);
    };

    if (!pendingGift) return null;

    const metadata = pendingGift.metadata || {};
    const isEquippable = EQUIPPABLE_CATEGORIES.includes(metadata.category);

    const overlay = (
        <AnimatePresence>
            <motion.div
                key="gift-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[300] flex items-center justify-center p-6"
                style={{ background: 'rgba(8,8,18,0.93)' }}
            >
                {/* Ambient glow — single static layer */}
                <div className="absolute inset-0 pointer-events-none" style={{
                    background: 'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(212,168,83,0.08) 0%, transparent 70%)'
                }} />

                {/* Content card */}
                <motion.div
                    initial={{ scale: 0.88, y: 35 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 24, stiffness: 280 }}
                    className="relative w-full max-w-sm"
                >
                    <div className="relative overflow-hidden rounded-[2rem] p-8 flex flex-col items-center"
                        style={{
                            background: 'linear-gradient(145deg, rgba(26,29,48,0.98), rgba(15,12,30,0.98))',
                            border: '1px solid rgba(212,168,83,0.22)',
                            boxShadow: '0 28px 70px rgba(0,0,0,0.6)',
                        }}
                    >
                        <AnimatePresence mode="wait">
                            {phase === 'closed' ? (
                                <GiftClosedView
                                    senderName={metadata.sender_name || 'Alguém'}
                                    onOpen={handleOpen}
                                />
                            ) : (
                                <GiftRevealView
                                    metadata={metadata}
                                    claiming={claiming}
                                    claimed={claimed}
                                    isEquippable={isEquippable}
                                    onClaim={markClaimed}
                                    onEquip={handleEquip}
                                />
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );

    return createPortal(overlay, document.body);
};
