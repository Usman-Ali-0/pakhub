const { Client } = require('ssh2');

const conn = new Client();
const config = {
  host: '143.198.88.163',
  port: 22,
  username: 'root',
  password: 'UsmanAli7401ali'
};

const script = `
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const https = require('https');

const prisma = new PrismaClient();
const encryptionKey = 'change-this-key-in-production-32c';

function decryptApiKey(encrypted) {
  const key = Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32));
  const [ivHex, encHex] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encBuf = Buffer.from(encHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(encBuf), decipher.final()]).toString('utf8');
}

async function test() {
  const provider = await prisma.userAiProvider.findFirst({ where: { provider: 'GEMINI' } });
  if (!provider) return console.log('No GEMINI provider found');
  
  const apiKey = decryptApiKey(provider.encryptedApiKey);
  console.log('Testing with key:', apiKey.substring(0, 8));
  
  const url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey;
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.models) {
          console.log('Available models for this key:');
          parsed.models.forEach(m => console.log(' - ' + m.name));
        } else {
          console.log('Error output from ListModels:', JSON.stringify(parsed, null, 2));
        }
      } catch (e) {
        console.log('Failed to parse response:', data);
      }
    });
  }).on('error', console.error);
}
test().catch(console.error).finally(() => prisma.$disconnect());
`;

const command = "docker exec pakhub-api node -e \"" + script.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/\n/g, ' ') + "\"";

conn.on('ready', () => {
  conn.exec(command, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect(config);
