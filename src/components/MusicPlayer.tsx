import { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

// Singleton to hold the current playlist across components safely
let CURRENT_PLAYLIST: any[] = [];

// Helper to shuffle array (Fisher-Yates)
const shuffleArray = (array: any[]) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};

export const MusicPlayer = () => {
    const { musicEnabled, setMusicEnabled } = useGameStore();

    useEffect(() => {
        const initializeAudio = async () => {
            // First time load: fetch from Supabase
            const { data } = await supabase.from('music_tracks').select('*').order('created_at', { ascending: false });
            if (data && data.length > 0) {
                CURRENT_PLAYLIST = shuffleArray(data);
            } else {
                CURRENT_PLAYLIST = [];
            }

            // Do not initialize audio element if there's no music to play
            if (CURRENT_PLAYLIST.length === 0) return;

            let audio = document.getElementById('noesis-native-audio') as HTMLAudioElement;

            if (!audio) {
                audio = document.createElement('audio');
                audio.id = 'noesis-native-audio';
                audio.volume = 0.25;
                audio.src = CURRENT_PLAYLIST[0].url;
                document.body.appendChild(audio);

                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('audio-meta', { detail: CURRENT_PLAYLIST[0] }));
                }, 500);
            }

            if (musicEnabled) {
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.warn("Autoplay preventing bg music:", error);

                        // Fallback: wait for the first click to try again
                        const resumeAudio = () => {
                            if (useGameStore.getState().musicEnabled) {
                                audio.play().catch(() => { });
                            }
                            document.removeEventListener('pointerdown', resumeAudio);
                            document.removeEventListener('keydown', resumeAudio);
                        };
                        document.addEventListener('pointerdown', resumeAudio, { once: true });
                        document.addEventListener('keydown', resumeAudio, { once: true });
                    });
                }
            } else {
                audio.pause();
            }
        };

        initializeAudio();
    }, [musicEnabled, setMusicEnabled]);

    useEffect(() => {
        let currentIdx = 0;
        const audio = document.getElementById('noesis-native-audio') as HTMLAudioElement;

        const loadTrack = (idx: number) => {
            if (!audio || CURRENT_PLAYLIST.length === 0) return;
            const track = CURRENT_PLAYLIST[idx];
            audio.src = track.url;
            if (useGameStore.getState().musicEnabled) {
                audio.play().catch(() => { });
            }
            window.dispatchEvent(new CustomEvent('audio-meta', { detail: track }));
        };

        const handleNext = () => {
            if (CURRENT_PLAYLIST.length === 0) return;
            currentIdx = (currentIdx + 1) % CURRENT_PLAYLIST.length;
            loadTrack(currentIdx);
        };

        const handlePrev = () => {
            if (CURRENT_PLAYLIST.length === 0) return;
            currentIdx = (currentIdx - 1 + CURRENT_PLAYLIST.length) % CURRENT_PLAYLIST.length;
            loadTrack(currentIdx);
        };

        const handleEnded = () => handleNext();

        window.addEventListener('audio-next', handleNext);
        window.addEventListener('audio-prev', handlePrev);

        // Wait briefly for element creation just in case
        setTimeout(() => {
            const el = document.getElementById('noesis-native-audio') as HTMLAudioElement;
            if (el && CURRENT_PLAYLIST.length > 0) el.addEventListener('ended', handleEnded);
        }, 1000);

        return () => {
            window.removeEventListener('audio-next', handleNext);
            window.removeEventListener('audio-prev', handlePrev);
            if (audio) audio.removeEventListener('ended', handleEnded);
        }
    }, []);

    return null;
};

export const MusicPlayerUI = ({ className = '', fullWidth = false }: { className?: string, fullWidth?: boolean }) => {
    const { musicEnabled, setMusicEnabled } = useGameStore();
    const [trackName, setTrackName] = useState('Sem Faixas Disponíveis');
    const [artist, setArtist] = useState('...');
    const [thumb, setThumb] = useState('https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100&auto=format&fit=crop');

    useEffect(() => {
        const handleMeta = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail.title) setTrackName(detail.title);
            if (detail.artist) setArtist(detail.artist);
            if (detail.thumb) setThumb(detail.thumb);
        };
        window.addEventListener('audio-meta', handleMeta);

        // Sync local UI directly with the current track on mount
        const audio = document.getElementById('noesis-native-audio') as HTMLAudioElement;

        if (CURRENT_PLAYLIST.length > 0) {
            if (audio && audio.src) {
                const track = CURRENT_PLAYLIST.find(p => p.url === audio.src) || CURRENT_PLAYLIST[0];
                setTrackName(track.title);
                setArtist(track.artist);
                setThumb(track.thumb);
            } else {
                setTrackName(CURRENT_PLAYLIST[0].title);
                setArtist(CURRENT_PLAYLIST[0].artist);
                setThumb(CURRENT_PLAYLIST[0].thumb);
            }
        } else {
            setTrackName('Sem Faixas Disponíveis');
            setArtist('...');
        }

        return () => window.removeEventListener('audio-meta', handleMeta);
    }, []);

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        window.dispatchEvent(new Event('audio-next'));
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        window.dispatchEvent(new Event('audio-prev'));
    };

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMusicEnabled(!musicEnabled);
    };

    return (
        <div className={className}>

            {/* UI Widget following Site Palette */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center rounded-[20px] overflow-hidden shadow-2xl ${fullWidth ? 'w-full' : 'w-[280px]'}`}
                style={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border-glow)',
                    height: 64,
                }}
            >
                {/* Album Art */}
                <div className="w-16 h-16 bg-black flex-shrink-0 relative">
                    <img src={thumb} alt="Album Art" className="w-full h-full object-cover opacity-80" />
                    <div className="absolute right-0 inset-y-0 w-px" style={{ background: 'var(--color-border)' }} />
                </div>

                {/* Track Info */}
                <div className="flex-1 px-3 py-1 flex flex-col justify-center min-w-0">
                    <p className="text-xs font-bold leading-tight truncate" style={{ color: 'var(--color-text)' }}>
                        {trackName}
                    </p>
                    <p className="text-[10px] font-medium truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {artist}
                    </p>
                </div>

                {/* Controls */}
                <div className="flex items-center pr-3 gap-1">
                    <button onClick={handlePrev} className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: 'var(--color-text-muted)' }}>
                        <SkipBack size={16} fill="currentColor" />
                    </button>

                    <button
                        onClick={togglePlay}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow"
                        style={{ background: 'var(--color-gold)', color: '#000' }}
                    >
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
