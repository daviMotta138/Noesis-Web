import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Avatar2D, type AvatarConfig } from './Avatar2D';

interface ProfileAvatarDrawerProps {
    avatarConfig: AvatarConfig;
    onHoverChange: (isHovering: boolean) => void;
}

export function ProfileAvatarDrawer({ avatarConfig, onHoverChange }: ProfileAvatarDrawerProps) {
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = useState(false);

    const handleHoverStart = () => {
        setIsHovered(true);
        onHoverChange(true);
    };

    const handleHoverEnd = () => {
        setIsHovered(false);
        onHoverChange(false);
    };

    return (
        <motion.div
            className="fixed top-0 right-0 h-full z-50 flex items-center cursor-pointer pointer-events-auto"
            // Mobile tap handling vs Desktop hover
            onHoverStart={handleHoverStart}
            onHoverEnd={handleHoverEnd}
            onClick={() => navigate('/avatar')}
            initial={{ x: '90%' }}
            animate={{ x: isHovered ? 0 : '90%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ width: 'min(42vh, 450px)' }}
        >
            {/* Dark background glow (Idle weak light vs bright hover) */}
            <motion.div
                className="absolute inset-y-0 right-0 w-[150%] pointer-events-none"
                animate={{
                    background: isHovered
                        ? 'linear-gradient(90deg, transparent, rgba(168,85,247,0.3) 50%, rgba(168,85,247,0.5) 100%)'
                        : 'linear-gradient(90deg, transparent, rgba(168,85,247,0.05) 50%, rgba(168,85,247,0.15) 100%)'
                }}
            />

            {/* Firefly Particles */}
            <AnimatePresence>
                {isHovered && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {[...Array(12)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-1.5 h-1.5 bg-yellow-200 rounded-full"
                                style={{
                                    left: `${Math.random() * 80 + 10}%`,
                                    top: `${Math.random() * 100}%`,
                                    boxShadow: '0 0 10px 2px rgba(253, 224, 71, 0.6)'
                                }}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{
                                    opacity: [0, 1, 0],
                                    scale: [0, 1.5, 0],
                                    y: [0, -40 - Math.random() * 40]
                                }}
                                transition={{
                                    duration: 2 + Math.random() * 2,
                                    repeat: Infinity,
                                    delay: Math.random() * 2,
                                    ease: "easeInOut"
                                }}
                            />
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {/* "PERSONAGEM" Text Hook with Parallax */}
            <motion.div
                className="absolute top-1/2 -translate-y-1/2 origin-center -rotate-90 pointer-events-none select-none z-10 flex justify-center w-[90vh]"
                style={{
                    right: `107%`,
                    marginRight: '-45vh'
                }}
                animate={{
                    opacity: isHovered ? 0.8 : 0.4,
                    scale: isHovered ? 1.05 : 1,
                    x: 0,
                    y: isHovered ? -50 : 0 // Translate along local Y axis to move LEFT on screen
                }}
                transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            >
                <h2 className="font-black uppercase text-white whitespace-nowrap tracking-wider"
                    style={{
                        fontSize: `min(10vh, 75px)`,
                        textShadow: isHovered ? '0 0 30px rgba(255,255,255,0.4)' : 'none',
                        lineHeight: 1
                    }}>
                    Personagem
                </h2>
            </motion.div>

            {/* Actual Avatar */}
            <motion.div layoutId="hero-avatar" className="w-full h-full relative z-20 pointer-events-none drop-shadow-2xl flex items-end justify-end pl-12 md:pl-20 pb-0">
                <Avatar2D config={avatarConfig} mode="full" className="w-auto origin-bottom" style={{
                    height: `150%`,
                    transform: `translateY(68vh)`
                }} />
            </motion.div>

            {/* Overlay gradient to smooth bottom edge */}
            <div className="absolute bottom-0 right-0 w-full h-[20%] bg-gradient-to-t from-[var(--color-background)] to-transparent pointer-events-none z-30" />
        </motion.div>
    );
}
