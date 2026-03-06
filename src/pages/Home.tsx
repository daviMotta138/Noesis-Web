import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, CheckCircle2, XCircle, ChevronRight, Flame, Star, ChevronRightCircle, Maximize2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { supabase } from '../lib/supabase';
import { drawWords, WORD_COUNT_OPTIONS } from '../lib/words';
import { scoreAnswers } from '../lib/levenshtein';
import { MemoryCard } from '../components/MemoryCard';
import { Timer } from '../components/Timer';
import { audio } from '../lib/audio';
import coinImg from '../assets/coin.webp';
import shieldImg from '../assets/shield.png';

// ─── Viewing Phase ────────────────────────────────────────────────────────────
function ViewingPhase() {
    const { profile, wordCount, setWordCount, session, startSession, challengeHours, challengeReward, setChallengeHours, setChallengeReward } = useGameStore();
    const navigate = useNavigate();
    const [words, setWords] = useState<string[]>(() => drawWords(wordCount));
    const [flipped, setFlipped] = useState(false);
    const [loading, setLoading] = useState(false);
    const [banners, setBanners] = useState<any[]>([]);
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [weeklyAnimating, setWeeklyAnimating] = useState(false); // beams firing
    const [weeklyGlow, setWeeklyGlow] = useState(false);           // cards turned purple

    // Neon beam animation trigger
    const fireWeeklyAnimation = () => {
        if (weeklyGlow || weeklyAnimating) return;
        setWeeklyAnimating(true);
        // After 2.5s beams merge with cards
        setTimeout(() => {
            setWeeklyGlow(true);
            setWeeklyAnimating(false);
        }, 2500);
    };

    // Inject neon beam keyframes once
    useEffect(() => {
        const id = 'noesis-neon-styles';
        if (document.getElementById(id)) return;
        const style = document.createElement('style');
        style.id = id;
        style.textContent = `
            @keyframes neon-spin-1 { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
            @keyframes neon-spin-2 { from { transform: rotate(0deg); }   to { transform: rotate(-360deg); } }
            @keyframes neon-spin-3 { from { transform: rotate(60deg); }  to { transform: rotate(420deg); } }
            @keyframes neon-pulse-ring {
                0%, 100% { opacity: 0.9; transform: translate(-50%,-50%) scale(1); }
                50%       { opacity: 0.35; transform: translate(-50%,-50%) scale(1.06); }
            }
            @keyframes weekly-btn-pulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(168,85,247,0.5); }
                50%       { box-shadow: 0 0 0 8px rgba(168,85,247,0); }
            }
        `;
        document.head.appendChild(style);
    }, []);


    // ESC key closes lightbox
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Load stored weekly challenge info
    const weeklyUsedKey = `noesis_weekly_challenge_${new Date().getFullYear()}_${new Date().getMonth()}`;
    const weeklyAlreadyUsed = !!localStorage.getItem(weeklyUsedKey);

    // Challenge options: { hours, reward, label, isWeekly }
    const CHALLENGE_OPTIONS = [
        { hours: 3, reward: 5, label: '3h', desc: '3 horas', weekly: false },
        { hours: 6, reward: 10, label: '6h', desc: '6 horas', weekly: false },
        { hours: 12, reward: 20, label: '12h', desc: '12 horas', weekly: false },
        { hours: 24, reward: 35, label: '24h', desc: '24 horas', weekly: false },
        { hours: 168, reward: 100, label: '1 sem', desc: '1 semana', weekly: true },
    ];

    useEffect(() => {
        // Fetch active banners on mount
        async function fetchBanners() {
            const { data } = await supabase.from('update_banners')
                .select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(5);
            if (data) setBanners(data);
        }
        fetchBanners();
    }, []);

    // Auto-scroll banners
    useEffect(() => {
        if (banners.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [banners.length]);

    // Reload words if word count changes (before any flip)
    useEffect(() => {
        if (!flipped) { setWords(drawWords(wordCount)); }
    }, [wordCount, flipped]);

    // If there's already an active session, restore it
    useEffect(() => {
        if (session?.words) { setWords(session.words); setFlipped(true); }
    }, [session]);

    const handleFlip = async () => {
        if (flipped || loading) return;
        audio.play('flip');
        setFlipped(true);
        setLoading(true);
        if (challengeHours === 168) {
            localStorage.setItem(weeklyUsedKey, 'true');
        }
        await startSession(words, challengeHours, challengeReward);
        setLoading(false);
    };

    const isWeeklySelected = challengeHours === 168;

    return (
        <div className="flex flex-col min-h-screen pb-24 max-w-5xl mx-auto w-full">
            {/* Header — full width */}
            <div className="px-5 pt-10 pb-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs tracking-[0.3em] uppercase mb-1" style={{ color: 'var(--color-gold-dim)' }}>Sessão de hoje</p>
                        <h1 className="text-3xl font-black text-display" style={{ color: 'var(--color-text)', lineHeight: 1.1 }}>
                            Palácio da<br /><span className="text-gradient-gold">Memória</span>
                        </h1>
                    </div>
                    <div className="flex flex-col gap-2 items-end mt-1">
                        <button onClick={() => navigate('/streak')}
                            className="badge-fire cursor-pointer hover:opacity-80 transition-all">
                            <Flame size={11} />{profile?.streak ?? 0} dias
                        </button>
                        <button onClick={() => navigate('/nous')}
                            className="badge-gold cursor-pointer hover:opacity-80 transition-all flex items-center gap-1">
                            <img src={coinImg} className="w-3 h-3 object-contain" alt="" />
                            {profile?.is_admin ? '∞' : (profile?.nous_coins ?? 0)}
                        </button>
                    </div>
                </div>
            </div>

            {/* 2-column layout on desktop */}
            <div className="flex flex-col md:flex-row gap-6 px-5 flex-1 items-start">

                {/* ── Center: cards + CTA + Timer ── */}
                <div className="flex-1 space-y-5 min-w-0">

                    {/* Palace tip (desktop: in center column; mobile: also here) */}
                    {!flipped && (
                        <div className="rounded-2xl p-4 flex gap-3 items-start"
                            style={{ background: 'rgba(91,95,222,0.08)', border: '1px solid rgba(91,95,222,0.2)' }}>
                            <span className="text-xl">🏛️</span>
                            <div>
                                <p className="text-xs font-black mb-1" style={{ color: '#818CF8' }}>Técnica do Palácio</p>
                                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-sub)' }}>
                                    Percorra mentalmente os cômodos da sua casa e coloque uma palavra em cada um. Quanto mais absurda e exagerada a imagem, mais fácil de lembrar!
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Cards grid */}
                    <div className="grid grid-cols-3 gap-3 justify-items-center relative">
                        {/* Neon beam overlay — only while animating */}
                        <AnimatePresence>
                            {weeklyAnimating && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0, transition: { duration: 0.7 } }}
                                    className="absolute inset-0 z-10 pointer-events-none"
                                    style={{ overflow: 'visible' }}>
                                    {/* Classic orbit: zero-size pivot at center, child offset outward */}
                                    {[
                                        { radius: 140, duration: '1.3s', delay: '0s', color: '#A855F7' },
                                        { radius: 110, duration: '1.7s', delay: '-0.5s', color: '#C084FC' },
                                        { radius: 165, duration: '2.1s', delay: '-1s', color: '#7C3AED' },
                                    ].map((b, i) => (
                                        <div key={i} style={{
                                            position: 'absolute',
                                            left: '50%', top: '50%',
                                            width: 0, height: 0,
                                            animation: `neon-spin-${i + 1} ${b.duration} linear infinite`,
                                            animationDelay: b.delay,
                                        }}>
                                            <div style={{
                                                position: 'absolute',
                                                left: b.radius,
                                                top: -14,
                                                width: 6,
                                                height: 28,
                                                borderRadius: 3,
                                                background: `linear-gradient(to bottom, ${b.color}, rgba(168,85,247,0))`,
                                                boxShadow: `0 0 10px 3px ${b.color}99`,
                                            }} />
                                        </div>
                                    ))}
                                    {/* Pulsing border ring removed — beams only */}
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {words.map((word, i) => (
                            <motion.div key={`${word}-${i}`}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}>
                                <MemoryCard word={word} isHidden={flipped} weeklyGlow={weeklyGlow} glowAnimating={weeklyAnimating} />
                            </motion.div>
                        ))}
                    </div>

                    {/* CTA */}
                    <div>
                        {!flipped ? (
                            <div className="space-y-3">
                                <button onClick={handleFlip} disabled={loading} className="btn-gold w-full flex items-center justify-center gap-2">
                                    {loading ? 'Iniciando...' : <>VIRAR CARTAS <ChevronRight size={16} /></>}
                                </button>
                                <p className="text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                    Memorize todas as palavras antes de virar
                                </p>
                            </div>
                        ) : (
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                className="panel p-4 text-center"
                                style={{ border: '1px solid rgba(212,168,83,0.3)', background: 'rgba(212,168,83,0.05)' }}>
                                <p className="font-black text-sm text-gradient-gold">Cronômetro iniciado</p>
                                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                                    As cartas estão guardadas. O teste inicia quando o tempo acabar.
                                </p>
                            </motion.div>
                        )}
                    </div>

                    {/* Timer (after flip) */}
                    {flipped && (
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                            className="flex flex-col items-center">
                            <div className="panel p-6 w-full flex flex-col items-center"
                                style={{ border: '1px solid var(--color-border-glow)' }}>
                                <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: 'var(--color-text-muted)' }}>
                                    Liberação em
                                </p>
                                <Timer
                                    targetTimestamp={(useGameStore.getState().unlockAt) ?? Date.now() + 86400000}
                                    onFinish={() => useGameStore.getState().setPhase('recall')}
                                    size={180}
                                />
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* ── Right sidebar: carousel + settings ── */}
                <div className="w-full md:w-72 lg:w-80 space-y-4 md:sticky md:top-5">

                    {/* Banners carousel */}
                    {banners.length > 0 && !flipped && (
                        <div className="relative w-full aspect-video overflow-hidden rounded-2xl border border-[var(--color-glass-strong)] shadow-lg cursor-pointer"
                            style={{ background: 'var(--color-card)' }}>
                            <AnimatePresence mode="popLayout">
                                <motion.div
                                    key={currentBannerIndex}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute inset-0"
                                    onClick={() => { setLightboxIndex(currentBannerIndex); setLightboxOpen(true); }}
                                >
                                    <img src={banners[currentBannerIndex].image_url} alt={banners[currentBannerIndex].title} className="w-full h-full object-cover" />
                                </motion.div>
                            </AnimatePresence>
                            <div className="absolute inset-x-0 bottom-0 p-4 pb-6 bg-gradient-to-t from-[var(--color-overlay-heavy)] via-[var(--color-overlay)] to-transparent pointer-events-none">
                                <AnimatePresence mode="popLayout">
                                    <motion.p
                                        key={currentBannerIndex}
                                        initial={{ y: 5, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: -5, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="text-sm sm:text-base font-bold text-white shadow-black drop-shadow-md truncate pointer-events-none"
                                    >
                                        {banners[currentBannerIndex].title}
                                    </motion.p>
                                </AnimatePresence>
                            </div>
                            {/* Expand hint icon */}
                            <div className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-lg pointer-events-none"
                                style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
                                <Maximize2 size={12} className="text-white/70" />
                            </div>
                            {banners.length > 1 && (
                                <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none">
                                    {banners.map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-1.5 rounded-full transition-all duration-300 ${i === currentBannerIndex ? 'w-5 bg-white shadow-[0_0_5px_rgba(255,255,255,0.5)]' : 'w-1.5 bg-white/40'}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Fullscreen Lightbox — rendered in a portal so position:fixed escapes the HorizontalCanvas transform */}
                    {createPortal(
                        <AnimatePresence>
                            {lightboxOpen && banners.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.18 }}
                                    className="fixed inset-0 z-[100]"
                                    style={{ background: 'rgba(0,0,0,0.93)', backdropFilter: 'blur(14px)' }}
                                    onClick={() => setLightboxOpen(false)}>

                                    {/* Close — pinned top-right, always visible */}
                                    <button
                                        onClick={() => setLightboxOpen(false)}
                                        className="absolute top-4 right-4 z-10 p-2.5 rounded-xl"
                                        style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                                        <X size={18} className="text-white" />
                                    </button>

                                    {/* Image area — fixed height, centered, never shifts */}
                                    <div className="absolute inset-x-0 top-12 bottom-20 flex items-center justify-center px-4"
                                        onClick={() => setLightboxOpen(false)}>
                                        <motion.div
                                            key={lightboxIndex}
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.9, opacity: 0 }}
                                            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
                                            className="relative w-full max-w-3xl h-full"
                                            onClick={e => e.stopPropagation()}>
                                            <img
                                                src={banners[lightboxIndex].image_url}
                                                alt={banners[lightboxIndex].title}
                                                className="w-full h-full object-contain rounded-xl shadow-2xl"
                                            />
                                            {/* Title overlay */}
                                            {banners[lightboxIndex].title && (
                                                <div className="absolute inset-x-0 bottom-0 px-4 py-3 rounded-b-xl"
                                                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                                                    <p className="text-sm font-bold text-white truncate">{banners[lightboxIndex].title}</p>
                                                    {banners[lightboxIndex].link_url && (
                                                        <a href={banners[lightboxIndex].link_url} target="_blank" rel="noreferrer"
                                                            className="text-xs text-blue-400 hover:underline">
                                                            Abrir link →
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </motion.div>
                                    </div>

                                    {/* Navigation — pinned to bottom, never shifts */}
                                    {banners.length > 1 && (
                                        <div className="absolute bottom-0 inset-x-0 h-20 flex items-center justify-center gap-4"
                                            onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={() => setLightboxIndex(i => (i - 1 + banners.length) % banners.length)}
                                                className="p-3 rounded-xl"
                                                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                                                <ChevronRight size={20} className="text-white rotate-180" />
                                            </button>
                                            <div className="flex gap-1.5 items-center">
                                                {banners.map((_, i) => (
                                                    <button key={i}
                                                        onClick={() => setLightboxIndex(i)}
                                                        className={`h-1.5 rounded-full transition-all duration-300 ${i === lightboxIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`}
                                                    />
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => setLightboxIndex(i => (i + 1) % banners.length)}
                                                className="p-3 rounded-xl"
                                                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                                                <ChevronRight size={20} className="text-white" />
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>,
                        document.body
                    )}

                    {/* Challenge time */}
                    {!flipped && (
                        <div className="panel p-4 transition-all duration-500"
                            style={isWeeklySelected ? {
                                background: 'linear-gradient(135deg, rgba(88,28,135,0.25), rgba(124,58,237,0.15))',
                                border: '1px solid rgba(168,85,247,0.45)',
                                boxShadow: '0 0 24px rgba(168,85,247,0.15)',
                            } : {}}>
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                                    ⚡ Tempo de Desafio
                                </p>
                                <span className="text-lg font-black text-gradient-gold">
                                    +{challengeReward} <img src={coinImg} className="inline w-3.5 h-3.5 object-contain mb-0.5" alt="" />
                                </span>
                            </div>
                            <div className="flex gap-2">
                                {CHALLENGE_OPTIONS.filter(o => !o.weekly).map(opt => {
                                    const isSelected = challengeHours === opt.hours;
                                    return (
                                        <button
                                            key={opt.hours}
                                            onClick={() => {
                                                setChallengeHours(opt.hours);
                                                setChallengeReward(opt.reward);
                                                audio.play('nav');
                                                setWeeklyGlow(false); setWeeklyAnimating(false);
                                            }}
                                            className="flex-1 flex flex-col items-center py-2 rounded-xl text-xs font-black transition-all duration-150"
                                            style={{
                                                background: isSelected ? 'linear-gradient(135deg, #C49333, #E8B84B)' : 'var(--color-glass)',
                                                color: isSelected ? '#0D0F1C' : 'var(--color-text-muted)',
                                                border: isSelected ? 'none' : '1px solid var(--color-border)',
                                            }}
                                        >
                                            <span>{opt.label}</span>
                                            <span className="text-[9px] mt-0.5 opacity-80">+{opt.reward}🪙</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Weekly — full width, own row (hidden if already used) */}
                            {!weeklyAlreadyUsed && (() => {
                                const opt = CHALLENGE_OPTIONS.find(o => o.weekly)!;
                                const isSelected = challengeHours === opt.hours;
                                return (
                                    <button
                                        onClick={() => {
                                            setChallengeHours(opt.hours);
                                            setChallengeReward(opt.reward);
                                            audio.play('nav');
                                            fireWeeklyAnimation();
                                        }}
                                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black transition-all duration-150"
                                        style={{
                                            background: isSelected ? 'linear-gradient(135deg, #7C3AED, #A855F7)' : 'rgba(168,85,247,0.08)',
                                            color: isSelected ? '#fff' : '#A855F7',
                                            border: isSelected ? 'none' : '1px solid rgba(168,85,247,0.4)',
                                            animation: !isSelected ? 'weekly-btn-pulse 2s ease-in-out infinite' : undefined,
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">👑</span>
                                            <div className="text-left">
                                                <div>{opt.label} — <span className="opacity-70">Desafio Semanal</span></div>
                                                <div className="text-[10px] font-normal opacity-60 mt-0.5">1× por mês · Acerte tudo após 1 semana</div>
                                            </div>
                                        </div>
                                        <span className="font-black text-sm">+{opt.reward}🪙</span>
                                    </button>
                                );
                            })()}
                            <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
                                Espere o tempo e acerte todas as palavras para ganhar os Nous!
                            </p>
                        </div>
                    )}

                    {/* Word count */}
                    <div className="panel p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                                    Palavras por sessão
                                </p>
                                {flipped && <Lock size={12} style={{ color: 'var(--color-gold-dim)' }} />}
                            </div>
                            <span className="text-xl font-black text-gradient-gold">{wordCount}</span>
                        </div>
                        {flipped ? (
                            <div className="rounded-xl p-2.5 text-xs" style={{ background: 'rgba(212,168,83,0.07)', border: '1px solid rgba(212,168,83,0.15)', color: 'var(--color-gold-dim)' }}>
                                🔒 Quantidade fixa até amanhã. Mude após o resultado de hoje.
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {WORD_COUNT_OPTIONS.map(n => (
                                    <button key={n} onClick={() => setWordCount(n)}
                                        className="px-3 py-1.5 rounded-xl text-xs font-black transition-all duration-150"
                                        style={{
                                            background: wordCount === n ? 'linear-gradient(135deg, #C49333, #E8B84B)' : 'var(--color-glass)',
                                            color: wordCount === n ? '#0D0F1C' : 'var(--color-text-muted)',
                                            border: wordCount === n ? 'none' : '1px solid var(--color-border)',
                                        }}>
                                        {n}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Waiting Phase ─────────────────────────────────────────────────────────────
function WaitingPhase() {
    const { session, unlockAt, setPhase, giveUpSession, challengeHours } = useGameStore();
    const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const isWeekly = challengeHours === 168;

    useEffect(() => {
        if (!unlockAt) return;
        const id = setInterval(() => { if (Date.now() >= unlockAt) setPhase('recall'); }, 5000);
        return () => clearInterval(id);
    }, [unlockAt, setPhase]);

    const handleGiveUp = async () => {
        setLoading(true);
        await giveUpSession();
        setLoading(false);
        setShowGiveUpConfirm(false);
        setPhase('viewing');
    };

    return (
        <div className="flex flex-col min-h-screen pb-24 pt-10 px-5">
            <div className="mb-8">
                <p className="text-xs tracking-[0.3em] uppercase mb-1"
                    style={{ color: isWeekly ? 'rgba(192,132,252,0.7)' : 'var(--color-gold-dim)' }}>Status</p>
                <h2 className="text-3xl font-black text-display" style={{ lineHeight: 1.1 }}>
                    Consolidando<br /><span style={{
                        background: isWeekly ? 'linear-gradient(90deg,#A855F7,#C084FC)' : undefined,
                        WebkitBackgroundClip: isWeekly ? 'text' : undefined,
                        WebkitTextFillColor: isWeekly ? 'transparent' : undefined,
                    }} className={isWeekly ? '' : 'text-gradient-gold'}>Memória</span>
                </h2>
                <p className="text-sm mt-3" style={{ color: 'var(--color-text-sub)' }}>
                    {isWeekly
                        ? 'Seu desafio semanal está ativo. Aguarde 1 semana e volte para testar sua memória!'
                        : 'Seu hipocampo está fixando as palavras. Aguarde o período de consolidação.'}
                </p>
            </div>

            <div className="panel p-6 mb-5 flex flex-col items-center"
                style={isWeekly ? {
                    border: '1px solid rgba(168,85,247,0.5)',
                    boxShadow: '0 0 32px rgba(168,85,247,0.12)',
                    background: 'linear-gradient(135deg, rgba(88,28,135,0.18), rgba(124,58,237,0.08))'
                } : { border: '1px solid var(--color-border-glow)' }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-5"
                    style={{ color: isWeekly ? 'rgba(192,132,252,0.7)' : 'var(--color-text-muted)' }}>
                    Liberação em
                </p>
                <Timer
                    targetTimestamp={unlockAt ?? Date.now() + 86400000}
                    onFinish={() => setPhase('recall')}
                    size={200}
                    purple={isWeekly}
                />

                {/* Give up button inside timer panel */}
                <button
                    onClick={() => setShowGiveUpConfirm(true)}
                    className="mt-6 text-xs font-bold py-2 px-4 rounded-xl border transition-all"
                    style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'transparent' }}>
                    Desistir desta sessão
                </button>
            </div>

            {session && (
                <div className="panel p-4 mb-4"
                    style={isWeekly ? { border: '1px solid rgba(168,85,247,0.25)' } : {}}>
                    <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
                        {session.words.length} palavras bloqueadas
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {session.words.map((_, i) => (
                            <div key={i} className="px-3 py-1.5 rounded-xl text-xs font-bold"
                                style={{ background: 'var(--color-glass)', border: '1px solid var(--color-border)', color: 'transparent', userSelect: 'none' }}>
                                ████████
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="rounded-2xl p-4 mb-2"
                style={isWeekly ? {
                    background: 'rgba(88,28,135,0.1)',
                    border: '1px solid rgba(168,85,247,0.2)'
                } : { background: 'var(--color-gold-soft)', border: '1px solid rgba(212,168,83,0.2)' }}>
                <p className="text-xs font-bold mb-2" style={{ color: isWeekly ? '#A855F7' : 'var(--color-gold)' }}>Enquanto espera:</p>
                <ul className="text-xs space-y-1" style={{ color: 'var(--color-text-sub)' }}>
                    <li>• Explore a loja e personalize seu avatar</li>
                    <li>• Veja o ranking e desafie amigos</li>
                    <li>• Durma bem — o sono consolida a memória profunda</li>
                </ul>
            </div>

            {/* Give up confirmation modal — portal so fixed escapes HorizontalCanvas transform */}
            {createPortal(
                <AnimatePresence>
                    {showGiveUpConfirm && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-end justify-center pb-10 px-5"
                            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
                            onClick={() => setShowGiveUpConfirm(false)}>
                            <motion.div
                                initial={{ y: 60, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 60, opacity: 0 }}
                                transition={{ type: 'spring', damping: 24, stiffness: 280 }}
                                className="panel p-6 w-full max-w-sm space-y-5"
                                style={{ border: '1px solid rgba(248,113,113,0.25)' }}
                                onClick={e => e.stopPropagation()}>
                                <div className="text-center">
                                    <p className="text-3xl mb-2">🏳️</p>
                                    <h3 className="text-lg font-black text-white">Desistir da sessão?</h3>
                                    <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                                        Você admite que esqueceu as palavras.<br />
                                        Sua sequência pode ser perdida e você não ganhará Nous.
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setShowGiveUpConfirm(false)}
                                        className="btn-ghost py-3 text-sm">
                                        Voltar
                                    </button>
                                    <button
                                        onClick={handleGiveUp}
                                        disabled={loading}
                                        className="py-3 rounded-xl text-sm font-black border transition-all"
                                        style={{ color: '#F87171', borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)' }}>
                                        {loading ? 'Salvando...' : 'Confirmar'}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}

// ─── Recall Phase ─────────────────────────────────────────────────────────────
function RecallPhase() {
    const { session, submitRecall, profile, setPhase, setSession } = useGameStore();
    const words = session?.words ?? [];
    const [answers, setAnswers] = useState<string[]>(() => Array(words.length).fill(''));
    const [submitted, setSubmitted] = useState(false);
    const [results, setResults] = useState<ReturnType<typeof scoreAnswers>>([]);
    const [nousAwarded, setNousAwarded] = useState(0);
    const [loading, setLoading] = useState(false);
    const [shieldUsed, setShieldUsed] = useState(false);

    const handleSubmit = async () => {
        const res = scoreAnswers(answers.filter(Boolean), words);
        const correct = res.filter(r => r.correct).length;
        const score = correct * (words.length <= 3 ? 50 : words.length <= 9 ? 30 : 20);
        // Nous based on challenge reward stored in session
        const nousReward = (session as any)?.nous_reward ?? 15;
        const nous = correct === words.length ? nousReward : 0;

        if (correct === words.length) audio.play('success');
        else if (correct >= words.length / 2) audio.play('match');
        else audio.play('error');

        setResults(res); setNousAwarded(nous); setSubmitted(true);
        setLoading(true);
        const streakBefore = profile?.streak ?? 0;
        const shieldBefore = profile?.shield_count ?? 0;
        await submitRecall(answers, score, nous);

        // We know a shield was used if score is 0 but streak remains the same and shields dropped
        const currentProfile = useGameStore.getState().profile;
        if (score === 0 && currentProfile) {
            if (currentProfile.streak === streakBefore && currentProfile.shield_count < shieldBefore) {
                setShieldUsed(true);
            }
        }
        setLoading(false);
    };


    if (submitted) {
        const correct = results.filter(r => r.correct).length;
        const pct = Math.round((correct / words.length) * 100);
        const allCorrect = correct === words.length;
        return (
            <div className="flex flex-col pt-10 pb-24 px-5 min-h-screen">
                <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                            style={{ background: allCorrect ? 'rgba(212,168,83,0.15)' : pct >= 70 ? 'rgba(45,212,191,0.12)' : 'rgba(91,95,222,0.12)', border: `1px solid ${allCorrect ? 'rgba(212,168,83,0.35)' : pct >= 70 ? 'rgba(45,212,191,0.3)' : 'rgba(91,95,222,0.3)'}` }}>
                            <Star size={28} strokeWidth={1.2} style={{ color: allCorrect ? 'var(--color-gold)' : pct >= 70 ? 'var(--color-success)' : 'var(--color-indigo)' }} />
                        </div>
                    </div>
                    <h2 className="text-3xl font-black text-display">{allCorrect ? 'Perfeito!' : `${correct}/${words.length} acertos`}</h2>
                    <p className="mt-2 text-sm" style={{ color: 'var(--color-text-sub)' }}>{pct}% de precisão</p>
                    <div className="flex justify-center gap-3 mt-4">
                        <div className="badge-gold flex items-center gap-1">
                            <img src={coinImg} className="w-3 h-3 object-contain" alt="" />
                            {nousAwarded > 0 ? `+${nousAwarded} Nous` : 'Sem Nous'}
                        </div>
                        <div className="badge-fire flex items-center gap-1"><Flame size={11} />{profile?.streak ?? 0} dias</div>
                        {shieldUsed && (
                            <div className="badge-gold flex items-center gap-1" style={{ background: 'rgba(45,212,191,0.15)', color: 'var(--color-success)', border: '1px solid rgba(45,212,191,0.3)' }}>
                                <img src={shieldImg} className="w-2.5 h-2.5 object-contain" alt="" />
                                Escudo Ativado
                            </div>
                        )}
                    </div>
                    {nousAwarded === 0 && correct < words.length && (
                        <p className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            Acerte todas as palavras para ganhar Nous
                        </p>
                    )}
                </motion.div>

                <div className="space-y-2 mb-6">
                    {results.map((r, i) => (
                        <motion.div key={i} initial={{ x: -12, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: i * 0.06 }} className="panel p-4 flex items-center gap-3">
                            {r.correct
                                ? <CheckCircle2 size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                                : <XCircle size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />}
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{r.word}</p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-sub)' }}>
                                    Você: <em>{r.answer || '(em branco)'}</em>
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* PROSSEGUIR — user must tap to advance to result phase */}
                <button
                    onClick={() => { setSession(null); setPhase('result'); }}
                    disabled={loading}
                    className="btn-gold w-full flex items-center justify-center gap-2">
                    {loading ? 'Salvando...' : <><span>PROSSEGUIR</span><ChevronRightCircle size={16} /></>}
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col pt-10 pb-24 px-5 min-h-screen">
            <div className="mb-8">
                <p className="text-xs tracking-[0.3em] uppercase mb-1" style={{ color: 'var(--color-gold-dim)' }}>24 horas passaram</p>
                <h2 className="text-3xl font-black text-display" style={{ lineHeight: 1.1 }}>
                    Hora do<br /><span className="text-gradient-gold">Teste</span>
                </h2>
                <p className="text-sm mt-3" style={{ color: 'var(--color-text-sub)' }}>
                    Digite as {words.length} palavras que você memorizou. Erros leves de digitação são aceitos.
                </p>
            </div>

            <div className="space-y-3 mb-8">
                {words.map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                            style={{ background: 'rgba(212,168,83,0.1)', border: '1px solid rgba(212,168,83,0.2)', color: 'var(--color-gold)' }}>
                            {i + 1}
                        </div>
                        <input className="field" type="text" value={answers[i]}
                            onChange={e => { const a = [...answers]; a[i] = e.target.value; setAnswers(a); }}
                            placeholder={`Palavra ${i + 1}`} />
                    </div>
                ))}
            </div>

            <button onClick={handleSubmit} disabled={answers.every(a => !a.trim())} className="btn-gold w-full">
                VERIFICAR RESPOSTAS
            </button>
        </div>
    );
}

// ─── Result Phase ─────────────────────────────────────────────────────────────
function ResultPhase() {
    const { profile, setPhase, setSession, setUnlockAt, challengeHours } = useGameStore();
    const isWeekly = challengeHours === 168;

    const handleReset = () => {
        setSession(null);
        setUnlockAt(null);
        setPhase('viewing');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-5 pb-24">
            {/* Trophy icon */}
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="mb-6 flex items-center justify-center w-20 h-20 rounded-2xl"
                style={isWeekly ? {
                    background: 'rgba(168,85,247,0.14)',
                    border: '1px solid rgba(168,85,247,0.4)',
                    boxShadow: '0 0 30px rgba(168,85,247,0.2)'
                } : {
                    background: 'rgba(212,168,83,0.12)',
                    border: '1px solid rgba(212,168,83,0.3)'
                }}>
                {isWeekly
                    ? <span className="text-4xl">👑</span>
                    : <Star size={36} strokeWidth={1.2} style={{ color: 'var(--color-gold)' }} />}
            </motion.div>

            <h2 className="text-3xl font-black text-display text-center mb-2">
                {isWeekly ? 'Desafio Semanal' : 'Sessão'}{' '}
                <span style={isWeekly ? {
                    background: 'linear-gradient(90deg,#A855F7,#C084FC)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                } : {}} className={isWeekly ? '' : 'text-white'}>Concluído!</span>
            </h2>
            <p className="text-sm text-center mb-8" style={{ color: 'var(--color-text-sub)' }}>
                {isWeekly
                    ? 'Incrível! Você completou o desafio semanal de memória!'
                    : 'Seu hipocampo fixou as memórias. Volte amanhã para o próximo desafio.'}
            </p>

            {/* Stats panel */}
            <div className="panel p-6 w-full max-w-xs mb-8"
                style={isWeekly ? {
                    border: '1px solid rgba(168,85,247,0.4)',
                    boxShadow: '0 0 24px rgba(168,85,247,0.1)',
                    background: 'linear-gradient(135deg, rgba(88,28,135,0.18), rgba(124,58,237,0.08))'
                } : { border: '1px solid var(--color-border-glow)' }}>
                <div className="flex items-center justify-center gap-6">
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                            <Flame size={22} style={{ color: 'var(--color-fire)' }} />
                            <p className="text-4xl font-black" style={{ color: 'var(--color-fire)' }}>{profile?.streak ?? 0}</p>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>dias seguidos</p>
                    </div>
                    <div className="w-px h-12" style={{ background: 'var(--color-border)' }} />
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                            <img src={coinImg} className="w-6 h-6 object-contain" alt="" />
                            <p className="text-4xl font-black text-gradient-gold">{profile?.nous_coins ?? 0}</p>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Nous</p>
                    </div>
                </div>
            </div>

            {/* Continue */}
            <button onClick={handleReset}
                className={isWeekly
                    ? 'w-full max-w-xs flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm transition-all'
                    : 'btn-gold w-full max-w-xs flex items-center justify-center gap-2'}
                style={isWeekly ? {
                    background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                    color: '#fff',
                    boxShadow: '0 4px 20px rgba(168,85,247,0.4)'
                } : undefined}>
                CONTINUAR <ChevronRightCircle size={16} />
            </button>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
    const { user, phase, loadActiveSession } = useGameStore();
    useEffect(() => { if (user?.id) loadActiveSession(user.id); }, [user?.id, loadActiveSession]);

    return (
        <AnimatePresence mode="wait">
            <motion.div key={phase}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}>
                {(phase === 'viewing') && <ViewingPhase />}
                {phase === 'waiting' && <WaitingPhase />}
                {phase === 'recall' && <RecallPhase />}
                {phase === 'result' && <ResultPhase />}
            </motion.div>
        </AnimatePresence>
    );
}
