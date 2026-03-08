const fs = require('fs');
const https = require('https');

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

const urlStr = urlMatch[1].trim() + '/rest/v1/shop_items?select=id,name,disabled_categories&limit=5';
const key = keyMatch[1].trim();

const options = {
    headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
    }
};

https.get(urlStr, options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('DATA:', data);
    });
});
