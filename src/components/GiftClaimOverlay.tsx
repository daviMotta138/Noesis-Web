import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/useGameStore';
import { audio } from '../lib/audio';
import shieldImg from '../assets/shield.png';

export const GiftClaimOverlay = () => {
    const { user, fetchProfile, pendingGift, checkPendingGifts } = useGameStore();
    const [claiming, setClaiming] = useState(false);
    const [claimed, setClaimed] = useState(false);

    useEffect(() => {
        if (user?.id) {
            checkPendingGifts();
        }
    }, [user?.id, checkPendingGifts]);

    // Reset local state when a DIFFERENT gift is set
    useEffect(() => {
        setClaimed(false);
        setClaiming(false);
    }, [pendingGift?.id]);

    const handleClaim = async () => {
        if (!pendingGift || claiming) return;
        setClaiming(true);
        audio.play('click');

        try {
            await supabase.from('notifications')
                .update({ claimed: true, read_at: new Date().toISOString() })
                .eq('id', pendingGift.id);

            setClaimed(true);
            audio.play('success');

            setTimeout(() => {
                setClaimed(false);
                setClaiming(false);
                if (user?.id) fetchProfile(user.id);
                // The store needs to check for the next gift in queue
                checkPendingGifts();
            }, 3000);

        } catch (err) {
            console.error('Error claiming gift:', err);
            setClaiming(false);
        }
    };

    if (!pendingGift) return null;

    const metadata = pendingGift.metadata || {};

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#0D0F1C]/80 backdrop-blur-md"
            >
                <motion.div
                    initial={{ scale: 0.8, y: 50, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.8, y: 50, opacity: 0 }}
                    className="w-full max-w-sm relative"
                >
                    {/* Background Glow */}
                    <div className="absolute inset-0 bg-amber-500/20 blur-[100px] rounded-full" />

                    <div className="relative panel-gold overflow-hidden rounded-[2.5rem] p-8 text-center flex flex-col items-center">
                        {/* Animated Icons */}
                        <div className="relative mb-8 mt-4">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-[-40px] border-2 border-dashed border-amber-500/30 rounded-full"
                            />
                            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-7xl shadow-[0_0_50px_rgba(251,191,36,0.5)] transform -rotate-3 overflow-hidden">
                                {metadata.category === 'shield' ? (
                                    <img src={shieldImg} className="w-20 h-20 object-contain" alt="" />
                                ) : (
                                    metadata.emoji || '🎁'
                                )}
                            </div>
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute -top-4 -right-4 text-amber-300"
                            >
                                <Sparkles size={32} />
                            </motion.div>
                        </div>

                        <h2 className="text-3xl font-black text-display text-gradient-gold uppercase italic tracking-tighter mb-2">
                            {claimed ? 'RESGATADO!' : 'PRESENTE!!'}
                        </h2>

                        <p className="text-sm font-bold text-gray-300 mb-8 max-w-[240px] leading-relaxed">
                            {claimed
                                ? `O item ${metadata.name} já está no seu inventário.`
                                : <span><b>{metadata.sender_name || 'Alguém'}</b> te enviou um presente especial: <b>{metadata.name}</b></span>
                            }
                        </p>

                        {!claimed ? (
                            <button
                                onClick={handleClaim}
                                disabled={claiming}
                                className="w-full group relative overflow-hidden h-16 rounded-2xl bg-amber-500 text-black font-black uppercase italic tracking-widest text-lg shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all active:scale-95 disabled:opacity-50"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                                <span className="flex items-center justify-center gap-3">
                                    {claiming ? <Loader2 className="animate-spin" /> : <>RESGATAR <ChevronRight size={24} /></>}
                                </span>
                            </button>
                        ) : (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="text-amber-400 flex flex-col items-center gap-2"
                            >
                                <CheckCircle2 size={48} />
                                <span className="font-black text-xs uppercase tracking-widest">Aproveite seu item!</span>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
