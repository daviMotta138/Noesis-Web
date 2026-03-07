import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Avatar2D, type AvatarConfig } from './Avatar2D';

interface FullBodyAvatarModalProps {
    open: boolean;
    onClose: () => void;
    avatarConfig?: Partial<AvatarConfig> | null;
    displayName: string;
}

export function FullBodyAvatarModal({
    open,
    onClose,
    avatarConfig,
    displayName,
}: FullBodyAvatarModalProps) {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[300] flex items-center justify-center px-6"
                    style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(14px)' }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.85, opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        className="relative flex flex-col items-center"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute -top-4 -right-4 w-9 h-9 rounded-full flex items-center justify-center z-10 hover:scale-110 transition-transform"
                            style={{ background: 'var(--color-glass)', border: '1px solid var(--color-border)' }}
                        >
                            <X size={16} style={{ color: 'var(--color-text-muted)' }} />
                        </button>

                        {/* Full avatar */}
                        <div className="relative flex flex-col items-center justify-center pointer-events-none">
                            <Avatar2D config={avatarConfig || {}} mode="full" className="h-[65vh] max-h-[700px] w-auto" />
                            <div
                                className="absolute bottom-2 left-1/2 -translate-x-1/2 w-48 h-10 rounded-full blur-xl opacity-40"
                                style={{ background: '#A855F7' }}
                            />
                        </div>

                        <p className="mt-6 text-xl font-black text-white drop-shadow-lg">
                            {displayName}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                            Toque fora para fechar
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
