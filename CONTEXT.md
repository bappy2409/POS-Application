# Clothing Store POS — Project Context

## Scope and architecture

This repository contains the initial in-store, multi-branch clothing POS system. An online storefront is deliberately deferred until the POS is stable. The database is nevertheless designed for that expansion: orders have a `channel` field (`pos`/`online`) and orders and inventory can have a nullable `branch_id` for a future online pool.

- Backend: Node.js, Express, Prisma ORM, Microsoft SQL Server
- Frontend: React with Vite and Tailwind CSS
- Authentication: JWT; roles are `owner`, `branch_manager`, and `cashier` (`customer` is reserved for the future storefront)
- API namespace: `/api/v1/`
- Money: integer cents only; never floating-point values
- Time: UTC
- Security: every mutating endpoint must use role middleware
- Business logic: briefly comment non-obvious logic such as inventory deduction or stock synchronization

## Delivery roadmap

1. **Scaffolding (current):** create `server` and `pos-app`, local SQL Server Compose service, environment templates, health API, and frontend connectivity check.
2. **Database core:** Branch, User, Product, ProductVariant, Inventory, Order, OrderItem, and Payment schema with proper relations, indexes, and migration.
3. **Authentication:** JWT login/register, owner-only staff creation, client auth context, and protected routes.
4. **Catalog:** CRUD APIs and admin UI for branches, products, and variants.
5. **Inventory:** stock query/adjustment history and low-stock workflow.
6. **Checkout:** atomic POS order creation, inventory validation/deduction, cart, and printable receipt.
7. **Multi-branch:** role-aware branch selection and branch sales dashboard.
8. **Reporting:** owner-wide reporting, date filters, low-stock views, and charts.
9. **Deployment:** production Docker/build configuration and deployment guide.

Only begin a later phase after the current phase has been tested and accepted. The online storefront and online-stock allocation remain explicitly out of scope until the POS phases are complete.
