import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const PREFIX = 'ENC:';

function getKey(keyText: string): Buffer {
  return createHash('sha256').update(keyText).digest();
}

export function encryptString(plain: string, secret: string): string {
  const key = getKey(secret);
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, encrypted]).toString('base64');
  return PREFIX + payload;
}

export function decryptString(data: string, secret: string): string {
  if (!data.startsWith(PREFIX)) return data; // Not encrypted
  const payload = Buffer.from(data.slice(PREFIX.length), 'base64');
  const iv = payload.subarray(0, 16);
  const tag = payload.subarray(16, 32);
  const ciphertext = payload.subarray(32);
  const key = getKey(secret);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}