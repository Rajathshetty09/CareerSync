import crypto from 'crypto';
import env from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const raw = env.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw || raw.length < 32) {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY must be at least 32 characters');
  }
  // Derive a 32-byte key from the provided secret
  return crypto.createHash('sha256').update(raw).digest();
}

/**
 * Encrypt a plaintext string.
 * Returns a JSON string containing { iv, tag, ciphertext } (all hex-encoded).
 */
export const encrypt = (plaintext) => {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext: encrypted.toString('hex'),
  });
};

/**
 * Decrypt a value produced by encrypt().
 * Throws if the data has been tampered with (GCM auth tag mismatch).
 */
export const decrypt = (payload) => {
  const key = getKey();
  const { iv, tag, ciphertext } = JSON.parse(payload);
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return decipher.update(Buffer.from(ciphertext, 'hex')) + decipher.final('utf8');
};
