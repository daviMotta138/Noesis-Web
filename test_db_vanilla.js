const fs = require('fs');

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

if (!urlMatch || !keyMatch) {
    console.error("Missing env vars");
    process.exit(1);
}

const url = urlMatch[1].trim();
const key = keyMatch[1].trim();

fetch(`${url}/rest/v1/shop_items?select=id,disabled_categories&limit=5`, {
    headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
    }
})
    .then(r => r.json())
    .then(data => {
        console.log(JSON.stringify(data, null, 2));
    })
    .catch(console.error);
