import crypto from 'crypto';

const JWT_SECRET = 'lwa-secure-secret-key-12345678901234567890';

function decryptToken(token) {
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(JWT_SECRET.slice(0, 32).padEnd(32, '0')), Buffer.alloc(16, 0));
    let decrypted = decipher.update(token, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (e) {
    console.error('Decryption failed:', e);
    return null;
  }
}

const token = "7245aae2cbb4d62c12ff9e3330ea8c9e901ebd115146d6019c15c0e60d7371934b818aec93f9991f5b74085daf848112314025a97eef17ba224b3df07affa35e";
console.log('Decrypted:', decryptToken(token));
