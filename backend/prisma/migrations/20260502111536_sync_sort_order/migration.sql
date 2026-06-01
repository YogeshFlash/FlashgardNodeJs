/*
  Warnings:

  - You are about to drop the column `expires_at` on the `cut_credits` table. All the data in the column will be lost.
  - You are about to drop the column `cut_type_id` on the `model_cut_files` table. All the data in the column will be lost.
  - You are about to drop the column `device_type_id` on the `models` table. All the data in the column will be lost.
  - You are about to drop the `cut_credit_transfers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cut_types` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `device_types` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `software_license_batches` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `software_license_transfers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `software_licenses` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[model_id,cut_pattern_id]` on the table `model_cut_files` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,brand_id,category_id]` on the table `models` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cut_pattern_id` to the `model_cut_files` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category_id` to the `models` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrgLicenseStatus" AS ENUM ('AVAILABLE', 'ACTIVE', 'REVOKED', 'IN_TRANSIT', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED', 'RECALLED');

-- CreateEnum
CREATE TYPE "OrgLicenseType" AS ENUM ('BASIC', 'ADVANCED', 'PRO');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CreditStatus" ADD VALUE 'IN_TRANSIT';
ALTER TYPE "CreditStatus" ADD VALUE 'SUSPENDED';
ALTER TYPE "CreditStatus" ADD VALUE 'CONSUMED';

-- DropForeignKey
ALTER TABLE "cut_credit_transfers" DROP CONSTRAINT "cut_credit_transfers_credit_id_fkey";

-- DropForeignKey
ALTER TABLE "cut_credit_transfers" DROP CONSTRAINT "cut_credit_transfers_from_org_id_fkey";

-- DropForeignKey
ALTER TABLE "cut_credit_transfers" DROP CONSTRAINT "cut_credit_transfers_to_org_id_fkey";

-- DropForeignKey
ALTER TABLE "device_types" DROP CONSTRAINT "device_types_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "model_cut_files" DROP CONSTRAINT "model_cut_files_cut_type_id_fkey";

-- DropForeignKey
ALTER TABLE "models" DROP CONSTRAINT "models_device_type_id_fkey";

-- DropForeignKey
ALTER TABLE "software_license_transfers" DROP CONSTRAINT "software_license_transfers_from_org_id_fkey";

-- DropForeignKey
ALTER TABLE "software_license_transfers" DROP CONSTRAINT "software_license_transfers_license_id_fkey";

-- DropForeignKey
ALTER TABLE "software_license_transfers" DROP CONSTRAINT "software_license_transfers_to_org_id_fkey";

-- DropForeignKey
ALTER TABLE "software_licenses" DROP CONSTRAINT "software_licenses_batch_id_fkey";

-- DropForeignKey
ALTER TABLE "software_licenses" DROP CONSTRAINT "software_licenses_owner_id_fkey";

-- DropIndex
DROP INDEX "model_cut_files_model_id_cut_type_id_key";

-- DropIndex
DROP INDEX "models_name_brand_id_device_type_id_key";

-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "icon_url" VARCHAR(255),
ADD COLUMN     "image_url" VARCHAR(255),
ADD COLUMN     "legacy_id" INTEGER,
ADD COLUMN     "legacy_parent_id" INTEGER,
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "cut_credit_batches" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "cut_credits" DROP COLUMN "expires_at",
ADD COLUMN     "device_hash" VARCHAR(255),
ADD COLUMN     "expiry_date" TIMESTAMP(3),
ADD COLUMN     "geo_city" VARCHAR(100),
ADD COLUMN     "geo_country" VARCHAR(100),
ADD COLUMN     "license_id" UUID,
ADD COLUMN     "mac_address" VARCHAR(100),
ADD COLUMN     "start_date" TIMESTAMP(3),
ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "film_types" ADD COLUMN     "layers" INTEGER DEFAULT 1,
ADD COLUMN     "min_force" DECIMAL(10,2),
ADD COLUMN     "min_speed" DECIMAL(10,2),
ADD COLUMN     "thickness" DECIMAL(10,3);

-- AlterTable
ALTER TABLE "model_cut_files" DROP COLUMN "cut_type_id",
ADD COLUMN     "cut_pattern_id" UUID NOT NULL,
ADD COLUMN     "legacy_id" INTEGER,
ADD COLUMN     "legacy_parent_id" INTEGER;

-- AlterTable
ALTER TABLE "models" DROP COLUMN "device_type_id",
ADD COLUMN     "category_id" UUID NOT NULL,
ADD COLUMN     "icon_url" VARCHAR(255),
ADD COLUMN     "image_url" VARCHAR(255),
ADD COLUMN     "legacy_id" INTEGER,
ADD COLUMN     "legacy_parent_id" INTEGER,
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "cut_credit_transfers";

-- DropTable
DROP TABLE "cut_types";

-- DropTable
DROP TABLE "device_types";

-- DropTable
DROP TABLE "software_license_batches";

-- DropTable
DROP TABLE "software_license_transfers";

-- DropTable
DROP TABLE "software_licenses";

-- DropEnum
DROP TYPE "SoftwareLicenseStatus";

-- DropEnum
DROP TYPE "SoftwareLicenseType";

-- CreateTable
CREATE TABLE "model_categories" (
    "id" UUID NOT NULL,
    "parent_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "legacy_id" INTEGER,
    "legacy_parent_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "icon_url" VARCHAR(255),
    "image_url" VARCHAR(255),
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "model_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cut_patterns" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "legacy_id" INTEGER,
    "legacy_parent_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "can_print_n_cut" BOOLEAN NOT NULL DEFAULT false,
    "can_decal_cut" BOOLEAN NOT NULL DEFAULT false,
    "cut_for" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cut_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_license_batches" (
    "id" UUID NOT NULL,
    "batch_code" VARCHAR(50) NOT NULL,
    "license_type" "OrgLicenseType" NOT NULL,
    "description" TEXT,
    "total_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "tenant_id" UUID,

    CONSTRAINT "org_license_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_licenses" (
    "id" UUID NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "batch_id" UUID NOT NULL,
    "status" "OrgLicenseStatus" NOT NULL DEFAULT 'AVAILABLE',
    "owner_id" UUID NOT NULL,
    "activated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "device_hash" VARCHAR(255),
    "expiry_date" TIMESTAMP(3),
    "geo_city" VARCHAR(100),
    "geo_country" VARCHAR(100),
    "mac_address" VARCHAR(100),
    "machine_id" VARCHAR(100),
    "start_date" TIMESTAMP(3),
    "tenant_id" UUID,

    CONSTRAINT "org_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licensing_transfers" (
    "id" UUID NOT NULL,
    "from_org_id" UUID NOT NULL,
    "to_org_id" UUID NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" UUID,
    "tenant_id" UUID,

    CONSTRAINT "licensing_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licensing_transfer_items" (
    "id" UUID NOT NULL,
    "transfer_id" UUID NOT NULL,
    "license_id" UUID,
    "credit_id" UUID,

    CONSTRAINT "licensing_transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_wallets" (
    "id" UUID NOT NULL,
    "machine_id" VARCHAR(100),
    "org_id" UUID,
    "total_credits" INTEGER NOT NULL DEFAULT 0,
    "used_credits" INTEGER NOT NULL DEFAULT 0,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "last_recharged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tenant_id" UUID,

    CONSTRAINT "entity_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "source" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" UUID,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_alerts" (
    "id" UUID NOT NULL,
    "license_id" UUID,
    "credit_id" UUID,
    "attempted_fingerprint" JSONB NOT NULL,
    "stored_fingerprint" JSONB,
    "ip_address" VARCHAR(45),
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" UUID,

    CONSTRAINT "security_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "model_categories_name_parent_id_key" ON "model_categories"("name", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "cut_patterns_name_key" ON "cut_patterns"("name");

-- CreateIndex
CREATE UNIQUE INDEX "org_license_batches_batch_code_key" ON "org_license_batches"("batch_code");

-- CreateIndex
CREATE UNIQUE INDEX "org_licenses_key_key" ON "org_licenses"("key");

-- CreateIndex
CREATE INDEX "org_licenses_owner_id_idx" ON "org_licenses"("owner_id");

-- CreateIndex
CREATE INDEX "org_licenses_status_idx" ON "org_licenses"("status");

-- CreateIndex
CREATE INDEX "org_licenses_batch_id_idx" ON "org_licenses"("batch_id");

-- CreateIndex
CREATE INDEX "org_licenses_tenant_id_idx" ON "org_licenses"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "entity_wallets_machine_id_key" ON "entity_wallets"("machine_id");

-- CreateIndex
CREATE UNIQUE INDEX "entity_wallets_org_id_key" ON "entity_wallets"("org_id");

-- CreateIndex
CREATE INDEX "cut_credits_owner_id_idx" ON "cut_credits"("owner_id");

-- CreateIndex
CREATE INDEX "cut_credits_status_idx" ON "cut_credits"("status");

-- CreateIndex
CREATE INDEX "cut_credits_batch_id_idx" ON "cut_credits"("batch_id");

-- CreateIndex
CREATE INDEX "cut_credits_tenant_id_idx" ON "cut_credits"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "model_cut_files_model_id_cut_pattern_id_key" ON "model_cut_files"("model_id", "cut_pattern_id");

-- CreateIndex
CREATE UNIQUE INDEX "models_name_brand_id_category_id_key" ON "models"("name", "brand_id", "category_id");

-- AddForeignKey
ALTER TABLE "model_categories" ADD CONSTRAINT "model_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "model_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "models" ADD CONSTRAINT "models_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "model_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_cut_files" ADD CONSTRAINT "model_cut_files_cut_pattern_id_fkey" FOREIGN KEY ("cut_pattern_id") REFERENCES "cut_patterns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_license_batches" ADD CONSTRAINT "org_license_batches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_licenses" ADD CONSTRAINT "org_licenses_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "org_license_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_licenses" ADD CONSTRAINT "org_licenses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_licenses" ADD CONSTRAINT "org_licenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licensing_transfers" ADD CONSTRAINT "licensing_transfers_from_org_id_fkey" FOREIGN KEY ("from_org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licensing_transfers" ADD CONSTRAINT "licensing_transfers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licensing_transfers" ADD CONSTRAINT "licensing_transfers_to_org_id_fkey" FOREIGN KEY ("to_org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licensing_transfer_items" ADD CONSTRAINT "licensing_transfer_items_credit_id_fkey" FOREIGN KEY ("credit_id") REFERENCES "cut_credits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licensing_transfer_items" ADD CONSTRAINT "licensing_transfer_items_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "org_licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licensing_transfer_items" ADD CONSTRAINT "licensing_transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "licensing_transfers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_credit_batches" ADD CONSTRAINT "cut_credit_batches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_credits" ADD CONSTRAINT "cut_credits_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "org_licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_credits" ADD CONSTRAINT "cut_credits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_wallets" ADD CONSTRAINT "entity_wallets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "entity_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_alerts" ADD CONSTRAINT "security_alerts_credit_id_fkey" FOREIGN KEY ("credit_id") REFERENCES "cut_credits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_alerts" ADD CONSTRAINT "security_alerts_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "org_licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_alerts" ADD CONSTRAINT "security_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
