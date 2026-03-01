import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Noesis] Supabase env vars not set. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local');
}

export const supabase = createClient(
    supabaseUrl ?? 'https://placeholder.supabase.co',
    supabaseAnonKey ?? 'placeholder'
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AvatarConfig {
    body: string;
    hair: string;
    shirt: string;
    accessory: string;
    shoes: string;
}

export interface Profile {
    id: string;
    display_name: string;
    avatar_url: string | null;
    email: string | null;
    nous_coins: number;
    score: number;
    streak: number;
    shield_count: number;
    streak_shields: number;   // purchasable streak freezes
    is_admin: boolean;         // admin: unlimited Nous + timer control
    friend_id: string;
    avatar_config: AvatarConfig;
    word_count: number;
    created_at: string;
    league: string;
    badges?: string[];
    last_played_date?: string;
    last_shield_check?: string;
}

export interface DailySession {
    id: string;
    user_id: string;
    words: string[];
    viewed_at: string;
    unlocks_at: string;
    recalled_at: string | null;
    answers: string[] | null;
    score: number;
    success: boolean | null;
}

export interface ShopItem {
    id: string;
    name: string;
    description: string;
    category: 'shield' | 'hair' | 'shirt' | 'shoes' | 'accessory' | 'item';
    price_nous: number;
    price_brl: number | null;
    asset_key: string;
    preview_url: string | null;
}

export interface UserItem {
    id: string;
    user_id: string;
    item_id: string;
    equipped: boolean;
    shop_items?: ShopItem;
}
