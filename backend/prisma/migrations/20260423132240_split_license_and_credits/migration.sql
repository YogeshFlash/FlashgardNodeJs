/*
  Warnings:

  - You are about to drop the `license_batches` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `license_transfers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `licenses` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SoftwareLicenseType" AS ENUM ('BASIC', 'ADVANCED', 'PRO');

-- CreateEnum
CREATE TYPE "SoftwareLicenseStatus" AS ENUM ('AVAILABLE', 'ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "CreditPlanType" AS ENUM ('USAGE', 'UNLIMITED', 'LIFETIME');

-- CreateEnum
CREATE TYPE "CreditStatus" AS ENUM ('AVAILABLE', 'ALLOCATED', 'ACTIVE', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "license_transfers" DROP CONSTRAINT "license_transfers_from_org_id_fkey";

-- DropForeignKey
ALTER TABLE "license_transfers" DROP CONSTRAINT "license_transfers_license_id_fkey";

-- DropForeignKey
ALTER TABLE "license_transfers" DROP CONSTRAINT "license_transfers_to_org_id_fkey";

-- DropForeignKey
ALTER TABLE "licenses" DROP CONSTRAINT "licenses_batch_id_fkey";

-- DropForeignKey
ALTER TABLE "licenses" DROP CONSTRAINT "licenses_owner_id_fkey";

-- DropTable
DROP TABLE "license_batches";

-- DropTable
DROP TABLE "license_transfers";

-- DropTable
DROP TABLE "licenses";

-- DropEnum
DROP TYPE "LicenseStatus";

-- DropEnum
DROP TYPE "LicenseType";

-- CreateTable
CREATE TABLE "software_license_batches" (
    "id" UUID NOT NULL,
    "batch_code" VARCHAR(50) NOT NULL,
    "license_type" "SoftwareLicenseType" NOT NULL,
    "description" TEXT,
    "total_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "software_license_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "software_licenses" (
    "id" UUID NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "batch_id" UUID NOT NULL,
    "status" "SoftwareLicenseStatus" NOT NULL DEFAULT 'AVAILABLE',
    "owner_id" UUID NOT NULL,
    "activated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "software_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "software_license_transfers" (
    "id" UUID NOT NULL,
    "license_id" UUID NOT NULL,
    "from_org_id" UUID NOT NULL,
    "to_org_id" UUID NOT NULL,
    "transferred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transferred_by" UUID NOT NULL,

    CONSTRAINT "software_license_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cut_credit_batches" (
    "id" UUID NOT NULL,
    "batch_code" VARCHAR(50) NOT NULL,
    "plan_type" "CreditPlanType" NOT NULL,
    "total_count" INTEGER NOT NULL,
    "credits_per_key" INTEGER,
    "validity_days" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "cut_credit_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cut_credits" (
    "id" UUID NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "batch_id" UUID NOT NULL,
    "status" "CreditStatus" NOT NULL DEFAULT 'AVAILABLE',
    "owner_id" UUID NOT NULL,
    "machine_id" VARCHAR(100),
    "remaining_credits" INTEGER,
    "activated_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cut_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cut_credit_transfers" (
    "id" UUID NOT NULL,
    "credit_id" UUID NOT NULL,
    "from_org_id" UUID NOT NULL,
    "to_org_id" UUID NOT NULL,
    "transferred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transferred_by" UUID NOT NULL,

    CONSTRAINT "cut_credit_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "software_license_batches_batch_code_key" ON "software_license_batches"("batch_code");

-- CreateIndex
CREATE UNIQUE INDEX "software_licenses_key_key" ON "software_licenses"("key");

-- CreateIndex
CREATE UNIQUE INDEX "cut_credit_batches_batch_code_key" ON "cut_credit_batches"("batch_code");

-- CreateIndex
CREATE UNIQUE INDEX "cut_credits_key_key" ON "cut_credits"("key");

-- AddForeignKey
ALTER TABLE "software_licenses" ADD CONSTRAINT "software_licenses_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "software_license_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software_licenses" ADD CONSTRAINT "software_licenses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software_license_transfers" ADD CONSTRAINT "software_license_transfers_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "software_licenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software_license_transfers" ADD CONSTRAINT "software_license_transfers_from_org_id_fkey" FOREIGN KEY ("from_org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software_license_transfers" ADD CONSTRAINT "software_license_transfers_to_org_id_fkey" FOREIGN KEY ("to_org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_credits" ADD CONSTRAINT "cut_credits_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "cut_credit_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_credits" ADD CONSTRAINT "cut_credits_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_credit_transfers" ADD CONSTRAINT "cut_credit_transfers_credit_id_fkey" FOREIGN KEY ("credit_id") REFERENCES "cut_credits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_credit_transfers" ADD CONSTRAINT "cut_credit_transfers_from_org_id_fkey" FOREIGN KEY ("from_org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_credit_transfers" ADD CONSTRAINT "cut_credit_transfers_to_org_id_fkey" FOREIGN KEY ("to_org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
