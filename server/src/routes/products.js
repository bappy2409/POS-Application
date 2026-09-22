import { Router } from 'express';

import prisma from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const productRouter = Router();
const writers = [requireAuth, requireRole('owner', 'branch_manager')];

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function integerCents(value, field, { nullable = false } = {}) {
  if (nullable && (value === null || value === '')) return null;
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(number) || number < 0) throw httpError(422, `${field} must be a non-negative whole number of cents`);
  return number;
}

function nonNegativeInteger(value, field) {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(number) || number < 0) throw httpError(422, `${field} must be a non-negative whole number`);
  return number;
}

function text(value, field, { nullable = false, max = 200 } = {}) {
  if (nullable && (value === null || value === '')) return null;
  if (typeof value !== 'string' || !value.trim()) throw httpError(422, `${field} is required`);
  const normalized = value.trim();
  if (normalized.length > max) throw httpError(422, `${field} is too long`);
  return normalized;
}

function productData(body, { partial = false } = {}) {
  const data = {};
  if (!partial || 'name' in body) data.name = text(body.name, 'Product name');
  if (!partial || 'basePriceCents' in body) data.basePriceCents = integerCents(body.basePriceCents, 'Base price');
  if ('description' in body) data.description = text(body.description, 'Description', { nullable: true, max: 4000 });
  if ('isActive' in body) {
    if (typeof body.isActive !== 'boolean') throw httpError(422, 'isActive must be true or false');
    data.isActive = body.isActive;
  }
  return data;
}

function variantData(body, { partial = false } = {}) {
  const data = {};
  if (!partial || 'sku' in body) data.sku = text(body.sku, 'SKU', { max: 100 }).toUpperCase();
  if ('size' in body) data.size = text(body.size, 'Size', { nullable: true, max: 50 });
  if ('color' in body) data.color = text(body.color, 'Color', { nullable: true, max: 50 });
  if ('priceOverrideCents' in body) data.priceOverrideCents = integerCents(body.priceOverrideCents, 'Price override', { nullable: true });
  if (!partial || 'lowStockThreshold' in body) data.lowStockThreshold = nonNegativeInteger(body.lowStockThreshold ?? 0, 'Low-stock threshold');
  return data;
}

productRouter.get('/', requireAuth, async (_request, response, next) => {
  try {
    const products = await prisma.product.findMany({
      include: { variants: { orderBy: { sku: 'asc' } } },
      orderBy: { name: 'asc' },
    });
    response.json({ products });
  } catch (error) { next(error); }
});

productRouter.get('/:id', requireAuth, async (request, response, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: request.params.id },
      include: { variants: { orderBy: { sku: 'asc' } } },
    });
    if (!product) throw httpError(404, 'Product not found');
    response.json({ product });
  } catch (error) { next(error); }
});

productRouter.post('/', ...writers, async (request, response, next) => {
  try {
    const product = await prisma.product.create({ data: productData(request.body ?? {}) });
    response.status(201).json({ product });
  } catch (error) { next(error); }
});

productRouter.patch('/:id', ...writers, async (request, response, next) => {
  try {
    const data = productData(request.body ?? {}, { partial: true });
    if (!Object.keys(data).length) throw httpError(422, 'Provide at least one field to update');
    const product = await prisma.product.update({ where: { id: request.params.id }, data });
    response.json({ product });
  } catch (error) { next(error); }
});

productRouter.delete('/:id', ...writers, async (request, response, next) => {
  try {
    await prisma.product.delete({ where: { id: request.params.id } });
    response.status(204).end();
  } catch (error) { next(error); }
});

productRouter.get('/:productId/variants', requireAuth, async (request, response, next) => {
  try {
    const variants = await prisma.productVariant.findMany({
      where: { productId: request.params.productId },
      orderBy: { sku: 'asc' },
    });
    response.json({ variants });
  } catch (error) { next(error); }
});

productRouter.post('/:productId/variants', ...writers, async (request, response, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: request.params.productId }, select: { id: true } });
    if (!product) throw httpError(404, 'Product not found');
    const variant = await prisma.productVariant.create({
      data: { ...variantData(request.body ?? {}), productId: product.id },
    });
    response.status(201).json({ variant });
  } catch (error) { next(error); }
});

productRouter.patch('/:productId/variants/:variantId', ...writers, async (request, response, next) => {
  try {
    const data = variantData(request.body ?? {}, { partial: true });
    if (!Object.keys(data).length) throw httpError(422, 'Provide at least one field to update');
    const existing = await prisma.productVariant.findFirst({
      where: { id: request.params.variantId, productId: request.params.productId },
      select: { id: true },
    });
    if (!existing) throw httpError(404, 'Variant not found for this product');
    const variant = await prisma.productVariant.update({
      where: { id: existing.id },
      data,
    });
    response.json({ variant });
  } catch (error) { next(error); }
});

productRouter.delete('/:productId/variants/:variantId', ...writers, async (request, response, next) => {
  try {
    const variant = await prisma.productVariant.findFirst({ where: { id: request.params.variantId, productId: request.params.productId } });
    if (!variant) throw httpError(404, 'Variant not found for this product');
    await prisma.productVariant.delete({ where: { id: variant.id } });
    response.status(204).end();
  } catch (error) { next(error); }
});

export default productRouter;
