BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[product_variants]
ADD [lowStockThreshold] INT NOT NULL CONSTRAINT [product_variants_lowStockThreshold_df] DEFAULT 0;

ALTER TABLE [dbo].[product_variants]
ADD CONSTRAINT [product_variants_lowStockThreshold_check] CHECK ([lowStockThreshold] >= 0);

CREATE TABLE [dbo].[inventory_adjustments] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [inventoryId] UNIQUEIDENTIFIER NOT NULL,
    [adjustedByUserId] UNIQUEIDENTIFIER NOT NULL,
    [quantityDelta] INT NOT NULL,
    [reason] NVARCHAR(500) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [inventory_adjustments_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [inventory_adjustments_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE NONCLUSTERED INDEX [inventory_adjustments_inventoryId_createdAt_idx]
ON [dbo].[inventory_adjustments]([inventoryId], [createdAt]);

CREATE NONCLUSTERED INDEX [inventory_adjustments_adjustedByUserId_idx]
ON [dbo].[inventory_adjustments]([adjustedByUserId]);

ALTER TABLE [dbo].[inventory_adjustments]
ADD CONSTRAINT [inventory_adjustments_inventoryId_fkey]
FOREIGN KEY ([inventoryId]) REFERENCES [dbo].[inventory]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[inventory_adjustments]
ADD CONSTRAINT [inventory_adjustments_adjustedByUserId_fkey]
FOREIGN KEY ([adjustedByUserId]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW;

END CATCH
