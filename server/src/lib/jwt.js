import jwt from 'jsonwebtoken';

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    const error = new Error('JWT_SECRET must be configured with at least 32 characters');
    error.status = 500;
    throw error;
  }
  return secret;
}

export function signAccessToken(user) {
  return jwt.sign(
    { role: user.role, branchId: user.branchId },
    jwtSecret(),
    { algorithm: 'HS256', subject: user.id, expiresIn: process.env.JWT_EXPIRES_IN ?? '8h' },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] });
}
