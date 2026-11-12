import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_hms_dev_only_change_in_prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate a signed JWT token containing user identity and role
 */
export function generateToken(user) {
  const payload = {
    id: user.id,
    phone: user.phone,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify and decode an incoming JWT token
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

