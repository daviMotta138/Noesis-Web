import { useMemo, useEffect, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

export const StarBackground = ({ interactive = false }: { interactive?: boolean }) => {
    const [isWarping, setIsWarping] = useState(false);

    useEffect(() => {
        const handleWarp = () => {
            setIsWarping(true);
            setTimeout(() => setIsWarping(false), 2000);
        };
        window.addEventListener('warp-speed', handleWarp);
        return () => window.removeEventListener('warp-speed', handleWarp);
    }, []);

    const stars = useMemo(() =>
        [...Array(65)].map((_, i) => {
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const angle = Math.atan2(y - 50, x - 50);
            return {
                id: i,
                x,
                y,
                size: Math.random() > 0.85 ? 3.5 : Math.random() > 0.6 ? 2 : 1,
                baseOpacity: Math.random() * 0.3 + 0.05,
                mx: (Math.random() - 0.5) * 8,
                my: (Math.random() - 0.5) * 8,
                duration: 80 + Math.random() * 60,
                angle,
            };
        })
        , []);

    const mouseX = useSpring(0, { stiffness: 40, damping: 25 });
    const mouseY = useSpring(0, { stiffness: 40, damping: 25 });

    useEffect(() => {
        if (!interactive) return;

        let returnTimeout: ReturnType<typeof setTimeout>;

        const handleMouseMove = (e: MouseEvent) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 20;
            mouseX.set(x);
            mouseY.set(y);
        };

        const handleKeyDown = () => {
            clearTimeout(returnTimeout);
            const currentX = mouseX.get();
            const currentY = mouseY.get();
            mouseX.set(currentX + (Math.random() > 0.5 ? 5 : -5));
            mouseY.set(currentY + (Math.random() > 0.5 ? 5 : -5));

            returnTimeout = setTimeout(() => {
                mouseX.set(0);
                mouseY.set(0);
            }, 1000);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [interactive, mouseX, mouseY]);

    const warpOpacity = useSpring(1, { stiffness: 100, damping: 5 });

    useEffect(() => {
        if (isWarping) {
            const interval = setInterval(() => {
                warpOpacity.set(Math.random() * 0.5 + 0.5);
            }, 50);
            return () => {
                clearInterval(interval);
                warpOpacity.set(1);
            }
        }
    }, [isWarping, warpOpacity]);

    return (
        <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top, var(--color-deep) 0%, var(--color-void) 60%)', overflow: 'hidden' }}>
            <motion.div
                className="w-full h-full relative"
                animate={isWarping ? { scale: [1, 2, 4], opacity: [1, 1, 0] } : { scale: 1, opacity: 1 }}
                transition={isWarping ? { duration: 1.5, ease: 'easeIn', times: [0, 0.6, 1] } : { duration: 2, ease: 'easeOut' }}
            >
                {stars.map((star) => {
                    return (
                        <motion.div
                            key={`star-${star.id}`}
                            animate={{
                                x: ['0vw', `${star.mx}vw`, '0vw'],
                                y: ['0vh', `${star.my}vh`, '0vh']
                            }}
                            transition={{
                                duration: star.duration,
                                repeat: Infinity,
                                ease: 'linear'
                            }}
                            style={{
                                position: 'absolute',
                                left: `${star.x}%`,
                                top: `${star.y}%`,
                                opacity: isWarping ? warpOpacity : star.baseOpacity,
                                willChange: 'transform',
                                translateX: interactive && !isWarping ? mouseX : 0,
                                translateY: interactive && !isWarping ? mouseY : 0
                            }}
                        >
                            <div
                                style={{
                                    width: star.size,
                                    height: star.size,
                                    borderRadius: '50%',
                                    background: 'var(--color-text)',
                                    boxShadow: star.size > 2.5
                                        ? `0 0 ${star.size * 4}px var(--color-gold)`
                                        : star.size > 1.5 ? '0 0 4px var(--color-glass-strong)' : 'none',
                                }}
                            />
                        </motion.div>
                    );
                })}
            </motion.div>
        </div>
    );
};
