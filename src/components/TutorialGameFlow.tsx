import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Flame, Star, ChevronRightCircle } from 'lucide-react';
import { MemoryCard } from './MemoryCard';
import { useGameStore } from '../store/useGameStore';
import { audio } from '../lib/audio';
import coinImg from '../assets/coin.webp';

const TUTORIAL_WORDS = ['CACHORRO', 'PLANETA', 'GUITARRA'];

export function TutorialGameFlow() {
    const { markTutorialSeen } = useGameStore();
    const [phase, setPhase] = useState<'intro' | 'viewing' | 'fast_forward' | 'recall' | 'result'>('intro');
    const [flipped, setFlipped] = useState(false);
    const [answers, setAnswers] = useState(['', '', '']);
    const [timeLeft, setTimeLeft] = useState(3 * 60 * 60);

    const handleFlip = () => {
        audio.play('flip');
        setFlipped(true);
        setTimeout(() => setPhase('fast_forward'), 2000);
    };

    useEffect(() => {
        if (phase === 'fast_forward') {
            const interval = setInterval(() => {
                setTimeLeft(prev => {
                    const step = 450;
                    if (prev - step <= 0) {
                        clearInterval(interval);
                        setTimeout(() => setPhase('recall'), 500);
                        return 0;
                    }
                    return prev - step;
                });
            }, 30);
            return () => clearInterval(interval);
        }
    }, [phase]);

    const handleCheck = () => {
        audio.play('success');
        setPhase('result');
    };

    const handleFinish = () => {
        markTutorialSeen('game_flow_seen');
    };

    return (
        <div className="flex flex-col min-h-screen pb-24 pt-10 px-5 max-w-lg mx-auto w-full">

            <div className="mb-8 text-center mt-4">
                <p className="text-xs tracking-[0.3em] uppercase mb-1" style={{ color: 'var(--color-gold-dim)' }}>Tutorial Prático</p>
                <h1 className="text-3xl font-black text-display text-gradient-gold" style={{ lineHeight: 1.1 }}>
                    Sua Primeira<br />Sessão
                </h1>
            </div>

            <AnimatePresence mode="wait">
                {phase === 'intro' && (
                    <motion.div key="intro" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6 flex-1 flex flex-col justify-center pb-20">
                        <div className="panel p-6 text-center space-y-4" style={{ border: '1px solid var(--color-border-glow)' }}>
                            <div className="text-4xl mb-4">🧠</div>
                            <h2 className="text-xl font-black text-white">Como Funciona?</h2>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-sub)' }}>
                                O Noesis é focado em <strong>Repetição Espaçada</strong>.
                                Você memoriza algumas palavras, o tempo passa e depois você tenta lembrá-las.
                            </p>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-sub)' }}>
                                Vamos fazer uma simulação rápida para você entender na prática!
                            </p>
                        </div>
                        <button onClick={() => setPhase('viewing')} className="btn-gold w-full flex justify-center items-center gap-2 py-4">
                            VAMOS LÁ <ChevronRight size={18} />
                        </button>
                    </motion.div>
                )}

                {phase === 'viewing' && (
                    <motion.div key="viewing" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 flex-1">
                        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-2xl p-5 text-sm">
                            <h3 className="font-bold text-indigo-400 mb-2 flex items-center gap-2">
                                <span>1️⃣</span> Memorização
                            </h3>
                            <p style={{ color: 'var(--color-text-sub)' }}>
                                Crie uma imagem mental absurda envolvendo um <strong>CACHORRO</strong> em um <strong>PLANETA</strong> tocando <strong>GUITARRA</strong>.
                                <br /><br />Quando achar que fixou na memória, vire as cartas.
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {TUTORIAL_WORDS.map((w, i) => (
                                <MemoryCard key={i} word={w} isHidden={flipped} />
                            ))}
                        </div>

                        <button onClick={handleFlip} disabled={flipped} className="btn-gold w-full flex justify-center items-center gap-2 py-4 mt-6">
                            VIRAR CARTAS <ChevronRight size={18} />
                        </button>
                    </motion.div>
                )}

                {phase === 'fast_forward' && (
                    <motion.div key="fast_forward" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20 space-y-8 flex-1">
                        <div className="text-center">
                            <h2 className="text-2xl font-black mb-3 text-gradient-gold">O tempo passa...</h2>
                            <p className="text-sm max-w-xs mx-auto" style={{ color: 'var(--color-text-sub)' }}>
                                Na vida real, você fecharia o app e voltaria depois das horas escolhidas.
                            </p>
                        </div>

                        <div className="panel p-8 w-full flex justify-center" style={{ border: '1px solid var(--color-border-glow)' }}>
                            <div className="text-5xl font-mono font-black tabular-nums tracking-tight animate-pulse text-white drop-shadow-lg">
                                {String(Math.floor(timeLeft / 3600)).padStart(2, '0')}:
                                {String(Math.floor((timeLeft % 3600) / 60)).padStart(2, '0')}:
                                {String(timeLeft % 60).padStart(2, '0')}
                            </div>
                        </div>
                    </motion.div>
                )}

                {phase === 'recall' && (
                    <motion.div key="recall" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ x: -20, opacity: 0 }} className="space-y-6 flex-1">
                        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-5 text-sm">
                            <h3 className="font-bold text-emerald-400 mb-2 flex items-center gap-2">
                                <span>2️⃣</span> Resgate Ativo
                            </h3>
                            <p style={{ color: 'var(--color-text-sub)' }}>
                                O tempo acabou! Tente lembrar da historinha absurda e preencha as 3 palavras que você memorizou há pouco.
                            </p>
                        </div>

                        <div className="space-y-3 panel p-5">
                            {TUTORIAL_WORDS.map((_, i) => (
                                <div key={i} className="flex gap-4 items-center">
                                    <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl font-black text-sm" style={{ background: 'var(--color-glass)', border: '1px solid var(--color-border)', color: 'var(--color-gold)' }}>
                                        {i + 1}
                                    </div>
                                    <input
                                        className="field flex-1 px-4 py-3"
                                        placeholder={`Palavra ${i + 1}`}
                                        value={answers[i]}
                                        onChange={e => {
                                            const a = [...answers];
                                            a[i] = e.target.value.toUpperCase();
                                            setAnswers(a);
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        <button onClick={handleCheck} disabled={answers.some(a => !a.trim())} className="btn-gold w-full text-sm py-4 tracking-wider mt-4">
                            VERIFICAR RESPOSTAS
                        </button>
                    </motion.div>
                )}

                {phase === 'result' && (
                    <motion.div key="result" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-6 text-center py-10 flex-1 flex flex-col justify-center">
                        <div className="flex justify-center mb-6">
                            <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(212,168,83,0.3)]" style={{ background: 'linear-gradient(135deg, rgba(212,168,83,0.2), rgba(212,168,83,0.05))', border: '1px solid rgba(212,168,83,0.4)' }}>
                                <Star size={48} className="text-amber-400" />
                            </div>
                        </div>
                        <h2 className="text-4xl font-black text-display">Perfeito!</h2>
                        <p className="text-sm max-w-sm mx-auto mt-4" style={{ color: 'var(--color-text-sub)' }}>
                            Ao resgatar memórias no momento certo, você cria conexões fortes no cérebro. Ganhe Nous e suba de liga!
                        </p>

                        <div className="flex justify-center gap-3 mt-8 mb-10">
                            <div className="badge-gold flex items-center gap-2 py-2 px-4 shadow-lg">
                                <img src={coinImg} className="w-4 h-4 object-contain" alt="" />
                                +15 Nous
                            </div>
                            <div className="badge-fire flex items-center gap-2 py-2 px-4 shadow-lg">
                                <Flame size={14} />+1 seq.
                            </div>
                        </div>

                        <button onClick={handleFinish} className="btn-gold w-full py-5 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,168,83,0.4)]">
                            <span className="tracking-wider">COMEÇAR A JOGAR</span> <ChevronRightCircle size={18} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
