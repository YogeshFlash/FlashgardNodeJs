/*
  Warnings:

  - You are about to drop the column `quantity` on the `dispatch_order_items` table. All the data in the column will be lost.
  - Added the required column `quantity_dispatched` to the `dispatch_order_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "dispatch_order_items" DROP COLUMN "quantity",
ADD COLUMN     "quantity_dispatched" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "quantity_received" DOUBLE PRECISION NOT NULL DEFAULT 0;
