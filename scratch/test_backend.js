
const https = require('https');

const options = {
  hostname: 'fashion-modern-backend.onrender.com',
  port: 443,
  path: '/',
  method: 'GET',
  timeout: 10000
};

console.log('Testing connection to Render backend...');

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.on('timeout', () => {
    console.log('Request timed out after 10 seconds');
    req.destroy();
});

req.end();
