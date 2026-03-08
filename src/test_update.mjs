import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
    const [key, val] = line.split('=');
    if (key && val) acc[key.trim()] = val.trim();
    return acc;
}, {});

const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = env;
const keyMatchServ = env['VITE_SUPABASE_SERVICE_ROLE_KEY'] || env['SUPABASE_SERVICE_ROLE_KEY'];
const authKey = keyMatchServ || VITE_SUPABASE_ANON_KEY;

// 1. Fetch
const getRes = await fetch(`${VITE_SUPABASE_URL}/rest/v1/shop_items?id=eq.shield_5&select=id,disabled_categories`, {
    headers: {
        'apikey': authKey,
        'Authorization': `Bearer ${authKey}`
    }
});
const item = (await getRes.json())[0];
console.log('BEFORE:', item);

// 2. Update
const patchRes = await fetch(`${VITE_SUPABASE_URL}/rest/v1/shop_items?id=eq.shield_5`, {
    method: 'PATCH',
    headers: {
        'apikey': authKey,
        'Authorization': `Bearer ${authKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    },
    body: JSON.stringify({ disabled_categories: '{test_category}' })
});

const patched = await patchRes.json();
console.log('AFTER UPDATE:', patched);

// 3. Revert
await fetch(`${VITE_SUPABASE_URL}/rest/v1/shop_items?id=eq.shield_5`, {
    method: 'PATCH',
    headers: {
        'apikey': authKey,
        'Authorization': `Bearer ${authKey}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ disabled_categories: item.disabled_categories || [] })
});
console.log('REVERTED!');
