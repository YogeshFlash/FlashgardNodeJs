-- AlterTable
ALTER TABLE "film_batches" ADD COLUMN     "inward_receipt_id" UUID,
ADD COLUMN     "roll_length" DOUBLE PRECISION,
ADD COLUMN     "roll_width" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "qr_codes" ADD COLUMN     "parent_id" UUID;

-- CreateTable
CREATE TABLE "inward_receipts" (
    "id" UUID NOT NULL,
    "receipt_code" VARCHAR(100) NOT NULL,
    "vendor_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "invoice_number" VARCHAR(100),
    "received_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inward_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inward_receipts_receipt_code_key" ON "inward_receipts"("receipt_code");

-- AddForeignKey
ALTER TABLE "inward_receipts" ADD CONSTRAINT "inward_receipts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inward_receipts" ADD CONSTRAINT "inward_receipts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "film_batches" ADD CONSTRAINT "film_batches_inward_receipt_id_fkey" FOREIGN KEY ("inward_receipt_id") REFERENCES "inward_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "qr_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
