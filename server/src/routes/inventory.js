import { Router } from 'express';

import prisma from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const inventoryRouter = Router();

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseBranchId(request) {
  const value = request.query.branch_id;
  if (value !== undefined && typeof value !== 'string') throw httpError(422, 'branch_id must be a string');
  const branchId = value === 'online' ? null : value;

  if (request.user.role === 'cashier') {
    if (!request.user.branchId) throw httpError(403, 'Cashier account is not assigned to a branch');
    if (branchId !== undefined && branchId !== request.user.branchId) throw httpError(403, 'Cashiers can only access their assigned branch');
    return request.user.branchId;
  }
  return branchId;
}

function inventoryRows(variants, branchId) {
  return variants.flatMap((variant) => {
    if (branchId === undefined) {
      return variant.inventory.map((inventory) => ({
        ...inventory,
        productVariant: { id: variant.id, sku: variant.sku, size: variant.size, color: variant.color, lowStockThreshold: variant.lowStockThreshold, product: variant.product },
      }));
    }
    const inventory = variant.inventory[0] ?? null;
    return [{
      id: inventory?.id ?? null,
      branchId,
      quantity: inventory?.quantity ?? 0,
      productVariant: { id: variant.id, sku: variant.sku, size: variant.size, color: variant.color, lowStockThreshold: variant.lowStockThreshold, product: variant.product },
    }];
  });
}

async function getStock(branchId) {
  const inventoryFilter = branchId === undefined ? {} : { branchId };
  const variants = await prisma.productVariant.findMany({
    include: {
      product: { select: { id: true, name: true, isActive: true } },
      inventory: { where: inventoryFilter, select: { id: true, branchId: true, quantity: true, updatedAt: true } },
    },
    orderBy: { sku: 'asc' },
  });
  return inventoryRows(variants, branchId);
}

inventoryRouter.get('/low-stock', requireAuth, async (request, response, next) => {
  try {
    const branchId = parseBranchId(request);
    const inventory = await getStock(branchId);
    const lowStock = inventory.filter((row) => row.productVariant.lowStockThreshold > 0 && row.quantity <= row.productVariant.lowStockThreshold);
    response.json({ inventory: lowStock });
  } catch (error) { next(error); }
});

inventoryRouter.get('/', requireAuth, async (request, response, next) => {
  try {
    const branchId = parseBranchId(request);
    const inventory = await getStock(branchId);
    response.json({ inventory });
  } catch (error) { next(error); }
});

inventoryRouter.post('/adjust', requireAuth, requireRole('owner', 'branch_manager'), async (request, response, next) => {
  try {
    const { productVariantId, branchId = null, quantityDelta, reason } = request.body ?? {};
    if (typeof productVariantId !== 'string' || !productVariantId) throw httpError(422, 'productVariantId is required');
    if (branchId !== null && typeof branchId !== 'string') throw httpError(422, 'branchId must be a string or null');
    if (!Number.isSafeInteger(quantityDelta) || quantityDelta === 0) throw httpError(422, 'quantityDelta must be a non-zero whole number');
    if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500) throw httpError(422, 'Reason is required and must be at most 500 characters');

    if (branchId) {
      const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } });
      if (!branch) throw httpError(422, 'Branch does not exist');
    }

    const adjustment = await prisma.$transaction(async (transaction) => {
      const variant = await transaction.productVariant.findUnique({ where: { id: productVariantId }, select: { id: true } });
      if (!variant) throw httpError(404, 'Product variant not found');

      const existing = await transaction.inventory.findFirst({ where: { productVariantId, branchId } });
      const nextQuantity = (existing?.quantity ?? 0) + quantityDelta;
      if (nextQuantity < 0) throw httpError(422, 'Adjustment would make inventory negative');

      // Serializable transactions keep the read, quantity update, and audit record atomic.
      const inventory = existing
        ? await transaction.inventory.update({ where: { id: existing.id }, data: { quantity: nextQuantity } })
        : await transaction.inventory.create({ data: { productVariantId, branchId, quantity: nextQuantity } });

      return transaction.inventoryAdjustment.create({
        data: { inventoryId: inventory.id, adjustedByUserId: request.user.id, quantityDelta, reason: reason.trim() },
        include: { inventory: true },
      });
    }, { isolationLevel: 'Serializable' });

    response.status(201).json({ adjustment });
  } catch (error) { next(error); }
});

export default inventoryRouter;
