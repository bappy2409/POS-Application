BEGIN TRY

BEGIN TRAN;

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

CREATE TABLE [dbo].[branches] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(150) NOT NULL,
    [code] NVARCHAR(32) NOT NULL,
    [address] NVARCHAR(500),
    [isActive] BIT NOT NULL CONSTRAINT [branches_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [branches_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [branches_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [branches_code_key] UNIQUE NONCLUSTERED ([code])
);

CREATE TABLE [dbo].[users] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [email] NVARCHAR(320) NOT NULL,
    [firstName] NVARCHAR(100) NOT NULL,
    [lastName] NVARCHAR(100) NOT NULL,
    [passwordHash] NVARCHAR(255) NOT NULL,
    [role] NVARCHAR(32) NOT NULL CONSTRAINT [users_role_df] DEFAULT 'cashier',
    [branchId] UNIQUEIDENTIFIER,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [users_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_email_key] UNIQUE NONCLUSTERED ([email]),
    CONSTRAINT [users_role_check] CHECK ([role] IN ('owner', 'branch_manager', 'cashier', 'customer'))
);

CREATE TABLE [dbo].[products] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [description] NVARCHAR(max),
    [basePriceCents] INT NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [products_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [products_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [products_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [products_basePriceCents_check] CHECK ([basePriceCents] >= 0)
);

CREATE TABLE [dbo].[product_variants] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [productId] UNIQUEIDENTIFIER NOT NULL,
    [size] NVARCHAR(50),
    [color] NVARCHAR(50),
    [sku] NVARCHAR(100) NOT NULL,
    [priceOverrideCents] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [product_variants_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [product_variants_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [product_variants_sku_key] UNIQUE NONCLUSTERED ([sku]),
    CONSTRAINT [product_variants_priceOverrideCents_check] CHECK ([priceOverrideCents] IS NULL OR [priceOverrideCents] >= 0)
);

CREATE TABLE [dbo].[inventory] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [productVariantId] UNIQUEIDENTIFIER NOT NULL,
    [branchId] UNIQUEIDENTIFIER,
    [quantity] INT NOT NULL CONSTRAINT [inventory_quantity_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [inventory_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [inventory_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [inventory_productVariantId_branchId_key] UNIQUE NONCLUSTERED ([productVariantId], [branchId]),
    CONSTRAINT [inventory_quantity_check] CHECK ([quantity] >= 0)
);

CREATE TABLE [dbo].[orders] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [channel] NVARCHAR(16) NOT NULL CONSTRAINT [orders_channel_df] DEFAULT 'pos',
    [branchId] UNIQUEIDENTIFIER,
    [status] NVARCHAR(32) NOT NULL CONSTRAINT [orders_status_df] DEFAULT 'pending',
    [totalCents] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [orders_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [orders_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [orders_channel_check] CHECK ([channel] IN ('pos', 'online')),
    CONSTRAINT [orders_status_check] CHECK ([status] IN ('pending', 'completed', 'cancelled', 'refunded')),
    CONSTRAINT [orders_totalCents_check] CHECK ([totalCents] >= 0)
);

CREATE TABLE [dbo].[order_items] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [orderId] UNIQUEIDENTIFIER NOT NULL,
    [variantId] UNIQUEIDENTIFIER NOT NULL,
    [qty] INT NOT NULL,
    [priceAtSaleCents] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [order_items_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [order_items_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [order_items_qty_check] CHECK ([qty] > 0),
    CONSTRAINT [order_items_priceAtSaleCents_check] CHECK ([priceAtSaleCents] >= 0)
);

CREATE TABLE [dbo].[payments] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [orderId] UNIQUEIDENTIFIER NOT NULL,
    [method] NVARCHAR(32) NOT NULL,
    [amountCents] INT NOT NULL,
    [status] NVARCHAR(32) NOT NULL CONSTRAINT [payments_status_df] DEFAULT 'pending',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [payments_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [payments_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [payments_method_check] CHECK ([method] IN ('cash', 'card', 'bank_transfer', 'other')),
    CONSTRAINT [payments_status_check] CHECK ([status] IN ('pending', 'completed', 'failed', 'refunded')),
    CONSTRAINT [payments_amountCents_check] CHECK ([amountCents] >= 0)
);

CREATE NONCLUSTERED INDEX [users_branchId_idx] ON [dbo].[users]([branchId]);
CREATE NONCLUSTERED INDEX [products_isActive_idx] ON [dbo].[products]([isActive]);
CREATE NONCLUSTERED INDEX [product_variants_productId_idx] ON [dbo].[product_variants]([productId]);
CREATE NONCLUSTERED INDEX [inventory_branchId_idx] ON [dbo].[inventory]([branchId]);
CREATE NONCLUSTERED INDEX [orders_branchId_createdAt_idx] ON [dbo].[orders]([branchId], [createdAt]);
CREATE NONCLUSTERED INDEX [orders_channel_createdAt_idx] ON [dbo].[orders]([channel], [createdAt]);
CREATE NONCLUSTERED INDEX [orders_status_idx] ON [dbo].[orders]([status]);
CREATE NONCLUSTERED INDEX [order_items_orderId_idx] ON [dbo].[order_items]([orderId]);
CREATE NONCLUSTERED INDEX [order_items_variantId_idx] ON [dbo].[order_items]([variantId]);
CREATE NONCLUSTERED INDEX [payments_orderId_idx] ON [dbo].[payments]([orderId]);
CREATE NONCLUSTERED INDEX [payments_status_idx] ON [dbo].[payments]([status]);

ALTER TABLE [dbo].[users] ADD CONSTRAINT [users_branchId_fkey] FOREIGN KEY ([branchId]) REFERENCES [dbo].[branches]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE [dbo].[product_variants] ADD CONSTRAINT [product_variants_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[products]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE [dbo].[inventory] ADD CONSTRAINT [inventory_productVariantId_fkey] FOREIGN KEY ([productVariantId]) REFERENCES [dbo].[product_variants]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE [dbo].[inventory] ADD CONSTRAINT [inventory_branchId_fkey] FOREIGN KEY ([branchId]) REFERENCES [dbo].[branches]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE [dbo].[orders] ADD CONSTRAINT [orders_branchId_fkey] FOREIGN KEY ([branchId]) REFERENCES [dbo].[branches]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE [dbo].[order_items] ADD CONSTRAINT [order_items_orderId_fkey] FOREIGN KEY ([orderId]) REFERENCES [dbo].[orders]([id]) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE [dbo].[order_items] ADD CONSTRAINT [order_items_variantId_fkey] FOREIGN KEY ([variantId]) REFERENCES [dbo].[product_variants]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE [dbo].[payments] ADD CONSTRAINT [payments_orderId_fkey] FOREIGN KEY ([orderId]) REFERENCES [dbo].[orders]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW;

END CATCH
