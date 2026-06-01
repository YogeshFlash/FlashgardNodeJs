-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('SUBSCRIPTION', 'USAGE', 'LIFETIME');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('AVAILABLE', 'ALLOCATED', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "license_batches" (
    "id" UUID NOT NULL,
    "batch_code" VARCHAR(50) NOT NULL,
    "license_type" "LicenseType" NOT NULL,
    "description" TEXT,
    "total_count" INTEGER NOT NULL,
    "validity_months" INTEGER,
    "credits_per_key" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "license_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licenses" (
    "id" UUID NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "batch_id" UUID NOT NULL,
    "status" "LicenseStatus" NOT NULL DEFAULT 'AVAILABLE',
    "owner_id" UUID NOT NULL,
    "activated_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "machine_id" VARCHAR(100),
    "remaining_credits" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_transfers" (
    "id" UUID NOT NULL,
    "license_id" UUID NOT NULL,
    "from_org_id" UUID NOT NULL,
    "to_org_id" UUID NOT NULL,
    "transferred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transferred_by" UUID NOT NULL,

    CONSTRAINT "license_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "license_batches_batch_code_key" ON "license_batches"("batch_code");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_key_key" ON "licenses"("key");

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "license_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_transfers" ADD CONSTRAINT "license_transfers_from_org_id_fkey" FOREIGN KEY ("from_org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_transfers" ADD CONSTRAINT "license_transfers_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_transfers" ADD CONSTRAINT "license_transfers_to_org_id_fkey" FOREIGN KEY ("to_org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
