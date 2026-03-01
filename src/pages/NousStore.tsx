import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Star, Zap, Crown } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import coinImg from '../assets/coin.webp';

// ─── Packages ─────────────────────────────────────────────────────────────────
const PACKS = [
    {
        id: 'starter',
        nous: 500,
        price: 'R$ 4,99',
        cents: 499,
        bonus: 0,
        label: 'Iniciante',
        icon: <Star size={28} />,
        accent: '#5B5FDE',
        accentGlow: 'rgba(91,95,222,0.35)',
        tier: 1,
    },
    {
        id: 'popular',
        nous: 1500,
        price: 'R$ 12,99',
        cents: 1299,
        bonus: 100,
        label: 'Popular',
        badge: '🔥 MAIS POPULAR',
        icon: <Zap size={32} />,
        accent: '#D4A853',
        accentGlow: 'rgba(212,168,83,0.45)',
        tier: 2,
    },
    {
        id: 'elite',
        nous: 4000,
        price: 'R$ 29,99',
        cents: 2999,
        bonus: 500,
        label: 'Elite',
        icon: <Sparkles size={36} />,
        accent: '#2DD4BF',
        accentGlow: 'rgba(45,212,191,0.35)',
        tier: 3,
    },
    {
        id: 'master',
        nous: 10000,
        price: 'R$ 74,99',
        cents: 7499,
        bonus: 2000,
        label: 'Mestre',
        badge: '✨ MELHOR VALOR',
        icon: <Crown size={40} />,
        accent: '#F87171',
        accentGlow: 'rgba(248,113,113,0.35)',
        tier: 4,
    },
];

// Coin stack visual
function CoinStack({ count, accent }: { count: number; accent: string }) {
    const stacks = Math.min(8, Math.ceil(count / 1000));
    return (
        <div className="relative flex items-end justify-center" style={{ height: 72, width: 80 }}>
            {[...Array(stacks)].map((_, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    bottom: i * 7,
                    width: 52,
                    height: 18,
                    borderRadius: '50%',
                    background: `linear-gradient(180deg, ${accent} 0%, ${accent}88 100%)`,
                    boxShadow: `0 2px 8px ${accent}55`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: i,
                }} />
            ))}
            {/* Top coin glow */}
            <div style={{
                position: 'absolute', bottom: stacks * 7,
                width: 52, height: 18, borderRadius: '50%',
                background: `linear-gradient(180deg, #fff 0%, ${accent} 100%)`,
                boxShadow: `0 0 20px ${accent}`,
                left: '50%', transform: 'translateX(-50%)',
                zIndex: stacks,
            }} />
        </div>
    );
}

export default function NousStorePage() {
    const navigate = useNavigate();
    const { profile, updateProfile } = useGameStore();
    const [buying, setBuying] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleBuy = async (pack: typeof PACKS[0]) => {
        setBuying(pack.id); setSuccess(null);
        // Simulate purchase (real implementation would use Stripe / payment gateway)
        await new Promise(r => setTimeout(r, 1200));
        await updateProfile({ nous_coins: (profile?.nous_coins ?? 0) + pack.nous + pack.bonus });
        setBuying(null);
        setSuccess(`+${pack.nous + pack.bonus} Nous adicionados!`);
        setTimeout(() => setSuccess(null), 3000);
    };

    return (
        <div className="min-h-screen">
            {/* Hero header */}
            <div className="relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #07080F 0%, #1A1530 50%, #07080F 100%)', paddingTop: 40, paddingBottom: 60 }}>
                {/* Animated background particles */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                        <motion.div key={i}
                            animate={{ y: [0, -30, 0], opacity: [0.2, 0.6, 0.2] }}
                            transition={{ duration: 3 + i * 0.3, repeat: Infinity, delay: i * 0.15 }}
                            style={{
                                position: 'absolute', borderRadius: '50%',
                                width: Math.random() > 0.6 ? 4 : 2,
                                height: Math.random() > 0.6 ? 4 : 2,
                                background: '#D4A853',
                                left: `${(i * 5.3) % 100}%`,
                                top: `${(i * 7.1) % 100}%`,
                            }}
                        />
                    ))}
                    {/* Big glow orb */}
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 400, height: 400, borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(212,168,83,0.12) 0%, transparent 70%)',
                    }} />
                </div>

                {/* Back button */}
                <button onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-sm font-semibold mb-8 relative z-10"
                    style={{ color: 'var(--color-text-muted)', marginLeft: 32 }}>
                    <ArrowLeft size={16} /> Voltar
                </button>

                <div className="text-center relative z-10 px-8">
                    {/* Jumbo coin */}
                    <motion.div
                        animate={{ y: [0, -8, 0], rotateY: [0, 360] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        className="text-8xl mb-6 inline-block"
                        style={{ filter: 'drop-shadow(0 0 30px rgba(212,168,83,0.8))' }}>
                        <img src={coinImg} className="w-24 h-24 object-contain" alt="" />
                    </motion.div>

                    <h1 className="text-5xl font-black text-display text-gradient-gold mb-3">
                        NOUS
                    </h1>
                    <p className="text-base mb-2" style={{ color: 'var(--color-text-sub)' }}>
                        A moeda do Palácio da Memória
                    </p>
                    <div className="badge-gold text-sm mx-auto">
                        <img src={coinImg} className="w-4 h-4 object-contain inline-block mr-1" alt="" />
                        Seu saldo: {profile?.is_admin ? '∞' : (profile?.nous_coins ?? 0).toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Success toast */}
            {success && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                    className="fixed top-6 left-1/2 -translate-x-1/2 z-50 panel px-6 py-3 font-bold text-sm"
                    style={{ border: '1px solid rgba(212,168,83,0.5)', color: 'var(--color-gold)', boxShadow: '0 8px 24px rgba(212,168,83,0.3)' }}>
                    ✓ {success}
                </motion.div>
            )}

            {/* Packs grid */}
            <div className="px-8 py-10">
                <p className="text-xs tracking-[0.3em] uppercase mb-6 text-center" style={{ color: 'var(--color-text-muted)' }}>
                    Escolha seu pacote
                </p>

                <div className="grid grid-cols-2 gap-5 max-w-2xl mx-auto lg:grid-cols-4">
                    {PACKS.map((pack, i) => {
                        const isFeatured = pack.tier === 2 || pack.tier === 4;
                        return (
                            <motion.div key={pack.id}
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="relative flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-all duration-300"
                                style={{
                                    background: isFeatured
                                        ? `linear-gradient(145deg, ${pack.accent}18 0%, var(--color-card) 100%)`
                                        : 'var(--color-card)',
                                    border: `1.5px solid ${isFeatured ? pack.accent + '60' : 'var(--color-border)'}`,
                                    boxShadow: isFeatured ? `0 4px 30px ${pack.accentGlow}, 0 0 0 1px ${pack.accent}30` : 'none',
                                    transform: isFeatured ? 'scale(1.02)' : 'scale(1)',
                                }}
                                whileHover={{ scale: isFeatured ? 1.05 : 1.03, boxShadow: `0 8px 40px ${pack.accentGlow}` }}>

                                {/* Badge ribbon */}
                                {pack.badge && (
                                    <div className="absolute top-0 left-0 right-0 py-1.5 text-center text-[10px] font-black tracking-widest"
                                        style={{ background: `linear-gradient(90deg, ${pack.accent}CC, ${pack.accent})`, color: '#0D0F1C' }}>
                                        {pack.badge}
                                    </div>
                                )}

                                <div className={`flex flex-col items-center p-6 flex-1 ${pack.badge ? 'pt-9' : ''}`}>
                                    {/* Coin stack visual */}
                                    <div className="mb-4" style={{ color: pack.accent }}>
                                        <CoinStack count={pack.nous} accent={pack.accent} />
                                    </div>

                                    <div className="text-3xl mb-3" style={{
                                        color: pack.accent,
                                        filter: `drop-shadow(0 0 12px ${pack.accent})`
                                    }}>
                                        {pack.icon}
                                    </div>

                                    {/* Amount */}
                                    <p className="text-2xl font-black mb-0.5" style={{ color: 'var(--color-text)' }}>
                                        {pack.nous.toLocaleString()}
                                    </p>
                                    {pack.bonus > 0 && (
                                        <p className="text-xs font-bold" style={{ color: pack.accent }}>
                                            +{pack.bonus} bônus
                                        </p>
                                    )}
                                    <p className="text-xs mt-1 mb-5" style={{ color: 'var(--color-text-muted)' }}>Nous</p>

                                    {/* Price */}
                                    <p className="text-xl font-black mb-4" style={{ color: 'var(--color-text)' }}>
                                        {pack.price}
                                    </p>

                                    {/* Buy button */}
                                    <button onClick={() => handleBuy(pack)} disabled={buying === pack.id}
                                        className="w-full py-3 rounded-xl text-sm font-black transition-all"
                                        style={{
                                            background: `linear-gradient(135deg, ${pack.accent}CC, ${pack.accent})`,
                                            color: '#0D0F1C',
                                            boxShadow: `0 4px 16px ${pack.accentGlow}`,
                                            opacity: buying === pack.id ? 0.6 : 1,
                                            letterSpacing: '0.08em',
                                        }}>
                                        {buying === pack.id ? '⌛ Aguarde...' : 'COMPRAR'}
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Legal note */}
                <p className="text-center text-xs mt-10 max-w-md mx-auto" style={{ color: 'var(--color-text-muted)' }}>
                    Nous é uma moeda virtual sem valor monetário real. As compras são processadas com segurança.
                    Todos os valores em BRL já incluem impostos aplicáveis.
                </p>
            </div>
        </div>
    );
}
