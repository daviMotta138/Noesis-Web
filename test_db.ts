import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const sb = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data: cols, error: e1 } = await sb.from('shop_items').select('id, disabled_categories').limit(5);
    console.log(JSON.stringify(cols, null, 2));
    if (e1) console.error(e1);
}

test();
