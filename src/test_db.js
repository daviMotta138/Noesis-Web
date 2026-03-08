import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'REPLACE_ME';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'REPLACE_ME';

const sb = createClient(supabaseUrl, supabaseKey);

async function checkCols() {
    const { data, error } = await sb.from('shop_items').select('id, name, disabled_categories').limit(1);

    if (error) {
        console.log("SQL ERROR DETECTED:");
        console.error(error);
        if (error.message.includes('Columns not found') || error.code === 'PGRST204') {
            console.log(">>> COLUMN `disabled_categories` DOES NOT EXIST IN DATABASE!");
        }
    } else {
        console.log("SUCCESS! Column exists. Example:", data);
    }
}

checkCols();
