import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { Profile, DailySession } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export type GamePhase = 'viewing' | 'waiting' | 'recall' | 'result';

interface GameState {
    // Auth
    user: User | null;
    profile: Profile | null;
    pendingGift: any | null;
    unreadMessages: boolean;

    // Daily session
    session: DailySession | null;
    phase: GamePhase;
    wordCount: number;

    // Local 24h lock tracking
    unlockAt: number | null; // unix ms

    // Settings
    soundEnabled: boolean;
    musicEnabled: boolean;
    notificationsEnabled: boolean;

    // Actions
    setUser: (user: User | null) => void;
    setProfile: (profile: Profile | null) => void;
    setSession: (session: DailySession | null) => void;
    setPhase: (phase: GamePhase) => void;
    setWordCount: (n: number) => void;
    setUnlockAt: (ts: number | null) => void;
    setSoundEnabled: (v: boolean) => void;
    setMusicEnabled: (v: boolean) => void;
    setNotificationsEnabled: (v: boolean) => void;
    setUnreadMessages: (v: boolean) => void;

    // Async
    fetchProfile: (userId: string) => Promise<void>;
    updateProfile: (patch: Partial<Profile>) => Promise<void>;
    setPendingGift: (gift: any | null) => void;
    checkPendingGifts: () => Promise<void>;
    startSession: (words: string[]) => Promise<void>;
    submitRecall: (answers: string[], score: number, nousEarned: number) => Promise<void>;
    loadActiveSession: (userId: string) => Promise<void>;
}

export const useGameStore = create<GameState>()(
    persist(
        (set, get) => ({
            user: null,
            profile: null,
            session: null,
            phase: 'viewing',
            wordCount: 3,
            unlockAt: null,
            soundEnabled: true,
            musicEnabled: false,
            notificationsEnabled: true,
            pendingGift: null,
            unreadMessages: false,

            setUser: (user) => set({ user }),
            setProfile: (profile) => set({ profile }),
            setSession: (session) => set({ session }),
            setPhase: (phase) => set({ phase }),
            setWordCount: (wordCount) => set({ wordCount }),
            setUnlockAt: (unlockAt) => set({ unlockAt }),
            setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
            setMusicEnabled: (musicEnabled) => set({ musicEnabled }),
            setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
            setUnreadMessages: (unreadMessages) => set({ unreadMessages }),

            setPendingGift: (pendingGift) => set({ pendingGift }),

            checkPendingGifts: async () => {
                const { user } = get();
                if (!user?.id) return;
                const { data } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('type', 'gift_received')
                    .eq('claimed', false)
                    .order('created_at', { ascending: true })
                    .limit(1);

                if (data && data.length > 0) {
                    set({ pendingGift: data[0] });
                } else {
                    set({ pendingGift: null });
                }
            },

            fetchProfile: async (userId) => {
                // Pre-check for missed days/shields deduction BEFORE fetching the profile
                await supabase.rpc('check_missed_days', { p_user_id: userId });

                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();
                if (!error && data) {
                    set({ profile: data as Profile, wordCount: data.word_count ?? 3 });
                }
            },

            updateProfile: async (patch) => {
                const { user } = get();
                if (!user) return;
                const { data, error } = await supabase
                    .from('profiles')
                    .update(patch)
                    .eq('id', user.id)
                    .select()
                    .single();
                if (!error && data) set({ profile: data as Profile });
            },

            startSession: async (words) => {
                const { user } = get();
                if (!user) return;

                const now = Date.now();
                const unlockMs = now + 24 * 60 * 60 * 1000;
                const unlockAt = new Date(unlockMs).toISOString();

                const { data, error } = await supabase
                    .from('daily_sessions')
                    .insert({
                        user_id: user.id,
                        words,
                        unlocks_at: unlockAt,
                    })
                    .select()
                    .single();

                if (!error && data) {
                    set({
                        session: data as DailySession,
                        unlockAt: unlockMs,
                        // Stay in 'viewing' so cards remain visible with timer below.
                        // Phase transitions to 'waiting' only via loadActiveSession (app restart).
                    });
                }
            },

            submitRecall: async (answers, score) => {
                const { session, user, profile } = get();
                if (!session || !user) return;

                const success = score > 0;
                const currentStreak = profile?.streak ?? 0;
                const currentShields = profile?.shield_count ?? 0;

                await supabase
                    .from('daily_sessions')
                    .update({
                        recalled_at: new Date().toISOString(),
                        answers,
                        score,
                        success,
                    })
                    .eq('id', session.id);

                let newStreak: number;
                let newShields = currentShields;

                if (success) {
                    // Correct recall — streak increases
                    newStreak = currentStreak + 1;
                } else if (currentShields > 0) {
                    // Failed but has shield — consume one shield, streak is preserved
                    newStreak = currentStreak;
                    newShields = currentShields - 1;
                    // Insert notification
                    await supabase.from('notifications').insert({
                        user_id: user.id,
                        type: 'shield_used',
                        title: 'Escudo ativado!',
                        body: `Sua ofensiva de ${currentStreak} dias foi protegida. ${newShields} escudo(s) restante(s).`,
                    });
                } else {
                    // Failed with no shields — streak resets
                    newStreak = 0;
                    if (currentStreak > 0) {
                        await supabase.from('notifications').insert({
                            user_id: user.id,
                            type: 'streak_broken',
                            title: 'Ofensiva perdida',
                            body: `Sua sequência de ${currentStreak} dias foi encerrada. Compre escudos para se proteger!`,
                        });
                    }
                }

                await supabase
                    .from('profiles')
                    .update({
                        nous_coins: (profile?.nous_coins ?? 0) + (success ? 15 : 0),
                        score: (profile?.score ?? 0) + score,
                        streak: newStreak,
                        shield_count: newShields,
                        last_played_date: new Date().toISOString().split('T')[0],
                    })
                    .eq('id', user.id);

                // Do NOT auto-advance phase — RecallPhase will call setPhase('result') on PROSSEGUIR click
                set({ unlockAt: null });
                await get().fetchProfile(user.id);
            },

            loadActiveSession: async (userId) => {
                // Find today's session that hasn't been recalled yet
                const { data } = await supabase
                    .from('daily_sessions')
                    .select('*')
                    .eq('user_id', userId)
                    .is('recalled_at', null)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (data) {
                    const session = data as DailySession;
                    const unlockMs = new Date(session.unlocks_at).getTime();
                    const now = Date.now();
                    set({
                        session,
                        unlockAt: unlockMs,
                        phase: now >= unlockMs ? 'recall' : 'waiting',
                    });
                }
            },
        }),
        {
            name: 'noesis-game-store',
            // Only persist non-sensitive local state
            partialize: (state) => ({
                wordCount: state.wordCount,
                unlockAt: state.unlockAt,
                phase: state.phase,
                soundEnabled: state.soundEnabled,
                musicEnabled: state.musicEnabled,
                notificationsEnabled: state.notificationsEnabled,
            }),
        }
    )
);
