import crypto from 'crypto';

const JWT_SECRET = 'lwa-secure-secret-key-12345678901234567890';
const token = '7245aae2cbb4d62c12ff9e3330ea8c9e901ebd115146d6019c15c0e60d737193f90c351543d5ad0dd9f7ec231f8009e7ba1e35f57a67c22ca823f42417f5fb5e';

function decryptToken(token) {
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(JWT_SECRET.slice(0, 32).padEnd(32, '0')), Buffer.alloc(16, 0));
    let decrypted = decipher.update(token, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (e) {
    console.error('Decryption failed error:', e.message);
    return null;
  }
}

console.log('Decrypted result:', decryptToken(token));
