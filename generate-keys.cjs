const webpush = require('web-push');
const vapidKeys = webpush.generateVAPIDKeys();
require('fs').writeFileSync('vapid.json', JSON.stringify(vapidKeys));
