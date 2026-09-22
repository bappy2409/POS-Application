import bcrypt from 'bcrypt';
import { Router } from 'express';

import { signAccessToken } from '../lib/jwt.js';
import prisma from '../lib/prisma.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const authRouter = Router();
const STAFF_ROLES = new Set(['owner', 'branch_manager', 'cashier']);
const ALL_ROLES = new Set([...STAFF_ROLES, 'customer']);
const PASSWORD_MIN_LENGTH = 12;

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    branchId: user.branchId,
  };
}

function parseRegistration(body) {
  const email = body.email?.trim().toLowerCase();
  const firstName = body.firstName?.trim();
  const lastName = body.lastName?.trim();
  const password = body.password;
  const role = body.role ?? 'customer';
  const branchId = body.branchId ?? null;

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw httpError(422, 'A valid email is required');
  if (!firstName || !lastName) throw httpError(422, 'First and last name are required');
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    throw httpError(422, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (!ALL_ROLES.has(role)) throw httpError(422, 'Invalid role');
  if (branchId !== null && typeof branchId !== 'string') throw httpError(422, 'branchId must be a string or null');
  if ((role === 'branch_manager' || role === 'cashier') && !branchId) {
    throw httpError(422, 'A branch is required for branch managers and cashiers');
  }
  if (role === 'customer' && branchId) throw httpError(422, 'Customers cannot be assigned to a branch');

  return { email, firstName, lastName, password, role, branchId };
}

authRouter.post('/register', optionalAuth, async (request, response, next) => {
  try {
    const registration = parseRegistration(request.body ?? {});
    const isStaff = STAFF_ROLES.has(registration.role);

    if (isStaff && request.user?.role !== 'owner') {
      throw httpError(request.user ? 403 : 401, 'Only an owner can create staff accounts');
    }

    if (registration.branchId) {
      const branch = await prisma.branch.findUnique({ where: { id: registration.branchId } });
      if (!branch) throw httpError(422, 'Assigned branch does not exist');
    }

    const existing = await prisma.user.findUnique({ where: { email: registration.email } });
    if (existing) throw httpError(409, 'An account with that email already exists');

    const { password, ...userDetails } = registration;
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { ...userDetails, passwordHash },
    });

    const result = { user: publicUser(user) };
    // Customers may immediately authenticate after self-registration; staff use the normal login flow.
    if (registration.role === 'customer') result.accessToken = signAccessToken(user);
    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (request, response, next) => {
  try {
    const email = request.body?.email?.trim().toLowerCase();
    const password = request.body?.password;
    if (!email || typeof password !== 'string') throw httpError(422, 'Email and password are required');

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw httpError(401, 'Invalid email or password');
    }

    response.status(200).json({ accessToken: signAccessToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, (request, response) => {
  response.status(200).json({ user: publicUser(request.user) });
});

export default authRouter;
