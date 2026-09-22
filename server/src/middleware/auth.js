import prisma from '../lib/prisma.js';
import { verifyAccessToken } from '../lib/jwt.js';

function unauthorized(message = 'Authentication is required') {
  const error = new Error(message);
  error.status = 401;
  return error;
}

function readBearerToken(request) {
  const header = request.get('authorization');
  if (!header) return null;

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw unauthorized('Use a Bearer access token');
  return token;
}

async function authenticate(request) {
  const token = readBearerToken(request);
  if (!token) return null;

  try {
    const payload = verifyAccessToken(token);
    if (typeof payload.sub !== 'string') throw unauthorized('Invalid access token');

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw unauthorized('User no longer exists');
    return user;
  } catch (error) {
    if (error.status) throw error;
    throw unauthorized('Invalid or expired access token');
  }
}

export async function optionalAuth(request, _response, next) {
  try {
    request.user = await authenticate(request);
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAuth(request, _response, next) {
  try {
    const user = await authenticate(request);
    if (!user) throw unauthorized();
    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles) {
  return (request, _response, next) => {
    if (!request.user) return next(unauthorized());
    if (!roles.includes(request.user.role)) {
      const error = new Error('You do not have permission to perform this action');
      error.status = 403;
      return next(error);
    }
    return next();
  };
}
