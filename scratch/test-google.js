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
const { GoogleGenerativeAI } = require('@google/generative-ai');
const crypto = require('crypto');

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
  console.log('Testing with API key:', apiKey.substring(0, 6));
  
  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    console.log('Calling Gemini (gemini-1.5-flash-latest)...');
    const response = await model.generateContent('Say hello');
    console.log('Response:', response.response.text());
  } catch (err) {
    console.log('Gemini Error (latest):', err.message);
  }
  
  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: 'gemini-1.5-pro' });
    console.log('Calling Gemini (gemini-1.5-pro)...');
    const response = await model.generateContent('Say hello');
    console.log('Response:', response.response.text());
  } catch (err) {
    console.log('Gemini Error (pro):', err.message);
  }
}
test().catch(console.error).finally(() => prisma.$disconnect());
`;

const command = \`
docker exec pakhub-api npm install @google/generative-ai@latest
docker exec pakhub-api node -e "\${script.replace(/"/g, '\\\\"').replace(/\\$/g, '\\\\$').replace(/\\n/g, ' ')}"
\`;

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
