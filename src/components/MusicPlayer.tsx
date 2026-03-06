import { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { motion } from 'framer-motion';
import { ensureMusicInit, next, prev, syncPlayPause, getCurrentMeta } from '../lib/musicService';

// ── MusicPlayer (logic bridge — thin React shell) ────────────────────────────
// All audio state lives in musicService.ts (module scope).
// This component only triggers init and syncs play/pause to the store.
export const MusicPlayer = () => {
    const { musicEnabled } = useGameStore();

    // Ensure the playlist is fetched — safe to call on every mount
    useEffect(() => {
        ensureMusicInit();
    }, []);

    // Sync play/pause whenever the store value changes
    useEffect(() => {
        syncPlayPause(musicEnabled);
    }, [musicEnabled]);

    return null;
};

// ── MusicPlayerUI (visual widget) ────────────────────────────────────────────
export const MusicPlayerUI = ({ className = '', fullWidth = false }: { className?: string, fullWidth?: boolean }) => {
    const { musicEnabled, setMusicEnabled } = useGameStore();
    const [trackName, setTrackName] = useState('Carregando...');
    const [artist, setArtist] = useState('Noesis Radio');
    const [thumb, setThumb] = useState('/logo-noesis.png');

    useEffect(() => {
        const handleMeta = (e: Event) => {
            const d = (e as CustomEvent).detail;
            if (d.title) setTrackName(d.title);
            if (d.artist) setArtist(d.artist);
            if (d.thumb) setThumb(d.thumb);
        };
        window.addEventListener('audio-meta', handleMeta);

        // Sync on mount from whichever track is currently loaded
        const meta = getCurrentMeta();
        if (meta) {
            setTrackName(meta.title || 'Noesis Music');
            setArtist(meta.artist || 'Noesis');
            setThumb(meta.thumb || '/logo-noesis.png');
        }

        return () => window.removeEventListener('audio-meta', handleMeta);
    }, []);

    const handleNext = (e: React.MouseEvent) => { e.stopPropagation(); next(); };
    const handlePrev = (e: React.MouseEvent) => { e.stopPropagation(); prev(); };
    const togglePlay = (e: React.MouseEvent) => { e.stopPropagation(); setMusicEnabled(!musicEnabled); };

    return (
        <div className={className}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center rounded-[20px] overflow-hidden shadow-2xl ${fullWidth ? 'w-full' : 'w-[280px]'}`}
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-glow)', height: 64 }}
            >
                {/* Album Art */}
                <div className="w-16 h-16 bg-black flex-shrink-0 relative">
                    <img src={thumb} alt="Album Art" className="w-full h-full object-cover opacity-80" />
                    <div className="absolute right-0 inset-y-0 w-px" style={{ background: 'var(--color-border)' }} />
                </div>

                {/* Track Info */}
                <div className="flex-1 px-3 py-1 flex flex-col justify-center min-w-0">
                    <p className="text-xs font-bold leading-tight truncate" style={{ color: 'var(--color-text)' }}>{trackName}</p>
                    <p className="text-[10px] font-medium truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{artist}</p>
                </div>

                {/* Controls */}
                <div className="flex items-center pr-3 gap-1">
                    <button onClick={handlePrev} className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: 'var(--color-text-muted)' }}>
                        <SkipBack size={16} fill="currentColor" />
                    </button>
                    <button onClick={togglePlay}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow"
                        style={{ background: 'var(--color-gold)', color: '#000' }}>
                        {musicEnabled ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-1" />}
                    </button>
                    <button onClick={handleNext} className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: 'var(--color-text-muted)' }}>
                        <SkipForward size={16} fill="currentColor" />
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
