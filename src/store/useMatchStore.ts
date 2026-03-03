// src/store/useMatchStore.ts
// Zustand store for Battle Royale match state and Realtime integration

import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface BRCard {
  idx: number;
  revealed: boolean;
}

export interface BRPlayer {
  id: string;
  display_name: string;
  is_bot: boolean;
  status: 'waiting' | 'playing' | 'eliminated' | 'left';
  consecutive_hits: number;
  total_score: number;
  errors: number;
  is_current_turn: boolean;
}

export interface BRMatch {
  id: string;
  host_id: string;
  status: 'waiting' | 'playing' | 'finished';
  max_players: number;
  grid_rows: number;
  grid_cols: number;
  round_number: number;
  cards_remaining: number;
  current_player_id: string;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

interface MatchState {
  match: BRMatch | null;
  players: BRPlayer[];
  cards: BRCard[];
  loading: boolean;
  error: string | null;

  // Actions
  createMatch: (hostId: string, maxPlayers?: number, rows?: number, cols?: number) => Promise<string>;
  createInvite: (matchId: string, ttlSeconds?: number) => Promise<string>;
  joinByInvite: (token: string, userId: string, displayName: string) => Promise<any>;
  addBot: (matchId: string) => Promise<string>;
  fillWithBotsAndStart: (matchId: string) => Promise<void>;
  joinMatch: (matchId: string, userId: string, displayName: string, isBot?: boolean) => Promise<string>;
  startMatch: (matchId: string) => Promise<void>;
  reportPair: (matchId: string, playerId: string, idx1: number, idx2: number) => Promise<any>;
  getMatchState: (matchId: string, playerId: string) => Promise<void>;
  enqueueQueue: (userId: string, displayName: string) => Promise<any>;
  leaveQueue: (userId: string) => Promise<void>;
  subscribeToMatch: (matchId: string, playerId: string) => () => void;
  reset: () => void;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  match: null,
  players: [],
  cards: [],
  loading: false,
  error: null,

  createMatch: async (hostId, maxPlayers = 8, rows = 4, cols = 6) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.rpc('create_br_match', {
        p_host: hostId,
        p_max_players: maxPlayers,
        p_rows: rows,
        p_cols: cols
      });
      if (error) throw error;
      return data as string;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  joinMatch: async (matchId, userId, displayName, isBot = false) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.rpc('join_br_match', {
        p_match_id: matchId,
        p_user_id: userId,
        p_display_name: displayName,
        p_is_bot: isBot
      });
      if (error) throw error;
      return data as string;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  startMatch: async (matchId) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.rpc('start_br_match', {
        p_match_id: matchId
      });
      if (error) throw error;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  reportPair: async (matchId, playerId, idx1, idx2) => {
    try {
      const { data, error } = await supabase.rpc('report_pair', {
        p_match_id: matchId,
        p_player_id: playerId,
        p_idx1: idx1,
        p_idx2: idx2
      });
      if (error) throw error;
      return data;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    }
  },

  getMatchState: async (matchId, playerId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.rpc('get_match_state', {
        p_match_id: matchId,
        p_player_id: playerId
      });
      if (error) throw error;

      const snapshot = data as any;
      set({
        match: snapshot.match,
        players: snapshot.players || [],
        cards: snapshot.cards || []
      });
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ loading: false });
    }
  },

  createInvite: async (matchId, ttlSeconds = 30) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.rpc('create_br_invite', {
        p_match_id: matchId,
        p_ttl: ttlSeconds
      });
      if (error) throw error;
      return data as string;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },
  joinByInvite: async (token, userId, displayName) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.rpc('join_br_match_by_token', {
        p_token: token,
        p_user_id: userId,
        p_display_name: displayName
      });
      if (error) throw error;
      return data; // expected shape { match_id, player_id }
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },
  addBot: async (matchId): Promise<string> => {
    const botId = crypto.randomUUID();
    return get().joinMatch(matchId, botId, 'Bot', true);
  },
  fillWithBotsAndStart: async (matchId): Promise<void> => {
    const state = get();
    const { match, players } = state;
    if (!match) return;
    const toAdd = match.max_players - players.length;
    for (let i = 0; i < toAdd; i++) {
      await state.addBot(matchId);
    }
    await state.startMatch(matchId);
  },
  enqueueQueue: async (userId: string, displayName: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.rpc('enqueue_player', {
        p_user_id: userId,
        p_display_name: displayName
      });
      if (error) throw error;
      return data as any;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },
  leaveQueue: async (userId: string) => {
    try {
      const { error } = await supabase.rpc('leave_queue', { p_user_id: userId });
      if (error) throw error;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    }
  },
  subscribeToMatch: (matchId, playerId) => {
    // Subscribe to Realtime changes on br_matches, br_players, br_cards, br_events
    const matchSubscription = supabase
      .channel(`match:${matchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'br_matches', filter: `id=eq.${matchId}` },
        (payload) => {
          set({ match: payload.new as BRMatch });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'br_players', filter: `match_id=eq.${matchId}` },
        () => {
          // Refetch players on any change
          useMatchStore.getState().getMatchState(matchId, playerId);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'br_events', filter: `match_id=eq.${matchId}` },
        (payload) => {
          // Handle specific events: turn_pass, pair_found, player_eliminated, etc
          console.log('BR Event:', payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchSubscription);
    };
  },

  reset: () => {
    set({
      match: null,
      players: [],
      cards: [],
      loading: false,
      error: null
    });
  }
}));
