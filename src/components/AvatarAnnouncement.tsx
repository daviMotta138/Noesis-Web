import { createPortal } from 'react-dom';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Avatar2D, DEFAULT_AVATAR_CONFIG } from './Avatar2D';

interface AvatarAnnouncementProps {
    open: boolean;
    onCustomize: () => void;
    onDismiss: () => void;
}

export function AvatarAnnouncement({ open, onCustomize, onDismiss }: AvatarAnnouncementProps) {
    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[300] flex items-center justify-center px-5"
                    style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
                    onClick={onDismiss}>

                    <motion.div
                        initial={{ scale: 0.85, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.85, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                        className="w-full max-w-sm rounded-3xl overflow-hidden"
                        style={{
                            background: 'linear-gradient(145deg, #0d0d1a, #1a0a2e)',
                            border: '1px solid rgba(168,85,247,0.4)',
                            boxShadow: '0 0 60px rgba(168,85,247,0.2)',
                        }}
                        onClick={e => e.stopPropagation()}>

                        {/* Purple glow header */}
                        <div className="relative flex justify-center pt-8 pb-4"
                            style={{ background: 'linear-gradient(to bottom, rgba(168,85,247,0.18), transparent)' }}>
                            {/* Sparkle decorations */}
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                                className="absolute top-4 left-8 opacity-40">
                                <Sparkles size={18} style={{ color: '#A855F7' }} />
                            </motion.div>
                            <motion.div
                                animate={{ rotate: -360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                                className="absolute top-6 right-10 opacity-30">
                                <Sparkles size={14} style={{ color: '#C084FC' }} />
                            </motion.div>

                            {/* Silhouette avatar (black, gender not yet chosen) */}
                            <div className="relative">
                                <Avatar2D
                                    config={DEFAULT_AVATAR_CONFIG}
                                    mode="full"
                                    width={100}
                                    silhouette
                                />
                                {/* Glow beneath avatar */}
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full blur-xl opacity-60"
                                    style={{ background: '#A855F7' }} />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-6 pb-7">
                            <div className="text-center mb-5">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3 text-[10px] font-black uppercase tracking-wider"
                                    style={{ background: 'rgba(168,85,247,0.15)', color: '#C084FC', border: '1px solid rgba(168,85,247,0.3)' }}>
                                    <Sparkles size={10} />
                                    Novidade
                                </div>
                                <h2 className="text-2xl font-black text-white mb-2">
                                    Avatares personalizáveis!
                                </h2>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                                    Agora você pode criar seu personagem! Escolha suas roupas, calçados e mostre seu estilo para seus amigos.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <button
                                    onClick={onCustomize}
                                    className="w-full py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all"
                                    style={{
                                        background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                                        boxShadow: '0 4px 20px rgba(168,85,247,0.4)',
                                    }}>
                                    <Sparkles size={15} />
                                    Personalizar agora
                                </button>
                                <button
                                    onClick={onDismiss}
                                    className="w-full py-3 rounded-2xl text-sm font-bold transition-all"
                                    style={{ color: 'var(--color-text-muted)' }}>
                                    Mais tarde
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}

export default AvatarAnnouncement;
