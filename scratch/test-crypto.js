const { createCipheriv, createDecipheriv, randomBytes } = require('crypto');

const encryptionKey = 'change-this-key-in-production-32c';

function encryptApiKey(plaintext) {
  const key = Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32));
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptApiKey(encrypted) {
  const key = Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32));
  const [ivHex, encHex] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encBuf = Buffer.from(encHex, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(encBuf), decipher.final()]).toString('utf8');
}

const plain = "AIzaSyTestApiKey";
const enc = encryptApiKey(plain);
const dec = decryptApiKey(enc);

console.log({ plain, enc, dec, success: plain === dec });
