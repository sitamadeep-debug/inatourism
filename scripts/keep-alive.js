// Supabase Database Keep-Alive Script (Node.js)
// Prevents Supabase Free Tier projects from auto-pausing due to inactivity.

const https = require('https');

const SUPABASE_URL = 'https://ejqnozlhijoajykilfpy.supabase.co';
const API_KEY = 'sb_publishable_gyBNo-B1YOgEZtIOWBIfmw__pouxfqc';

console.log('====================================================');
console.log('🚀 Sending Keep-Alive Ping to Supabase Database...');
console.log('Target:', SUPABASE_URL);
console.log('Timestamp:', new Date().toISOString());
console.log('====================================================');

const options = {
  hostname: 'ejqnozlhijoajykilfpy.supabase.co',
  path: '/rest/v1/comments?select=id&limit=1',
  method: 'GET',
  headers: {
    'apikey': API_KEY,
    'Authorization': `Bearer ${API_KEY}`,
    'User-Agent': 'KeepAlive-Ping/1.0'
  },
  timeout: 10000
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log(`HTTP Status: ${res.statusCode} ${res.statusMessage}`);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ SUCCESS: Supabase PostgreSQL database is awake and active!');
      console.log('Inactivity timer refreshed successfully.');
    } else {
      console.log('⚠️ Response:', body);
      console.log('If paused, restore it at: https://supabase.com/dashboard/project/ejqnozlhijoajykilfpy');
    }
  });
});

req.on('error', (e) => {
  console.log(`⚠️ Network / DNS Error: ${e.message}`);
  console.log('If domain cannot be resolved, the project is currently in PAUSED state.');
  console.log('👉 Please restore it once at: https://supabase.com/dashboard/project/ejqnozlhijoajykilfpy');
});

req.on('timeout', () => {
  req.destroy();
  console.log('⚠️ Request timed out.');
});

req.end();
