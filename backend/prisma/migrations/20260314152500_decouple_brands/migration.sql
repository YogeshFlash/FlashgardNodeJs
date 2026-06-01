-- DropForeignKey
ALTER TABLE "brands" DROP CONSTRAINT "brands_device_type_id_fkey";

-- DropIndex
DROP INDEX "brands_name_device_type_id_key";

-- DropIndex
DROP INDEX "models_name_brand_id_key";

-- AlterTable: Add device_type_id as nullable first
ALTER TABLE "models" ADD COLUMN "device_type_id" UUID;

-- DATA MIGRATION: Populate device_type_id from brands
UPDATE "models" m
SET "device_type_id" = b."device_type_id"
FROM "brands" b
WHERE m."brand_id" = b."id";

-- DATA MIGRATION: Merge duplicate brands
-- Update models to point to the first brand of each name (sorting by id as text)
UPDATE "models" m
SET "brand_id" = (
    SELECT MIN(b2.id::text)::uuid
    FROM "brands" b2 
    WHERE b2.name = (SELECT b3.name FROM "brands" b3 WHERE b3.id = m.brand_id)
);

-- Delete non-primary brands
DELETE FROM "brands"
WHERE "id" NOT IN (
    SELECT MIN("id"::text)::uuid
    FROM "brands" 
    GROUP BY "name"
);

-- Finalize Tables
ALTER TABLE "models" ALTER COLUMN "device_type_id" SET NOT NULL;
ALTER TABLE "brands" DROP COLUMN "device_type_id";

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_key" ON "brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "models_name_brand_id_device_type_id_key" ON "models"("name", "brand_id", "device_type_id");

-- AddForeignKey
ALTER TABLE "models" ADD CONSTRAINT "models_device_type_id_fkey" FOREIGN KEY ("device_type_id") REFERENCES "device_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
