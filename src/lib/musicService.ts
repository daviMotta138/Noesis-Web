// src/lib/musicService.ts
// Singleton audio engine — lives at module scope, survives any React remount.
// Import this anywhere; only one instance ever exists.
import { supabase } from './supabase';
import { useGameStore } from '../store/useGameStore';

// ── Singleton state ───────────────────────────────────────────────────────────
let _audio: HTMLAudioElement | null = null;
let _playlist: any[] = [];
let _idx = 0;
let _fetchDone = false;
let _currentUrl = ''; // track the loaded URL ourselves — don't trust audio.src comparison

const STORAGE_KEY = 'noesis_music_pos';

function _savePosition() {
    if (!_audio || !_currentUrl) return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            url: _currentUrl,
            idx: _idx,
            time: _audio.currentTime,
        }));
    } catch { }
}

function _restorePosition() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const { url, time } = JSON.parse(raw);
        // Only restore if the URL still exists in the current (possibly reshuffled) playlist
        const found = _playlist.findIndex(t => t.url === url);
        if (found !== -1 && _audio) {
            _idx = found;
            _currentUrl = url;
            _audio.src = url;
            _audio.load();
            // Seek to saved position once enough data is buffered
            const onCanPlay = () => {
                if (_audio && time > 1) _audio.currentTime = time;
                _audio?.removeEventListener('canplay', onCanPlay);
            };
            _audio.addEventListener('canplay', onCanPlay);
            if (useGameStore.getState().musicEnabled) _audio.play().catch(() => { });
            window.dispatchEvent(new CustomEvent('audio-meta', { detail: _playlist[_idx] }));
            _applyMediaSession(_playlist[_idx]);
            return true;
        }
    } catch { }
    return false;
}

// ── Audio element — created once, stored in module scope (NOT in the DOM) ────
function _getAudio(): HTMLAudioElement {
    if (!_audio) {
        _audio = new Audio();
        _audio.volume = 0.25;
    }
    return _audio;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function _absUrl(url: string): string {
    if (!url) return `${window.location.origin}/logo-noesis.png`;
    if (url.startsWith('http')) return url;
    return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

// ── Load a track (only if URL changed) ───────────────────────────────────────
function _loadTrack(newIdx: number, autoplay: boolean) {
    if (!_playlist.length) return;
    _idx = Math.max(0, Math.min(_playlist.length - 1, newIdx));
    const track = _playlist[_idx];
    const audio = _getAudio();

    if (_currentUrl !== track.url) {
        _currentUrl = track.url;
        audio.src = track.url;
        audio.load();
    }

    if (autoplay) audio.play().catch(() => { });

    window.dispatchEvent(new CustomEvent('audio-meta', { detail: track }));
    _applyMediaSession(track);
    _savePosition();
}

// ── Public controls ───────────────────────────────────────────────────────────
export function next() {
    const newIdx = (_idx + 1) % (_playlist.length || 1);
    _loadTrack(newIdx, useGameStore.getState().musicEnabled);
}

export function prev() {
    const newIdx = (_idx - 1 + (_playlist.length || 1)) % (_playlist.length || 1);
    _loadTrack(newIdx, useGameStore.getState().musicEnabled);
}

export function syncPlayPause(musicEnabled: boolean) {
    const audio = _getAudio();
    if (musicEnabled) {
        if (_playlist.length && !_currentUrl) _loadTrack(0, true);
        else audio.play().catch(() => { });
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    } else {
        audio.pause();
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    }
}

export function getCurrentMeta() {
    if (!_playlist.length) return null;
    return _playlist[_idx] ?? null;
}

// ── MediaSession ──────────────────────────────────────────────────────────────
function _applyMediaSession(track: any) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || 'Noesis Music',
        artist: track.artist || 'Noesis',
        album: 'Palácio da Memória',
        artwork: [
            { src: _absUrl(track.thumb), sizes: '512x512', type: 'image/png' },
            { src: _absUrl(track.thumb), sizes: '256x256', type: 'image/png' },
        ],
    });
    navigator.mediaSession.setActionHandler('play', () => {
        _getAudio().play().catch(() => { });
        useGameStore.getState().setMusicEnabled(true);
        navigator.mediaSession.playbackState = 'playing';
    });
    navigator.mediaSession.setActionHandler('pause', () => {
        _getAudio().pause();
        useGameStore.getState().setMusicEnabled(false);
        navigator.mediaSession.playbackState = 'paused';
    });
    navigator.mediaSession.setActionHandler('nexttrack', next);
    navigator.mediaSession.setActionHandler('previoustrack', prev);
    navigator.mediaSession.setActionHandler('stop', () => {
        _getAudio().pause();
        useGameStore.getState().setMusicEnabled(false);
        navigator.mediaSession.playbackState = 'paused';
    });
}

// ── Init (safe to call multiple times) ───────────────────────────────────────
export async function ensureMusicInit() {
    if (_fetchDone) return;
    _fetchDone = true;

    const { data } = await supabase
        .from('music_tracks')
        .select('*')
        .order('created_at', { ascending: false });

    if (!data?.length) return;
    _playlist = _shuffle(data);
    _idx = 0;

    const audio = _getAudio();
    audio.addEventListener('ended', next);

    // Save position every 3 seconds as a failsafe
    setInterval(_savePosition, 3000);

    window.addEventListener('audio-next', next);
    window.addEventListener('audio-prev', prev);

    // Try to restore last position; fall back to track 0
    if (!_restorePosition()) {
        _loadTrack(0, useGameStore.getState().musicEnabled);
    }
}
