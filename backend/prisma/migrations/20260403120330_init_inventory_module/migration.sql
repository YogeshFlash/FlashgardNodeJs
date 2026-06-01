-- CreateEnum
CREATE TYPE "PermissionEffect" AS ENUM ('grant', 'deny');

-- CreateEnum
CREATE TYPE "BatchType" AS ENUM ('BULK_RECEIVED', 'RAW_MATERIAL', 'PACKAGED', 'WORK_ORDER_OUTPUT');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('BULK_RECEIVED', 'RAW_MATERIAL', 'PACKAGED', 'QR_APPLIED', 'IN_TRANSIT', 'AT_DISTRIBUTOR', 'AT_RETAILER');

-- CreateEnum
CREATE TYPE "WorkOrderType" AS ENUM ('REPACKAGING', 'SLITTING');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "QRType" AS ENUM ('INDIVIDUAL', 'MASTER_BOX');

-- CreateEnum
CREATE TYPE "QRStatus" AS ENUM ('CREATED', 'IN_TRANSIT', 'ASSIGNED', 'USED', 'RETURNED');

-- CreateEnum
CREATE TYPE "DispatchOrderStatus" AS ENUM ('DRAFT', 'DISPATCHED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('UNSOLD', 'DAMAGED', 'WRONG_MODEL');

-- CreateEnum
CREATE TYPE "ReturnRequestStatus" AS ENUM ('PENDING', 'DISTRIBUTOR_APPROVED', 'HQ_APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DataScope" AS ENUM ('own', 'team', 'all');

-- AlterTable
ALTER TABLE "film_types" ADD COLUMN     "requires_qr" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "vendor_id" UUID;

-- AlterTable
ALTER TABLE "role_permissions" ADD COLUMN     "data_scope" "DataScope" NOT NULL DEFAULT 'own';

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "effect" "PermissionEffect" NOT NULL,
    "data_scope" "DataScope",
    "granted_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "film_batches" (
    "id" UUID NOT NULL,
    "batch_code" VARCHAR(100) NOT NULL,
    "film_type_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "parent_batch_id" UUID,
    "quantity" DOUBLE PRECISION NOT NULL,
    "pack_size" VARCHAR(100),
    "batch_type" "BatchType" NOT NULL,
    "status" "BatchStatus" NOT NULL,
    "arrival_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "film_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" UUID NOT NULL,
    "work_order_type" "WorkOrderType" NOT NULL,
    "source_batch_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "status" "WorkOrderStatus" NOT NULL,
    "input_quantity" DOUBLE PRECISION NOT NULL,
    "output_quantity" DOUBLE PRECISION,
    "wastage_quantity" DOUBLE PRECISION,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_outputs" (
    "id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "output_batch_id" UUID NOT NULL,
    "film_type_id" UUID NOT NULL,
    "device_model" VARCHAR(255) NOT NULL,
    "pack_size" VARCHAR(100) NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "work_order_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_codes" (
    "id" UUID NOT NULL,
    "qr_type" "QRType" NOT NULL,
    "film_batch_id" UUID NOT NULL,
    "film_type_id" UUID NOT NULL,
    "device_model" VARCHAR(255),
    "status" "QRStatus" NOT NULL,
    "assigned_org_id" UUID,
    "assigned_dealer_id" UUID,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_at" TIMESTAMP(3),
    "used_at" TIMESTAMP(3),
    "returned_at" TIMESTAMP(3),

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_daily_log" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "total_generated" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "qr_daily_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_orders" (
    "id" UUID NOT NULL,
    "from_org_id" UUID NOT NULL,
    "to_org_id" UUID NOT NULL,
    "dispatch_date" TIMESTAMP(3) NOT NULL,
    "status" "DispatchOrderStatus" NOT NULL,
    "created_by" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispatch_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_order_items" (
    "id" UUID NOT NULL,
    "dispatch_order_id" UUID NOT NULL,
    "film_batch_id" UUID NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "dispatch_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_requests" (
    "id" UUID NOT NULL,
    "requesting_dealer_id" UUID NOT NULL,
    "film_batch_id" UUID NOT NULL,
    "return_reason" "ReturnReason" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "status" "ReturnRequestStatus" NOT NULL,
    "distributor_remarks" TEXT,
    "hq_remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_request_items" (
    "id" UUID NOT NULL,
    "return_request_id" UUID NOT NULL,
    "qr_code_id" UUID,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "return_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_notes" (
    "id" UUID NOT NULL,
    "return_request_id" UUID NOT NULL,
    "dealer_org_id" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_user_id_key" ON "team_members"("team_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_organization_id_user_id_permission_id_key" ON "user_permissions"("organization_id", "user_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "film_batches_batch_code_key" ON "film_batches"("batch_code");

-- CreateIndex
CREATE UNIQUE INDEX "qr_daily_log_date_key" ON "qr_daily_log"("date");

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "film_types" ADD CONSTRAINT "film_types_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "film_batches" ADD CONSTRAINT "film_batches_film_type_id_fkey" FOREIGN KEY ("film_type_id") REFERENCES "film_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "film_batches" ADD CONSTRAINT "film_batches_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "film_batches" ADD CONSTRAINT "film_batches_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "film_batches" ADD CONSTRAINT "film_batches_parent_batch_id_fkey" FOREIGN KEY ("parent_batch_id") REFERENCES "film_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_source_batch_id_fkey" FOREIGN KEY ("source_batch_id") REFERENCES "film_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_outputs" ADD CONSTRAINT "work_order_outputs_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_outputs" ADD CONSTRAINT "work_order_outputs_output_batch_id_fkey" FOREIGN KEY ("output_batch_id") REFERENCES "film_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_outputs" ADD CONSTRAINT "work_order_outputs_film_type_id_fkey" FOREIGN KEY ("film_type_id") REFERENCES "film_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_film_batch_id_fkey" FOREIGN KEY ("film_batch_id") REFERENCES "film_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_film_type_id_fkey" FOREIGN KEY ("film_type_id") REFERENCES "film_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_assigned_org_id_fkey" FOREIGN KEY ("assigned_org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_assigned_dealer_id_fkey" FOREIGN KEY ("assigned_dealer_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_orders" ADD CONSTRAINT "dispatch_orders_from_org_id_fkey" FOREIGN KEY ("from_org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_orders" ADD CONSTRAINT "dispatch_orders_to_org_id_fkey" FOREIGN KEY ("to_org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_orders" ADD CONSTRAINT "dispatch_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_order_items" ADD CONSTRAINT "dispatch_order_items_dispatch_order_id_fkey" FOREIGN KEY ("dispatch_order_id") REFERENCES "dispatch_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_order_items" ADD CONSTRAINT "dispatch_order_items_film_batch_id_fkey" FOREIGN KEY ("film_batch_id") REFERENCES "film_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_requesting_dealer_id_fkey" FOREIGN KEY ("requesting_dealer_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_film_batch_id_fkey" FOREIGN KEY ("film_batch_id") REFERENCES "film_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_request_items" ADD CONSTRAINT "return_request_items_return_request_id_fkey" FOREIGN KEY ("return_request_id") REFERENCES "return_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_request_items" ADD CONSTRAINT "return_request_items_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "qr_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_return_request_id_fkey" FOREIGN KEY ("return_request_id") REFERENCES "return_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_dealer_org_id_fkey" FOREIGN KEY ("dealer_org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
