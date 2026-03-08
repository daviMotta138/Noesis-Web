import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'REPLACE_ME';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'REPLACE_ME';

const sb = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await sb.from('shop_items').select('*').limit(1);
    console.log(JSON.stringify({ data, error }, null, 2));
}

test();
