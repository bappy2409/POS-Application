import { Router } from 'express';

import prisma from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const branchRouter = Router();

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function branchData(body, { partial = false } = {}) {
  const data = {};
  if (!partial || 'name' in body) {
    const name = body.name?.trim();
    if (!name) throw httpError(422, 'Branch name is required');
    data.name = name;
  }
  if (!partial || 'code' in body) {
    const code = body.code?.trim().toUpperCase();
    if (!code || !/^[A-Z0-9_-]{2,32}$/.test(code)) throw httpError(422, 'Branch code must be 2–32 letters, numbers, hyphens, or underscores');
    data.code = code;
  }
  if ('address' in body) {
    if (body.address !== null && typeof body.address !== 'string') throw httpError(422, 'Address must be text or null');
    data.address = body.address?.trim() || null;
  }
  if ('isActive' in body) {
    if (typeof body.isActive !== 'boolean') throw httpError(422, 'isActive must be true or false');
    data.isActive = body.isActive;
  }
  return data;
}

branchRouter.get('/', requireAuth, async (_request, response, next) => {
  try {
    const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
    response.json({ branches });
  } catch (error) { next(error); }
});

branchRouter.get('/:id', requireAuth, async (request, response, next) => {
  try {
    const branch = await prisma.branch.findUnique({ where: { id: request.params.id } });
    if (!branch) throw httpError(404, 'Branch not found');
    response.json({ branch });
  } catch (error) { next(error); }
});

branchRouter.post('/', requireAuth, requireRole('owner', 'branch_manager'), async (request, response, next) => {
  try {
    const branch = await prisma.branch.create({ data: branchData(request.body ?? {}) });
    response.status(201).json({ branch });
  } catch (error) { next(error); }
});

branchRouter.patch('/:id', requireAuth, requireRole('owner', 'branch_manager'), async (request, response, next) => {
  try {
    const data = branchData(request.body ?? {}, { partial: true });
    if (!Object.keys(data).length) throw httpError(422, 'Provide at least one field to update');
    const branch = await prisma.branch.update({ where: { id: request.params.id }, data });
    response.json({ branch });
  } catch (error) { next(error); }
});

branchRouter.delete('/:id', requireAuth, requireRole('owner', 'branch_manager'), async (request, response, next) => {
  try {
    await prisma.branch.delete({ where: { id: request.params.id } });
    response.status(204).end();
  } catch (error) { next(error); }
});

export default branchRouter;
