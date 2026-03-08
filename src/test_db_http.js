const fs = require('fs');
const https = require('https');

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

if (!urlMatch || !keyMatch) {
    console.error("Missing env vars");
    process.exit(1);
}

const urlStr = urlMatch[1].trim() + '/rest/v1/shop_items?select=id,disabled_categories&limit=1';
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
        console.log('STATUS:', res.statusCode);
        console.log('RESPONSE:', data);
    });
}).on("error", (err) => {
    console.log("Error: " + err.message);
});
