// src/components/SplashLoader.tsx
// Animated app boot screen — shown while auth session + profile are loading
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logoImg from '../assets/logo-noesis.png';

interface SplashLoaderProps {
    onFinish: () => void;
    isReady: boolean; // true = auth+profile loaded
}

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 3,
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 4,
}));

export default function SplashLoader({ onFinish, isReady }: SplashLoaderProps) {
    const [phase, setPhase] = useState<'loading' | 'ready' | 'exiting'>('loading');
    const [progress, setProgress] = useState(0);
    const minShownRef = useRef(false);

    // Animated progress bar — runs independently of actual loading
    useEffect(() => {
        let raf: number;
        let start: number;
        const totalMs = 1800;

        const tick = (ts: number) => {
            if (!start) start = ts;
            const elapsed = ts - start;
            const p = Math.min(95, (elapsed / totalMs) * 95); // cap at 95% until ready
            setProgress(p);
            if (elapsed < totalMs) raf = requestAnimationFrame(tick);
            else minShownRef.current = true;
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, []);

    // When data is ready AND minimum time has elapsed → complete
    useEffect(() => {
        if (!isReady) return;
        const finish = () => {
            setProgress(100);
            setTimeout(() => setPhase('exiting'), 300);
            setTimeout(() => onFinish(), 700);
        };
        if (minShownRef.current) {
            finish();
        } else {
            // Wait for bar to reach 95% first
            const id = setInterval(() => {
                if (minShownRef.current) {
                    clearInterval(id);
                    finish();
                }
            }, 50);
            return () => clearInterval(id);
        }
    }, [isReady, onFinish]);

    return (
        <AnimatePresence>
            {phase !== 'exiting' && (
                <motion.div
                    key="splash"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
                    style={{ background: '#07080F' }}
                >
                    {/* Particles */}
                    {PARTICLES.map(p => (
                        <motion.div
                            key={p.id}
                            className="absolute rounded-full pointer-events-none"
                            style={{
                                left: `${p.x}%`,
                                top: `${p.y}%`,
                                width: p.size,
                                height: p.size,
                                background: p.id % 3 === 0 ? '#D4A853' : p.id % 3 === 1 ? '#A855F7' : '#3B82F6',
                                opacity: 0.4,
                            }}
                            animate={{
                                y: [0, -20, 0],
                                opacity: [0.2, 0.6, 0.2],
                            }}
                            transition={{
                                duration: p.duration,
                                delay: p.delay,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                        />
                    ))}

                    {/* Glow rings */}
                    <motion.div
                        className="absolute w-80 h-80 rounded-full pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)' }}
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    />

                    {/* Logo */}
                    <motion.div
                        initial={{ scale: 0.7, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
                        className="relative z-10 flex flex-col items-center"
                    >
                        <motion.img
                            src={logoImg}
                            alt="Noesis"
                            className="w-32 h-32 object-contain mb-6"
                            animate={{ filter: ['drop-shadow(0 0 8px rgba(212,168,83,0.3))', 'drop-shadow(0 0 20px rgba(212,168,83,0.6))', 'drop-shadow(0 0 8px rgba(212,168,83,0.3))'] }}
                            transition={{ duration: 2.5, repeat: Infinity }}
                        />
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-3xl font-black tracking-[0.15em] mb-1"
                            style={{ color: '#D4A853', fontFamily: 'var(--font-display, sans-serif)' }}
                        >
                            NOESIS
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 }}
                            className="text-[10px] tracking-[0.4em] font-medium mb-8"
                            style={{ color: 'rgba(212,168,83,0.5)' }}
                        >
                            PALÁCIO DA MEMÓRIA
                        </motion.p>

                        {/* Progress bar */}
                        <div
                            className="w-48 h-0.5 rounded-full overflow-hidden"
                            style={{ background: 'rgba(255,255,255,0.06)' }}
                        >
                            <motion.div
                                className="h-full rounded-full"
                                style={{
                                    background: 'linear-gradient(90deg, #D4A853, #A855F7)',
                                    width: `${progress}%`,
                                }}
                                transition={{ duration: 0.15 }}
                            />
                        </div>
                    </motion.div>

                    {/* Footer */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 }}
                        transition={{ delay: 1 }}
                        className="absolute bottom-10 text-[9px] tracking-widest"
                        style={{ color: '#fff' }}
                    >
                        Carregando...
                    </motion.p>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
