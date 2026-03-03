import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, CheckCircle2, XCircle, ChevronRight, Flame, Star, ChevronRightCircle, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, TIME_OPTIONS } from '../store/useGameStore';
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
    const { profile, wordCount, setWordCount, selectedTimeOption, setSelectedTimeOption, session, startSession } = useGameStore();
    const navigate = useNavigate();
    const [words, setWords] = useState<string[]>(() => drawWords(wordCount));
    const [flipped, setFlipped] = useState(false); // ALL cards flipped at once
    const [loading, setLoading] = useState(false);
    const [banners, setBanners] = useState<any[]>([]);
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
    const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);

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

    // Click outside handler for dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.time-dropdown-container')) {
                setTimeDropdownOpen(false);
            }
        };

        if (timeDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [timeDropdownOpen]);

    // If there's already an active session, restore it
    useEffect(() => {
        if (session?.words) { setWords(session.words); setFlipped(true); }
    }, [session]);

    const handleFlip = async () => {
        if (flipped || loading) return;
        audio.play('flip');
        setFlipped(true);
        setLoading(true);
        try {
            await startSession(words, selectedTimeOption);
        } catch (error) {
            console.error('Error starting session:', error);
            alert(error instanceof Error ? error.message : 'Erro ao iniciar sessão');
            setFlipped(false);
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col min-h-screen pb-24">
            {/* Header */}
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

            {/* Fortnite-style Banners Carousel */}
            {banners.length > 0 && !flipped && (
                <div className="mb-6 px-5 relative z-10 w-full max-w-sm mx-auto sm:max-w-none">
                    <div className="relative w-full aspect-[21/9] sm:aspect-[16/9] overflow-hidden rounded-2xl border border-[var(--color-glass-strong)] shadow-lg"
                        style={{ background: 'var(--color-card)' }}>
                        <AnimatePresence mode="popLayout">
                            <motion.div
                                key={currentBannerIndex}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                                className="absolute inset-0 cursor-pointer"
                                onClick={() => {
                                    if (banners[currentBannerIndex].link_url) {
                                        window.open(banners[currentBannerIndex].link_url, '_blank');
                                    }
                                }}
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

                        {/* Dots pagination */}
                        {banners.length > 1 && (
                            <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5 z-20">
                                {banners.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentBannerIndex(i)}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${i === currentBannerIndex ? 'w-5 bg-white shadow-[0_0_5px_rgba(255,255,255,0.5)]' : 'w-1.5 bg-white/40 hover:bg-white/70'}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Word count selector — locked after flip */}
            <div className="px-5 mb-5">
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
                        // Locked state
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

            {/* Time selection — locked after flip */}
            <div className="px-5 mb-5">
                <div className="panel p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                                Tempo de espera
                            </p>
                            {flipped && <Lock size={12} style={{ color: 'var(--color-gold-dim)' }} />}
                        </div>
                        <div className="flex items-center gap-1">
                            <img src={coinImg} className="w-3 h-3 object-contain" alt="" />
                            <span className="text-sm font-black text-gradient-gold">{selectedTimeOption.nousReward}</span>
                        </div>
                    </div>

                    {flipped ? (
                        // Locked state
                        <div className="rounded-xl p-2.5 text-xs" style={{ background: 'rgba(212,168,83,0.07)', border: '1px solid rgba(212,168,83,0.15)', color: 'var(--color-gold-dim)' }}>
                            🔒 Tempo fixo até o resultado. {selectedTimeOption.label} selecionado.
                        </div>
                    ) : (
                        // Dropdown menu
                        <div className="relative time-dropdown-container">
                            <button
                                onClick={() => setTimeDropdownOpen(!timeDropdownOpen)}
                                className="w-full px-3 py-2 rounded-xl text-xs font-black transition-all duration-150 flex items-center justify-between"
                                style={{
                                    background: 'var(--color-glass)',
                                    color: 'var(--color-text)',
                                    border: '1px solid var(--color-border)',
                                }}>
                                <div className="flex items-center gap-2">
                                    <span>{selectedTimeOption.label}</span>
                                    {selectedTimeOption.isMonthlyChallenge && (
                                        <span className="px-1.5 py-0.5 rounded text-xs font-bold"
                                            style={{ 
                                                background: 'var(--color-success)', 
                                                color: 'white' 
                                            }}>
                                            DESAFIO
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <img src={coinImg} className="w-3 h-3 object-contain" alt="" />
                                    <span>{selectedTimeOption.nousReward}</span>
                                    <ChevronDown size={14} style={{ 
                                        transition: 'transform 0.2s',
                                        transform: timeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                                    }} />
                                </div>
                            </button>

                            <AnimatePresence>
                                {timeDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.15 }}
                                        style={{ 
                                            background: '#1a1a2e', 
                                            border: '1px solid var(--color-border)', 
                                            borderRadius: '0.75rem',
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                            overflow: 'hidden'
                                        }}>
                                        <div className="max-h-48 overflow-y-auto">
                                            {TIME_OPTIONS.map((option) => {
                                                const isMonthlyChallengeUsed = profile?.challenge_month_used === new Date().toISOString().slice(0, 7);
                                                const isDisabled = option.isMonthlyChallenge && isMonthlyChallengeUsed;
                                                const isSelected = selectedTimeOption.hours === option.hours;
                                                
                                                return (
                                                    <button
                                                        key={option.hours}
                                                        onClick={() => {
                                                            if (!isDisabled) {
                                                                setSelectedTimeOption(option);
                                                                setTimeDropdownOpen(false);
                                                            }
                                                        }}
                                                        disabled={isDisabled}
                                                        className="w-full px-3 py-2 text-xs font-black transition-all duration-150 flex items-center justify-between border-b last:border-b-0"
                                                        style={{
                                                            background: isSelected 
                                                                ? '#d4a833' 
                                                                : '#0f0f23',
                                                            color: isSelected 
                                                                ? '#0D0F1C' 
                                                                : isDisabled 
                                                                ? 'var(--color-text-muted)' 
                                                                : 'var(--color-text)',
                                                            opacity: isDisabled ? 0.5 : 1,
                                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                        }}>
                                                        <div className="flex items-center gap-2">
                                                            <span>{option.label}</span>
                                                            {option.isMonthlyChallenge && (
                                                                <span className="px-1.5 py-0.5 rounded text-xs font-bold"
                                                                    style={{ 
                                                                        background: isDisabled ? 'var(--color-danger)' : 'var(--color-success)', 
                                                                        color: 'white' 
                                                                    }}>
                                                                    {isDisabled ? 'USADO' : 'DESAFIO'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <img src={coinImg} className="w-3 h-3 object-contain" alt="" />
                                                            <span>{option.nousReward}</span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* Palace tip */}
            {!flipped && (
                <div className="px-5 mb-5">
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
                </div>
            )}

            {/* Cards grid */}
            <div className="px-5 mb-6">
                <div className="grid grid-cols-3 gap-3 justify-items-center">
                    {words.map((word, i) => (
                        <motion.div key={`${word}-${i}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}>
                            <MemoryCard word={word} isHidden={flipped} />
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* CTA: Virar Cartas */}
            <div className="px-5">
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

            {/* Timer visible after flip — cards stay visible above */}
            {flipped && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="px-5 mt-5 flex flex-col items-center">
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
    );
}

// ─── Waiting Phase ─────────────────────────────────────────────────────────────
function WaitingPhase() {
    const { session, unlockAt, setPhase } = useGameStore();
    useEffect(() => {
        if (!unlockAt) return;
        const id = setInterval(() => { if (Date.now() >= unlockAt) setPhase('recall'); }, 5000);
        return () => clearInterval(id);
    }, [unlockAt, setPhase]);

    return (
        <div className="flex flex-col min-h-screen pb-24 pt-10 px-5">
            <div className="mb-8">
                <p className="text-xs tracking-[0.3em] uppercase mb-1" style={{ color: 'var(--color-gold-dim)' }}>Status</p>
                <h2 className="text-3xl font-black text-display" style={{ lineHeight: 1.1 }}>
                    Consolidando<br /><span className="text-gradient-gold">Memória</span>
                </h2>
                <p className="text-sm mt-3" style={{ color: 'var(--color-text-sub)' }}>
                    Seu hipocampo está fixando as palavras. Aguarde o período de consolidação.
                </p>
            </div>

            <div className="panel p-6 mb-5 flex flex-col items-center"
                style={{ border: '1px solid var(--color-border-glow)' }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: 'var(--color-text-muted)' }}>
                    Liberação em
                </p>
                <Timer
                    targetTimestamp={unlockAt ?? Date.now() + 86400000}
                    onFinish={() => setPhase('recall')}
                    size={200}
                />
            </div>

            {session && (
                <div className="panel p-4 mb-4">
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
                style={{ background: 'var(--color-gold-soft)', border: '1px solid rgba(212,168,83,0.2)' }}>
                <p className="text-xs font-bold mb-2 text-gold">Enquanto espera:</p>
                <ul className="text-xs space-y-1" style={{ color: 'var(--color-text-sub)' }}>
                    <li>• Explore a loja e personalize seu avatar</li>
                    <li>• Veja o ranking e desafie amigos</li>
                    <li>• Durma bem — o sono consolida a memória profunda</li>
                </ul>
            </div>
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
        // Get the reward from session or fallback to 15 for backward compatibility
        const nous = correct === words.length ? (session?.nous_reward ?? 15) : 0;

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
    const { profile, setPhase, setSession, setUnlockAt } = useGameStore();

    const handleReset = () => {
        setSession(null);
        setUnlockAt(null);
        setPhase('viewing');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-5 pb-24">
            {/* Trophy icon */}
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="mb-6 flex items-center justify-center w-20 h-20 rounded"
                style={{ background: 'rgba(212,168,83,0.12)', border: '1px solid rgba(212,168,83,0.3)' }}>
                <Star size={36} strokeWidth={1.2} style={{ color: 'var(--color-gold)' }} />
            </motion.div>

            <h2 className="text-3xl font-black text-display text-center mb-2">Sessão Concluída!</h2>
            <p className="text-sm text-center mb-8" style={{ color: 'var(--color-text-sub)' }}>
                Seu hipocampo fixou as memórias. Volte amanhã para o próximo desafio.
            </p>

            {/* Stats panel */}
            <div className="panel p-6 w-full max-w-xs mb-8" style={{ border: '1px solid var(--color-border-glow)' }}>
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

            {/* Continue — available to all users */}
            <button onClick={handleReset} className="btn-gold w-full max-w-xs flex items-center justify-center gap-2">
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
