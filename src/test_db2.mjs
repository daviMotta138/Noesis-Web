import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
    const [key, val] = line.split('=');
    if (key && val) acc[key.trim()] = val.trim();
    return acc;
}, {});

const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = env;

const res = await fetch(`${VITE_SUPABASE_URL}/rest/v1/shop_items?select=id,disabled_categories&limit=1`, {
    headers: {
        'apikey': VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${VITE_SUPABASE_ANON_KEY}`
    }
});

const data = await res.json();
console.log('STATUS:', res.status);
console.log('RESPONSE:', JSON.stringify(data, null, 2));
