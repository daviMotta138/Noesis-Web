import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

// ── Singleton audio element & playlist ───────────────────────────────────────
let CURRENT_PLAYLIST: any[] = [];
let GLOBAL_IDX = 0; // tracks current index globally

function getAudio(): HTMLAudioElement {
    let el = document.getElementById('noesis-native-audio') as HTMLAudioElement;
    if (!el) {
        el = document.createElement('audio');
        el.id = 'noesis-native-audio';
        el.volume = 0.25;
        document.body.appendChild(el);
    }
    return el;
}

function shuffleArray(array: any[]) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ── Absolute URL helper for MediaSession artwork ──────────────────────────────
function absoluteUrl(url: string): string {
    if (!url) return `${window.location.origin}/logo-noesis.png`;
    if (url.startsWith('http')) return url;
    return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

// ── Apply MediaSession metadata + playback state ──────────────────────────────
function applyMediaSession(track: any, playing: boolean, onNext: () => void, onPrev: () => void) {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || 'Noesis Music',
        artist: track.artist || 'Noesis',
        album: 'Palácio da Memória',
        artwork: [
            { src: absoluteUrl(track.thumb), sizes: '512x512', type: 'image/png' },
            { src: absoluteUrl(track.thumb), sizes: '256x256', type: 'image/png' },
        ],
    });

    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';

    const audio = getAudio();
    navigator.mediaSession.setActionHandler('play', () => {
        audio.play().catch(() => { });
        useGameStore.getState().setMusicEnabled(true);
        navigator.mediaSession.playbackState = 'playing';
    });
    navigator.mediaSession.setActionHandler('pause', () => {
        audio.pause();
        useGameStore.getState().setMusicEnabled(false);
        navigator.mediaSession.playbackState = 'paused';
    });
    navigator.mediaSession.setActionHandler('nexttrack', onNext);
    navigator.mediaSession.setActionHandler('previoustrack', onPrev);
    navigator.mediaSession.setActionHandler('stop', () => {
        audio.pause();
        useGameStore.getState().setMusicEnabled(false);
        navigator.mediaSession.playbackState = 'paused';
    });
}

// ── Load and play a track by index ───────────────────────────────────────────
function loadTrack(idx: number, autoplay: boolean, onNext: () => void, onPrev: () => void) {
    if (CURRENT_PLAYLIST.length === 0) return;
    const track = CURRENT_PLAYLIST[idx];
    const audio = getAudio();
    audio.src = track.url;
    audio.load();
    if (autoplay) {
        audio.play().catch(() => { });
    }
    window.dispatchEvent(new CustomEvent('audio-meta', { detail: track }));
    applyMediaSession(track, autoplay, onNext, onPrev);
}

// ── MusicPlayer (logic only, no UI) ──────────────────────────────────────────
export const MusicPlayer = () => {
    const { musicEnabled } = useGameStore();
    const idxRef = useRef(0);
    const initializedRef = useRef(false);

    const handleNext = () => {
        if (CURRENT_PLAYLIST.length === 0) return;
        idxRef.current = (idxRef.current + 1) % CURRENT_PLAYLIST.length;
        GLOBAL_IDX = idxRef.current;
        loadTrack(idxRef.current, useGameStore.getState().musicEnabled, handleNext, handlePrev);
    };

    const handlePrev = () => {
        if (CURRENT_PLAYLIST.length === 0) return;
        idxRef.current = (idxRef.current - 1 + CURRENT_PLAYLIST.length) % CURRENT_PLAYLIST.length;
        GLOBAL_IDX = idxRef.current;
        loadTrack(idxRef.current, useGameStore.getState().musicEnabled, handleNext, handlePrev);
    };

    // ── Init: fetch playlist once ─────────────────────────────────────────
    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        supabase.from('music_tracks').select('*').order('created_at', { ascending: false }).then(({ data }) => {
            if (data && data.length > 0) {
                CURRENT_PLAYLIST = shuffleArray(data);
            }
            if (CURRENT_PLAYLIST.length === 0) return;

            // Attach ended listener directly — no setTimeout race condition
            const audio = getAudio();
            audio.addEventListener('ended', handleNext);

            // Load first track
            idxRef.current = GLOBAL_IDX;
            loadTrack(idxRef.current, useGameStore.getState().musicEnabled, handleNext, handlePrev);
        });

        // Window events for UI buttons
        const onNext = () => handleNext();
        const onPrev = () => handlePrev();
        window.addEventListener('audio-next', onNext);
        window.addEventListener('audio-prev', onPrev);

        return () => {
            window.removeEventListener('audio-next', onNext);
            window.removeEventListener('audio-prev', onPrev);
            const audio = document.getElementById('noesis-native-audio') as HTMLAudioElement;
            if (audio) audio.removeEventListener('ended', handleNext);
        };
    }, []); // run once

    // ── Sync play/pause state with store ─────────────────────────────────
    useEffect(() => {
        const audio = document.getElementById('noesis-native-audio') as HTMLAudioElement;
        if (!audio || CURRENT_PLAYLIST.length === 0) return;
        if (musicEnabled) {
            audio.play().catch(() => { });
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        } else {
            audio.pause();
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        }
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

        // Sync on mount from current track
        if (CURRENT_PLAYLIST.length > 0) {
            const track = CURRENT_PLAYLIST[GLOBAL_IDX] || CURRENT_PLAYLIST[0];
            setTrackName(track.title || 'Noesis Music');
            setArtist(track.artist || 'Noesis');
            setThumb(track.thumb || '/logo-noesis.png');
        }

        return () => window.removeEventListener('audio-meta', handleMeta);
    }, []);

    const next = (e: React.MouseEvent) => { e.stopPropagation(); window.dispatchEvent(new Event('audio-next')); };
    const prev = (e: React.MouseEvent) => { e.stopPropagation(); window.dispatchEvent(new Event('audio-prev')); };
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
                    <button onClick={prev} className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: 'var(--color-text-muted)' }}>
                        <SkipBack size={16} fill="currentColor" />
                    </button>
                    <button onClick={togglePlay}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow"
                        style={{ background: 'var(--color-gold)', color: '#000' }}>
                        {musicEnabled ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-1" />}
                    </button>
                    <button onClick={next} className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: 'var(--color-text-muted)' }}>
                        <SkipForward size={16} fill="currentColor" />
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
