// src/lib/audio.ts
import { useGameStore } from '../store/useGameStore';

class AudioEngine {
    private ctx: AudioContext | null = null;
    private initialized = false;

    init() {
        if (!this.initialized) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.initialized = true;
        }
        if (this.ctx?.state === 'suspended') {
            this.ctx.resume();
        }
    }

    private playTone(freq: number, type: OscillatorType, duration: number, vol: number, sweep?: number) {
        if (!useGameStore.getState().soundEnabled) return;

        try {
            this.init();
            if (!this.ctx) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            if (sweep) {
                osc.frequency.exponentialRampToValueAtTime(sweep, this.ctx.currentTime + duration);
            }

            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            console.error('Audio play failed', e);
        }
    }

    play(name: 'click' | 'flip' | 'success' | 'error' | 'match' | 'chest' | 'nav' | 'achievement') {
        if (!useGameStore.getState().soundEnabled) return;

        switch (name) {
            case 'click':
            case 'nav':
                this.playTone(600, 'sine', 0.05, 0.05);
                break;
            case 'flip':
                // low thud
                this.playTone(150, 'triangle', 0.15, 0.1, 50);
                break;
            case 'match':
                // high chime
                this.playTone(880, 'sine', 0.3, 0.05);
                setTimeout(() => this.playTone(1760, 'sine', 0.4, 0.05), 100);
                break;
            case 'success':
                // majestic chord (arpeggio)
                this.playTone(440, 'sine', 0.4, 0.08); // A
                setTimeout(() => this.playTone(554, 'sine', 0.4, 0.08), 100); // C#
                setTimeout(() => this.playTone(659, 'sine', 0.4, 0.08), 200); // E
                setTimeout(() => this.playTone(880, 'sine', 0.6, 0.1), 300); // A high
                break;
            case 'error':
                // low buzz
                this.playTone(150, 'sawtooth', 0.3, 0.08, 100);
                break;
            case 'chest':
                // glittery sparkle
                for (let i = 0; i < 5; i++) {
                    setTimeout(() => this.playTone(800 + Math.random() * 1000, 'sine', 0.2, 0.03), i * 50);
                }
                break;
            case 'achievement':
                // majestic victory fanfare
                this.playTone(523.25, 'sine', 0.2, 0.08); // C5
                setTimeout(() => this.playTone(659.25, 'sine', 0.2, 0.08), 100); // E5
                setTimeout(() => this.playTone(783.99, 'sine', 0.2, 0.08), 200); // G5
                setTimeout(() => this.playTone(1046.50, 'sine', 0.5, 0.1), 300); // C6
                break;
        }
    }
}

export const audio = new AudioEngine();
