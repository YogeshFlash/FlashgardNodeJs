import * as sql from 'mssql';
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import csv from 'csv-parser';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { encryptLicenseKey } from '../utils/encryption';

const ENCRYPTION_KEY = 'flashgard-secure-plt-data-key-32';
const IV_LENGTH = 16;

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(private prisma: PrismaService) {}

  private async executeBatchRaw(batch: any[]) {
    if (batch.length === 0) return;
    const valuesPlaceholders: string[] = [];
    const queryValues: any[] = [];
    let valIdx = 1;

    for (const item of batch) {
      const id = crypto.randomUUID();
      queryValues.push(
        id,
        item.appUniqueId,
        item.licenseId,
        item.modelId,
        item.modelCutFileId,
        item.organizationId,
        item.userId,
        item.brandName,
        item.modelName,
        item.patternName,
        item.qrCode,
        item.instruction,
        item.plotterId,
        item.latitude,
        item.longitude,
        item.isPositiveCut,
        item.reviews,
        item.createdAt
      );
      valuesPlaceholders.push(
        `($${valIdx}::uuid, $${valIdx + 1}, $${valIdx + 2}::uuid, $${valIdx + 3}::uuid, $${valIdx + 4}::uuid, $${valIdx + 5}::uuid, $${valIdx + 6}::uuid, $${valIdx + 7}, $${valIdx + 8}, $${valIdx + 9}, $${valIdx + 10}, $${valIdx + 11}, $${valIdx + 12}, $${valIdx + 13}::float8, $${valIdx + 14}::float8, $${valIdx + 15}::boolean, $${valIdx + 16}, $${valIdx + 17}::timestamp)`
      );
      valIdx += 18;
    }

    const sqlQuery = `
      INSERT INTO "machine_cut_logs" (
        "id", "app_unique_id", "license_id", "model_id", "model_cut_file_id", "organization_id", "user_id",
        "brand_name", "model_name", "pattern_name",
        "qr_code", "instruction", "plotter_id", "latitude", "longitude", "is_positive_cut",
        "reviews", "created_at"
      ) VALUES ${valuesPlaceholders.join(', ')}
      ON CONFLICT ("id") DO NOTHING;
    `;

    await this.prisma.$executeRawUnsafe(sqlQuery, ...queryValues);
  }

  async getLogs() {
    return (this.prisma as any).migrationLog.findMany({
      select: {
        id: true,
        module: true,
        fileName: true,
        status: true,
        recordsProcessed: true,
        recordsCreated: true,
        recordsUpdated: true,
        recordsFailed: true,
        errorMessage: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  async generateImageForModel(modelId: string) {
    const { saveHpglAsJpg } = require('../utils/hpgl-parser');
    const outputDir = path.join(process.cwd(), 'uploads', 'designs');
    
    const files = await this.prisma.modelCutFile.findMany({
        where: { modelId }
    });

    let generated = 0;
    let failed = 0;

    for (const file of files) {
        try {
            const decryptedPlt = this.decrypt(file.encryptedPltData);
            const fileName = `${file.id}.jpg`;
            const relativePath = await saveHpglAsJpg(decryptedPlt, outputDir, fileName);
            
            await this.prisma.modelCutFile.update({
                where: { id: file.id },
                data: { designFilePath: relativePath }
            });
            generated++;
        } catch (e) {
            this.logger.error(`Failed to generate preview for ${file.id}: ${e.message}`);
            failed++;
        }
    }
    return { generated, failed };
  }

  async generateImageForCategory(categoryId: string) {
    const { saveHpglAsJpg } = require('../utils/hpgl-parser');
    const outputDir = path.join(process.cwd(), 'uploads', 'designs');
    
    const files = await this.prisma.modelCutFile.findMany({
        where: { model: { categoryId } }
    });

    let generated = 0;
    let failed = 0;

    for (const file of files) {
        try {
            const decryptedPlt = this.decrypt(file.encryptedPltData);
            const fileName = `${file.id}.jpg`;
            const relativePath = await saveHpglAsJpg(decryptedPlt, outputDir, fileName);
            
            await this.prisma.modelCutFile.update({
                where: { id: file.id },
                data: { designFilePath: relativePath }
            });
            generated++;
        } catch (e) {
            this.logger.error(`Failed to generate preview for ${file.id}: ${e.message}`);
            failed++;
        }
    }
    return { generated, failed };
  }

  async generateImageForBrand(brandId: string) {
    const { saveHpglAsJpg } = require('../utils/hpgl-parser');
    const outputDir = path.join(process.cwd(), 'uploads', 'designs');
    
    const files = await this.prisma.modelCutFile.findMany({
        where: { model: { brandId } }
    });

    let generated = 0;
    let failed = 0;

    for (const file of files) {
        try {
            const decryptedPlt = this.decrypt(file.encryptedPltData);
            const fileName = `${file.id}.jpg`;
            const relativePath = await saveHpglAsJpg(decryptedPlt, outputDir, fileName);
            
            await this.prisma.modelCutFile.update({
                where: { id: file.id },
                data: { designFilePath: relativePath }
            });
            generated++;
        } catch (e) {
            this.logger.error(`Failed to generate preview for ${file.id}: ${e.message}`);
            failed++;
        }
    }
    return { generated, failed };
  }

  async normalizeModel(modelId: string) {
    const files = await this.prisma.modelCutFile.findMany({
        where: { modelId }
    });
    return this.batchNormalize(files);
  }

  async normalizeCategory(categoryId: string) {
    const files = await this.prisma.modelCutFile.findMany({
        where: { model: { categoryId } }
    });
    return this.batchNormalize(files);
  }

  async normalizeBrand(brandId: string) {
    const files = await this.prisma.modelCutFile.findMany({
        where: { model: { brandId } }
    });
    return this.batchNormalize(files);
  }

  private async batchNormalize(files: any[]) {
    const { saveHpglAsJpg } = require('../utils/hpgl-parser');
    const { normalizeHpgl } = require('../utils/hpgl-normalizer');
    const outputDir = path.join(process.cwd(), 'uploads', 'designs');
    
    let normalized = 0;
    let failed = 0;

    for (const file of files) {
        try {
            const decrypted = this.decrypt(file.encryptedPltData);
            const pltString = decrypted;
            const normalizedPlt = normalizeHpgl(pltString);
            
            const fileName = `${Date.now()}-${file.modelId}-${file.cutPatternId}.jpg`;
            const designFilePath = await saveHpglAsJpg(normalizedPlt, outputDir, fileName);
            const binaryData = this.encrypt(normalizedPlt);
            
            await this.prisma.modelCutFile.update({
                where: { id: file.id },
                data: {
                    encryptedPltData: binaryData,
                    designFilePath: designFilePath
                }
            });
            normalized++;
        } catch (e) {
            this.logger.error(`Failed to normalize file ${file.id}: ${e.message}`);
            failed++;
        }
    }
    return { normalized, failed };
  }

  async generateImageForCutFile(cutFileId: string) {
    const { saveHpglAsJpg } = require('../utils/hpgl-parser');
    const outputDir = path.join(process.cwd(), 'uploads', 'designs');
    
    const file = await this.prisma.modelCutFile.findUnique({
        where: { id: cutFileId }
    });

    if (!file || !file.encryptedPltData) {
        throw new Error('Cut file not found or has no design data');
    }

    const decryptedPlt = this.decrypt(file.encryptedPltData);
    const fileName = `${file.id}.jpg`;
    const relativePath = await saveHpglAsJpg(decryptedPlt, outputDir, fileName);
    
    await this.prisma.modelCutFile.update({
        where: { id: file.id },
        data: { designFilePath: relativePath }
    });

    return { success: true, path: relativePath };
  }

  async downloadLogsCsv() {
    const logs = await (this.prisma as any).migrationLog.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    let csv = 'Date,Module,File,Status,Processed,Created,Updated,Failed,Errors\n';
    logs.forEach((l: any) => {
      const date = new Date(l.createdAt).toLocaleString().replace(/,/g, '');
      csv += `${date},${l.module},${l.fileName},${l.status},${l.recordsProcessed},${l.recordsCreated},${l.recordsUpdated},${l.recordsFailed},"${(l.errorMessage || '').replace(/"/g, '""')}"\n`;
    });
    return csv;
  }

  async downloadFailuresCsv(logId: string) {
    const log = await (this.prisma as any).migrationLog.findUnique({ where: { id: logId } });
    if (!log || !log.logs) return null;
    
    const failures = (log.logs as any).failures;
    if (!failures || failures.length === 0) return null;

    const firstRow = failures[0].row;
    let headers = Object.keys(firstRow);

    // If it's the designs module (which uses headers: false), map to friendly names
    if (log.module === 'designs' && headers.every(h => !isNaN(parseInt(h)))) {
        const mapping: Record<string, string> = {
            '0': 'DesignID',
            '1': 'PatternName',
            '5': 'ModelID'
        };
        headers = headers.filter(h => mapping[h]); 
        
        let csv = 'FailureReason,' + headers.map(h => mapping[h]).join(',') + '\n';
        failures.forEach((f: any) => {
            const reason = String(f.error || 'Unknown error').replace(/"/g, '""');
            const rowValues = headers.map(h => {
                const val = String(f.row[h] || '').replace(/"/g, '""');
                return `"${val}"`;
            });
            csv += `"${reason}",${rowValues.join(',')}\n`;
        });
        return csv;
    }

    // Standard header logic for other modules
    headers = headers.filter(h => {
        const lower = h.toLowerCase();
        // ALWAYS keep ID columns regardless of length or keywords
        if (lower.includes('id')) return true;
        
        if (lower === 'name' || lower.includes('name')) return false;
        if (lower.includes('instruction')) return false;
        if (lower.includes('image')) return false;
        if (lower.includes('mockup')) return false;
        if (lower.includes('plt')) return false;
        if (lower.includes('data')) return false;
        if (lower.includes('content')) return false;
        if (lower.includes('file')) return false;
        
        const val = String(firstRow[h] || '');
        if (val.length > 500) return false;
        
        return true;
    });
    
    let csv = 'FailureReason,' + headers.join(',') + '\n';
    failures.forEach((f: any) => {
        const reason = String(f.error || 'Unknown error').replace(/"/g, '""');
      const rowValues = headers.map(h => {
        const val = String(f.row[h] || '').replace(/"/g, '""');
        return `"${val}"`;
      });
      csv += `"${reason}",${rowValues.join(',')}\n`;
    });
    return csv;
  }

  private async logMigration(data: {
    module: string;
    fileName: string;
    status: string;
    processed: number;
    created: number;
    updated: number;
    failed: number;
    error?: string;
    details?: any;
  }) {
    return (this.prisma as any).migrationLog.create({
      data: {
        module: this.sanitizeForPostgres(data.module),
        fileName: this.sanitizeForPostgres(data.fileName),
        status: this.sanitizeForPostgres(data.status),
        recordsProcessed: data.processed,
        recordsCreated: data.created,
        recordsUpdated: data.updated,
        recordsFailed: data.failed,
        errorMessage: data.error ? this.sanitizeForPostgres(data.error) : undefined,
        logs: data.details ? this.sanitizeForPostgres(data.details) : undefined
      }
    });
  }

  private sanitizeForPostgres(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
      // Aggressive removal of null bytes (\u0000) using split/join
      return obj.split('\0').join('').replace(/\u0000/g, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeForPostgres(item));
    }
    if (typeof obj === 'object') {
      // Handle potential Buffer or non-plain objects
      if (obj instanceof Date || obj instanceof RegExp) return obj;
      
      const sanitized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = this.sanitizeForPostgres(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  }

  private encrypt(data: string): Buffer {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    const encrypted = Buffer.concat([cipher.update(Buffer.from(data, 'utf8')), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
  }

  private convertHexToString(hexInput: string, encoding: BufferEncoding): string | null {
    try {
      const bytes = Buffer.from(hexInput, 'hex');
      return bytes.toString(encoding);
    } catch (e) { return null; }
  }

  private getDecryptedModel(filecontent: string): string | null {
    const step1 = this.convertHexToString(filecontent, 'ascii');
    if (!step1) return null;
    const step2 = this.convertHexToString(step1, 'utf16le');
    return step2;
  }

  private parseBit(val: any): boolean {
    if (val === '1' || val === 1 || val === 'true' || val === true || val === 'True') return true;
    return false;
  }

  // 1. Migrate Catalog (Using Path logic: Cat -> SubCat -> Brand -> Model)
  async migrateCatalog(file: Express.Multer.File | any[], sourceName?: string) {
    let rows: any[] = [];
    if (Array.isArray(file)) {
      rows = file;
    } else {
      await new Promise((resolve, reject) => {
        Readable.from((file as Express.Multer.File).buffer)
          .pipe(csv({
              mapHeaders: ({ header }) => header.trim().replace(/^\ufeff/, ''),
              mapValues: ({ value }) => value?.trim()
          }))
          .on('data', (row: any) => rows.push(row))
          .on('end', resolve)
          .on('error', reject);
      });
    }

    // Sort rows by path depth to ensure parents are created before children
    rows.sort((a, b) => {
        const depthA = (a.Path || '').split('\\').length;
        const depthB = (b.Path || '').split('\\').length;
        return depthA - depthB;
    });

    const parentIds = new Set(rows.map(r => String(r.ParentID)));
    
    const categoryDbMap = new Map<string, string>(); // CatalogID -> DB ID
    const brandDbMap = new Map<string, string>();    // CatalogID -> DB ID
    const brandToCategoryMap = new Map<string, string>(); // BrandCatalogID -> CategoryDBID
    
    let importedCategories = 0;
    let updatedCategories = 0;
    let importedBrands = 0;
    let updatedBrands = 0;
    let importedModels = 0;
    let updatedModels = 0;
    let skippedRows = 0;
    const failures: any[] = [];

    for (const row of rows) {
        try {
            const path = row.Path || '';
            if (!path) { 
                skippedRows++; 
                failures.push({ row, error: 'Path is missing' });
                continue; 
            }
            
            const parts = path.split('\\');
            const depth = parts.length;
            const catalogID = String(row.CatalogID).trim();
            const parentCatalogID = String(row.ParentID).trim();
            const pathLower = path.toLowerCase();
            const nameLower = row.Name.trim().toLowerCase();
            const isDecal = pathLower.includes('decal') || pathLower.includes('skin');
            
            // Explicit list of sub-categories provided by user that should NOT be brands
            const knownSubCategories = [
                'alphabets', 'birds and animals', 'brand logo', 'car and bike', 'character', 
                'crown', 'customize', 'festival', 'game', 'god', 'gym freak', 'heart shapes', 
                'logo', 'political', 'valentine special', 'zodiac sign', 'other',
                'religious symbols', 'hindu', 'muslim', 'christian', 'regional party', 
                'shivratri special', '13 series', 'sushil', 'square', '1.3 inch', 
                'laptop decal', 'cf', 'protection pro test', '31 mm', '29', '0', 'fg001',
                'watches', 'universal size', 'circle'
            ];
            const isParent = parentIds.has(catalogID);
            const isKnownSubCat = knownSubCategories.some(c => nameLower.includes(c));

            // --- CATEGORIES (Root items or parents in decal paths) ---
            if (depth <= 2 || (isParent && (isDecal || isKnownSubCat))) {
                let parentId = (depth === 1) ? null : categoryDbMap.get(parentCatalogID);
                if (!parentId && depth > 1 && parentCatalogID !== '0' && parentCatalogID !== 'null') {
                    const legacyParentId = parseInt(parentCatalogID);
                    if (!isNaN(legacyParentId)) {
                        const existingCat = await (this.prisma as any).modelCategory.findFirst({ where: { legacyId: legacyParentId } });
                        if (existingCat) {
                            const foundId: string = existingCat.id;
                            parentId = foundId;
                            categoryDbMap.set(parentCatalogID, foundId);
                        }
                    }
                }
                const legacyId = parseInt(catalogID);
                const legacyParentId = row.ParentID ? parseInt(String(row.ParentID)) : null;
                
                let category = await (this.prisma as any).modelCategory.findFirst({ 
                    where: { name: row.Name, parentId: parentId } 
                });

                if (!category) {
                    category = await (this.prisma as any).modelCategory.create({ 
                        data: { 
                            name: row.Name, 
                            parentId: parentId, 
                            legacyId, 
                            legacyParentId, 
                            sortOrder: 0,
                            imageUrl: row.ImageUrl && row.ImageUrl !== 'NULL' ? row.ImageUrl : null
                        } 
                    });
                    importedCategories++;
                } else {
                    await (this.prisma as any).modelCategory.update({ 
                        where: { id: category.id }, 
                        data: { 
                            legacyId, 
                            legacyParentId,
                            imageUrl: row.ImageUrl && row.ImageUrl !== 'NULL' ? row.ImageUrl : null
                        } 
                    });
                    updatedCategories++;
                }
                categoryDbMap.set(catalogID, category.id);
            }
            // --- BRANDS (Parents that are not root and not decals) ---
            else if (isParent) {
                const legacyId = parseInt(catalogID);
                const legacyParentId = row.ParentID ? parseInt(String(row.ParentID)) : null;

                let brand = await this.prisma.brand.findFirst({ 
                    where: { name: { equals: row.Name, mode: 'insensitive' } } 
                });
                if (!brand) {
                    brand = await this.prisma.brand.create({ 
                        data: { name: row.Name, legacyId, legacyParentId, sortOrder: 0 } 
                    });
                    importedBrands++;
                } else {
                    await this.prisma.brand.update({ 
                        where: { id: brand.id }, 
                        data: { legacyId, legacyParentId } 
                    });
                    updatedBrands++;
                }
                brandDbMap.set(catalogID, brand.id);
                
                let parentCatId = categoryDbMap.get(parentCatalogID);
                if (!parentCatId && parentCatalogID !== '0' && parentCatalogID !== 'null') {
                    const legacyParentId = parseInt(parentCatalogID);
                    if (!isNaN(legacyParentId)) {
                        const existingCat = await (this.prisma as any).modelCategory.findFirst({ where: { legacyId: legacyParentId } });
                        if (existingCat) {
                            const foundId: string = existingCat.id;
                            parentCatId = foundId;
                            categoryDbMap.set(parentCatalogID, foundId);
                        }
                    }
                }
                if (parentCatId) brandToCategoryMap.set(catalogID, parentCatId);
            }
            // --- MODELS (Leaves / No children) ---
            else {
                let brandId = brandDbMap.get(parentCatalogID);
                let categoryId = brandId ? brandToCategoryMap.get(parentCatalogID) : categoryDbMap.get(parentCatalogID);

                // Fallback: If not in memory maps, try to find in DB by legacy ID
                if (!categoryId && parentCatalogID !== '0' && parentCatalogID !== 'null') {
                    const legacyParentId = parseInt(parentCatalogID);
                    if (!isNaN(legacyParentId)) {
                        const existingCat = await (this.prisma as any).modelCategory.findFirst({ where: { legacyId: legacyParentId } });
                        if (existingCat) {
                            const foundId: string = existingCat.id;
                            categoryId = foundId;
                            categoryDbMap.set(parentCatalogID, foundId);
                        } else {
                            // Find the brand name in our input rows for this legacy ID
                            const brandNode = rows.find(r => String(r.CatalogID).trim() === parentCatalogID);
                            if (brandNode) {
                                const existingBrand = await this.prisma.brand.findFirst({
                                    where: { name: { equals: brandNode.Name.trim(), mode: 'insensitive' } }
                                });
                                if (existingBrand) {
                                    brandId = existingBrand.id;
                                    brandDbMap.set(parentCatalogID, brandId);
                                    
                                    // Also resolve categoryId if we can find the parent of this brand node
                                    const brandParentCatalogID = String(brandNode.ParentID).trim();
                                    let parentCatId = categoryDbMap.get(brandParentCatalogID);
                                    if (!parentCatId) {
                                        const legacyBrandParentId = parseInt(brandParentCatalogID);
                                        if (!isNaN(legacyBrandParentId)) {
                                            const existingParentCat = await (this.prisma as any).modelCategory.findFirst({ where: { legacyId: legacyBrandParentId } });
                                            if (existingParentCat) {
                                                const foundCatId: string = existingParentCat.id;
                                                parentCatId = foundCatId;
                                                categoryDbMap.set(brandParentCatalogID, foundCatId);
                                            }
                                        }
                                    }
                                    if (parentCatId) {
                                        categoryId = parentCatId;
                                    }
                                }
                            } else {
                                const existingBrand = await this.prisma.brand.findFirst({ where: { legacyId: legacyParentId } });
                                if (existingBrand) {
                                    brandId = existingBrand.id;
                                    brandDbMap.set(parentCatalogID, brandId);
                                }
                            }
                        }
                    }
                }

                let finalCategoryId = categoryId || (await this.findCategoryIdForBrand(brandId));

                if (!finalCategoryId) { 
                    skippedRows++; 
                    failures.push({ row, error: `Parent category/brand not found for model: ${row.Name} (ParentID: ${parentCatalogID})` });
                    continue; 
                }

                let model = await this.prisma.model.findFirst({
                    where: { name: row.Name, brandId: brandId || null, categoryId: finalCategoryId }
                });

                const legacyId = parseInt(catalogID);
                const legacyParentId = row.ParentID ? parseInt(String(row.ParentID)) : null;

                if (!model) {
                    model = await this.prisma.model.create({
                        data: {
                            name: row.Name,
                            brandId: brandId || null,
                            categoryId: finalCategoryId,
                            legacyId,
                            legacyParentId,
                            sortOrder: 0,
                            imageUrl: row.ImageUrl && row.ImageUrl !== 'NULL' ? row.ImageUrl : null
                        }
                    });
                    importedModels++;
                } else {
                    await this.prisma.model.update({ 
                        where: { id: model.id }, 
                        data: { 
                            brandId: brandId || null,
                            categoryId: finalCategoryId,
                            legacyId,
                            legacyParentId,
                            imageUrl: row.ImageUrl && row.ImageUrl !== 'NULL' ? row.ImageUrl : null
                        } 
                    });
                    updatedModels++;
                }
            }
        } catch (err) {
            this.logger.error(`Error processing catalog row: ${err.message}`);
            skippedRows++;
            failures.push({ 
                model: row[1], 
                pattern: row[2], 
                error: err.message 
            });
        }
    }

    const result = { 
        importedCategories, 
        importedBrands, 
        importedModels, 
        skippedRows, 
        totalRows: rows.length,
        failures: failures.slice(0, 1000)
    };
    
    await this.logMigration({
      module: 'catalog',
      fileName: sourceName || (file as Express.Multer.File).originalname,
      status: skippedRows === 0 ? 'SUCCESS' : (importedCategories + importedBrands + importedModels > 0 ? 'PARTIAL' : 'FAILED'),
      processed: rows.length,
      created: importedCategories + importedBrands + importedModels,
      updated: updatedCategories + updatedBrands + updatedModels,
      failed: skippedRows,
      details: { ...result, updatedCategories, updatedBrands, updatedModels }
    });

    return { ...result, updatedCategories, updatedBrands, updatedModels };
  }

  // 2. Migrate Skins (Cut Patterns)
  async migrateSkins(file: Express.Multer.File | any[], sourceName?: string) {
    let data: any[] = [];
    if (Array.isArray(file)) {
      data = file;
    } else {
      await new Promise((resolve, reject) => {
        Readable.from((file as Express.Multer.File).buffer)
          .pipe(csv({
              mapHeaders: ({ header }) => header.trim().replace(/^\ufeff/, ''),
              mapValues: ({ value }) => value?.trim()
          }))
          .on('data', (row: any) => data.push(row))
          .on('end', resolve)
          .on('error', reject);
      });
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const failures: any[] = [];

    const findVal = (row: any, ...aliases: string[]) => {
        for (const alias of aliases) {
            if (row[alias] !== undefined) return row[alias];
            const key = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
            if (key) return row[key];
        }
        return null;
    };

    for (const skin of data) {
        try {
            const name = findVal(skin, 'ModelSkinName', 'SkinName', 'Name');
            const legacyIdStr = findVal(skin, 'ModelSkinID', 'SkinID', 'ID');
            const legacyId = parseInt(legacyIdStr);
            
            if (!name || isNaN(legacyId)) { 
                skipped++; 
                failures.push({ row: skin, error: 'Missing name or legacy ID' });
                continue; 
            }
            const isActive = this.parseBit(findVal(skin, 'IsActive', 'Active'));
            const canPrintNCut = this.parseBit(findVal(skin, 'CanPrintNCut', 'PrintNCut'));
            const canDecalCut = this.parseBit(findVal(skin, 'CanDecalCut', 'DecalCut'));
            const cutFor = parseInt(findVal(skin, 'CutFor')) || 0;

            let cp = await (this.prisma as any).cutPattern.findFirst({
                where: { OR: [{ legacyId }, { name: { equals: name, mode: 'insensitive' } }] }
            });

            if (!cp) {
                await (this.prisma as any).cutPattern.create({
                    data: { name, legacyId, legacyParentId: 0, isActive, canPrintNCut, canDecalCut, cutFor, sortOrder: 0 }
                });
                imported++;
            } else {
                await (this.prisma as any).cutPattern.update({
                    where: { id: cp.id },
                    data: { name, legacyId, legacyParentId: 0, isActive, canPrintNCut, canDecalCut, cutFor }
                });
                updated++;
            }
        } catch (err) {
            this.logger.error(`Error processing skin row: ${err.message}`);
            skipped++;
            failures.push({ row: skin, error: err.message });
        }
    }

    const result = { 
        imported, 
        updated, 
        skipped, 
        totalRows: data.length,
        failures: failures.slice(0, 1000)
    };

    await this.logMigration({
      module: 'skins',
      fileName: sourceName || (file as Express.Multer.File).originalname,
      status: skipped === 0 ? 'SUCCESS' : (imported + updated > 0 ? 'PARTIAL' : 'FAILED'),
      processed: data.length,
      created: imported,
      updated: updated,
      failed: skipped,
      details: result
    });

    return result;
  }

  // 3. Migrate Designs (Models and Cut Files)
  async migrateDesigns(inputStream: Readable | any[], totalBytes?: number, cache?: {
    existingFileMap?: Map<string, string>;
    modelCache?: Map<number, string>;
    cutPatternCache?: Map<string, string>;
    cutPatternLegacyCache?: Map<number, string>;
    skipLog?: boolean;
  }) {
    const modelCache = cache?.modelCache || new Map<number, string>();
    if (!cache?.modelCache) {
      const models = await this.prisma.model.findMany({ where: { legacyId: { not: null } } });
      models.forEach(m => modelCache.set(m.legacyId!, m.id));
    }

    const cutPatternCache = cache?.cutPatternCache || new Map<string, string>();
    const cutPatternLegacyCache = cache?.cutPatternLegacyCache || new Map<number, string>();
    if (!cache?.cutPatternCache) {
      const cutPatterns = await (this.prisma as any).cutPattern.findMany();
      cutPatterns.forEach((cp: any) => {
          cutPatternCache.set(cp.name.toLowerCase(), cp.id);
          if (cp.legacyId) cutPatternLegacyCache.set(cp.legacyId, cp.id);
      });
    }

    const existingFileMap = cache?.existingFileMap || new Map<string, string>();
    if (!cache?.existingFileMap) {
      const existingFiles = await this.prisma.modelCutFile.findMany({
        select: { id: true, modelId: true, cutPatternId: true }
      });
      existingFiles.forEach(f => existingFileMap.set(`${f.modelId}_${f.cutPatternId}`, f.id));
    }

    let importedFiles = 0;
    let existingFiles = 0;
    let skippedRows = 0;
    let decryptionFailed = 0;
    let processedRows = 0;
    const failures: any[] = [];

    let iterator: any;
    if (Array.isArray(inputStream)) {
        iterator = inputStream.map(r => {
            if (Array.isArray(r)) return r;
            // Map DB object to expected CSV array format
            return [
                r.ModelID || r.ID || r.ModelMasterID, // 0: legacyId
                `Catalog ${r.CatalogID}`,             // 1: ModelName (used for logging only)
                r.ReferenceName || r.Name || '',      // 2: PatternName (fallback match)
                r.Instruction || '',                  // 3: InstructionHex (PLT base64)
                r.CatalogID,                          // 4: legacyCatalogID
                r.ModelSkinID                         // 5: legacyModelSkinId
            ];
        });
    } else {
        // Create a transformation stream to handle UTF-16LE or strip null bytes
        const { Transform } = require('stream');
        const encodingTransform = new Transform({
            transform(chunk: any, encoding: string, callback: Function) {
                // If the chunk contains many null bytes, it's likely UTF-16 being read as UTF-8
                // We strip them to normalize to UTF-8
                const sanitized = Buffer.from(chunk.filter((b: number) => b !== 0));
                this.push(sanitized);
                callback();
            }
        });

        const csvStream = inputStream.pipe(encodingTransform).pipe(csv({ 
            headers: false, 
            maxRowBytes: 1024 * 1024 * 1024 // 1GB
        }));

        csvStream.on('error', (err: any) => {
            this.logger.error(`CSV Stream Error: ${err.message}`);
        });

        iterator = csvStream;
    }

    const toCreate: any[] = [];
    const toUpdate: any[] = [];

    for await (const row of iterator) {
        try {
            processedRows++;
            
            // Validate row has minimum expected columns
            if (!row || Object.keys(row).length < 6) {
                skippedRows++;
                continue;
            }

            if (processedRows % 1000 === 0) {
                this.logger.log(`Processing Designs: ${processedRows} rows reached...`);
            }

            // Strip quotes if any and parse
            const rawLegacyID = (row[4] || '').toString().replace(/['"]/g, '').trim();
            const legacyCatalogID = parseInt(rawLegacyID);
            
            if (isNaN(legacyCatalogID)) {
                if (processedRows === 1) continue; // Skip header
                skippedRows++; 
                failures.push({ 
                    model: row[1], 
                    pattern: row[2], 
                    error: 'Invalid Legacy Catalog ID' 
                });
                continue; 
            }
            
            const modelId = modelCache.get(legacyCatalogID);
            if (!modelId) { 
                skippedRows++; 
                failures.push({ 
                    model: row[1], 
                    pattern: row[2], 
                    error: `Model with legacyId ${legacyCatalogID} not found` 
                });
                continue; 
            }

            const legacyModelSkinId = parseInt((row[5] || '').toString().trim()) || 0;
            let cutPatternId = legacyModelSkinId > 0 ? cutPatternLegacyCache.get(legacyModelSkinId) : null;
            
            // FALLBACK: Match by Name if ID matching fails (Source IDs are inconsistent)
            if (!cutPatternId) {
                const skinName = (row[2] || '').toString().trim();
                cutPatternId = cutPatternCache.get(skinName.toLowerCase());
            }
            
            if (!cutPatternId) {
                const skinName = (row[2] || '').toString().trim();
                this.logger.warn(`Skipping design: Cut Pattern "${skinName}" (LegacyID: ${legacyModelSkinId}) not found in database.`);
                skippedRows++;
                failures.push({ 
                    model: row[1], 
                    pattern: row[2], 
                    error: `Cut Pattern "${skinName}" not found` 
                });
                continue;
            }

            const instructionHex = row[3];
            let decryptedPlt: string | null = null;
            
            if (!instructionHex || instructionHex.toString().trim() === '') { 
                this.logger.warn(`Design missing PLT data, importing as empty: "${row[2]}"`);
                decryptedPlt = ''; // Empty string for missing PLT data
            } else {
                decryptedPlt = this.getDecryptedModel(instructionHex);
            }

            if (!decryptedPlt) { 
                decryptionFailed++; 
                failures.push({ 
                    model: row[1], 
                    pattern: row[2], 
                    error: 'Decryption failed' 
                });
                continue; 
            }

            const encryptedPlt = this.encrypt(decryptedPlt);

            // Safety check: skip rows that are too massive for Prisma to handle (prevents JSON.stringify RangeError)
            if (encryptedPlt.length > 50 * 1024 * 1024) {
                this.logger.warn(`Skipping massive design: "${row[2]}" for "${row[1]}" is over 50MB.`);
                skippedRows++;
                failures.push({ 
                    model: row[1], 
                    pattern: row[2], 
                    error: 'Design data too large for database (>50MB)' 
                });
                continue;
            }

            const legacyId = parseInt((row[0] || '').toString().trim());
            const legacyParentId = legacyCatalogID; // The model ID is the parent for the cut file
            
            const existingId = existingFileMap.get(`${modelId}_${cutPatternId}`);

            if (!existingId) {
                toCreate.push({ modelId, cutPatternId: cutPatternId!, encryptedPltData: encryptedPlt, legacyId, legacyParentId, legacyModelSkinId });
            } else {
                toUpdate.push({ id: existingId, legacyId, legacyParentId, legacyModelSkinId });
            }
        } catch (err) {
            this.logger.error(`Error processing design row: ${err.message}`);
            skippedRows++;
            failures.push({ 
                model: row[1], 
                pattern: row[2], 
                error: err.message 
            });
        }
    }

    if (toCreate.length > 0) {
      await this.prisma.modelCutFile.createMany({
        data: toCreate,
        skipDuplicates: true
      });
      importedFiles = toCreate.length;
    }

    if (toUpdate.length > 0) {
      const updateBatchSize = 100;
      for (let i = 0; i < toUpdate.length; i += updateBatchSize) {
        const chunk = toUpdate.slice(i, i + updateBatchSize);
        await Promise.all(chunk.map(item => 
          this.prisma.modelCutFile.update({
            where: { id: item.id },
            data: { legacyId: item.legacyId, legacyParentId: item.legacyParentId, legacyModelSkinId: item.legacyModelSkinId }
          })
        ));
      }
      existingFiles = toUpdate.length;
    }

    const result = { 
        importedFiles, 
        existingFiles, 
        skippedRows, 
        decryptionFailed, 
        totalModelRows: processedRows,
        failures: failures.slice(0, 1000)
    };

    if (!cache?.skipLog) {
      await this.logMigration({
        module: 'designs',
        fileName: 'Streamed File', 
        status: (skippedRows + decryptionFailed) === 0 ? 'SUCCESS' : (importedFiles + existingFiles > 0 ? 'PARTIAL' : 'FAILED'),
        processed: processedRows,
        created: importedFiles,
        updated: existingFiles,
        failed: skippedRows + decryptionFailed,
        details: result
      });
    }

    return result;
  }

  // 4. Local Design Migration (Reading directly from disk using Streams)
  async migrateLocalDesigns() {
    const localPath = path.join(process.cwd(), 'uploads', 'DatatoMigrate', 'ModelMaster.csv');
    
    if (!fs.existsSync(localPath)) {
        throw new Error(`Local file not found at ${localPath}`);
    }

    const stats = fs.statSync(localPath);
    const readStream = fs.createReadStream(localPath);
    return this.migrateDesigns(readStream, stats.size);
  }

  // 5. Generate Images from PLT Data
  async generateAllImages() {
    const { saveHpglAsJpg } = require('../utils/hpgl-parser');
    const outputDir = path.join(process.cwd(), 'uploads', 'designs');
    
    const allFiles = await this.prisma.modelCutFile.findMany({
        include: { model: true }
    });
    // Now processing all models
    const files = allFiles;

    let generated = 0;
    let failed = 0;

    for (const file of files) {
        try {
            const decryptedPlt = this.decrypt(file.encryptedPltData);
            const fileName = `${file.id}.jpg`;
            
            this.logger.log(`[PreviewGen] Decrypted PLT for ${file.id} (length: ${decryptedPlt.length}): ${decryptedPlt.substring(0, 100)}...`);

            // Use the utility that handles Sharp conversion properly
            const relativePath = await saveHpglAsJpg(decryptedPlt, outputDir, fileName);
            
            await this.prisma.modelCutFile.update({
                where: { id: file.id },
                data: { designFilePath: relativePath }
            });
            
            generated++;
        } catch (e) {
            this.logger.error(`Failed to generate preview for ${file.id}: ${e.message}`);
            failed++;
        }
    }

    return { generated, failed, total: files.length, message: 'Restricted to iPhone 16 Pro Max' };
  }

  private decrypt(buffer: Buffer): string {
    const iv = buffer.slice(0, IV_LENGTH);
    const encryptedData = buffer.slice(IV_LENGTH);
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decrypted.toString('utf8');
  }

  private pltToSvg(plt: string): string {
    const commands = plt.split(';');
    let path = '';
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const cmd of commands) {
        if (cmd.startsWith('PA')) {
            const coords = cmd.substring(2).split(',');
            if (coords.length >= 2) {
                const x = parseFloat(coords[0]);
                const y = parseFloat(coords[1]);
                if (!isNaN(x) && !isNaN(y)) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }
    }

    if (minX === Infinity) return '<svg xmlns="http://www.w3.org/2000/svg"><text y="20">Empty PLT</text></svg>';

    let penDown = false;
    for (const cmd of commands) {
        if (cmd.startsWith('PU')) penDown = false;
        else if (cmd.startsWith('PD')) penDown = true;
        else if (cmd.startsWith('PA')) {
            const coords = cmd.substring(2).split(',');
            if (coords.length >= 2) {
                const x = parseFloat(coords[0]) - minX;
                const y = (maxY - minY) - (parseFloat(coords[1]) - minY);
                path += (penDown ? `L ${x} ${y} ` : `M ${x} ${y} `);
            }
        }
    }

    const w = maxX - minX;
    const h = maxY - minY;
    return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><path d="${path}" fill="none" stroke="currentColor" stroke-width="20" /></svg>`;
  }

  private async findCategoryIdForBrand(brandId: string | undefined): Promise<string | null> {
    if (!brandId) return null;
    
    // 1. Try to find any model with this brand and get its category
    const m = await (this.prisma as any).model.findFirst({ where: { brandId }, select: { categoryId: true } });
    if (m?.categoryId) return m.categoryId;

    // 2. Try to find the brand's legacy parent ID and look it up in categories
    const brand = await this.prisma.brand.findUnique({ where: { id: brandId } });
    if (brand?.legacyParentId) {
        const cat = await (this.prisma as any).modelCategory.findFirst({ where: { legacyId: brand.legacyParentId } });
        if (cat) return cat.id;
    }
    
    return null;
  }

  private async parseCsvBuffer(buffer: Buffer): Promise<any[]> {
    const rows: any[] = [];
    return new Promise((resolve, reject) => {
      Readable.from(buffer)
        .pipe(csv({
            mapHeaders: ({ header }) => header.trim().replace(/^\ufeff/, ''),
            mapValues: ({ value }) => value?.trim()
        }))
        .on('data', (row: any) => rows.push(row))
        .on('end', () => resolve(rows))
        .on('error', reject);
    });
  }

  private parseOrCreateUuid(val: string): string {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (val && uuidRegex.test(val)) return val.toLowerCase();
    return crypto.createHash('md5').update(val || crypto.randomUUID()).digest('hex')
      .replace(/^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i, '$1-$2-$3-$4-$5');
  }

  private safeDate(val: any): Date {
    if (!val) return new Date();
    const cleanVal = String(val).replace(/['"]/g, '').trim();
    if (!cleanVal || cleanVal.toUpperCase() === 'NULL' || cleanVal.toUpperCase() === 'UNDEFINED') {
      return new Date();
    }
    const d = new Date(cleanVal);
    if (isNaN(d.getTime())) return new Date();
    const year = d.getFullYear();
    if (year < 1900 || year > 2100) {
      return new Date();
    }
    return d;
  }

  private parseUsersCsvRobustly(buffer: Buffer): any[] {
    let content = buffer.toString('utf8');
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
    const lines = content.split(/\r?\n/);
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^\ufeff/, ''));
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',');
      if (parts.length < 33) {
        continue;
      }

      const row: any = {};
      // First 20 fields (0 to 19)
      for (let j = 0; j < 20; j++) {
        row[headers[j]] = parts[j].trim();
      }

      // Last 12 fields (from parts.length - 12 to parts.length - 1)
      const startLast12 = parts.length - 12;
      for (let j = 0; j < 12; j++) {
        row[headers[21 + j]] = parts[startLast12 + j].trim();
      }

      // Address is everything in between (index 20 to parts.length - 12)
      const addressParts = parts.slice(20, parts.length - 12);
      row['Address'] = addressParts.join(',').trim();

      rows.push(row);
    }

    return rows;
  }

  async migrateUsers(
    usersFile?: Express.Multer.File | any[],
    userRolesFile?: Express.Multer.File | any[], sourceName?: string
  ) {
    let importedUsers = 0;
    let updatedUsers = 0;
    let importedOrgs = 0;
    let updatedOrgs = 0;
    let skippedRows = 0;
    const failures: any[] = [];

    // Parse CSVs
    const usersData = usersFile ? (Array.isArray(usersFile) ? usersFile : this.parseUsersCsvRobustly((usersFile as Express.Multer.File).buffer)) : [];
    const userRolesData = userRolesFile ? (Array.isArray(userRolesFile) ? userRolesFile : await this.parseCsvBuffer((userRolesFile as Express.Multer.File).buffer)) : [];

    // Cache to map legacyRoleId -> newRoleId
    const roleMap = new Map<string, string>(); // legacy Role ID (string) -> DB Role ID (UUID)
    const existingRoles = await (this.prisma.role as any).findMany();
    existingRoles.forEach((r: any) => {
      if (r.legacyId) roleMap.set(r.legacyId, r.id);
      roleMap.set(r.name.toLowerCase(), r.id); // fallback by name
    });

    // Map User to Roles from userRoles file
    const userToRolesMap = new Map<string, string[]>(); // legacyUserId -> Array of legacyRoleIds
    for (const urRow of userRolesData) {
      const uId = String(urRow.UserId || '').trim();
      const rId = String(urRow.RoleId || '').trim();
      if (uId && rId) {
        if (!userToRolesMap.has(uId)) {
          userToRolesMap.set(uId, []);
        }
        userToRolesMap.get(uId)!.push(rId);
      }
    }

    // Cache to map legacyUserId -> DB User ID (UUID) & DB Org ID (UUID)
    const userMap = new Map<string, string>(); // legacyUserId -> DB User ID
    const userOrgMap = new Map<string, string>(); // legacyUserId -> DB Org ID
    const userLegacyCodeMap = new Map<number, string>(); // legacy Code (int) -> DB User ID

    // Pre-populate cache with existing users
    const allUsers = await this.prisma.user.findMany();
    allUsers.forEach(u => {
      if (u.legacyId) userLegacyCodeMap.set(u.legacyId, u.id);
      userMap.set(u.email.toLowerCase(), u.id);
      if (u.organizationId) userOrgMap.set(u.email.toLowerCase(), u.organizationId);
    });

    // Fetch and cache all current roles
    const allCurrentRoles = await (this.prisma.role as any).findMany();
    allCurrentRoles.forEach((r: any) => {
      if (r.legacyId) roleMap.set(r.legacyId, r.id);
      roleMap.set(r.name.toLowerCase(), r.id);
    });

    // Helper to get matching System role UUID based on legacy role names mapping
    const getNewRoleIdForLegacyUser = (legacyUserId: string): string => {
      const legacyRoleIds = userToRolesMap.get(legacyUserId) || [];
      
      let isMainDealer = false;
      let isDealer = false;
      let isEndUser = false;
      
      for (const lrId of legacyRoleIds) {
        const role = allCurrentRoles.find((r: any) => r.legacyId === lrId);
        const name = (role?.name || '').toLowerCase();
        if (name.includes('maindealer') || name.includes('headquarters')) isMainDealer = true;
        if (name.includes('dealer') && !name.includes('maindealer')) isDealer = true;
        if (name.includes('enduser') || name.includes('retailer')) isEndUser = true;
      }
      
      if (isMainDealer || isDealer) {
        const role = allCurrentRoles.find((r: any) => r.name === 'Dealer Admin');
        if (role) return role.id;
      }
      if (isEndUser) {
        const role = allCurrentRoles.find((r: any) => r.name === 'Retailer Admin');
        if (role) return role.id;
      }

      for (const lrId of legacyRoleIds) {
        const dbRoleId = roleMap.get(lrId);
        if (dbRoleId) return dbRoleId;
      }
      
      const fallbackRole = allCurrentRoles.find((r: any) => r.name.toLowerCase().includes('dealer')) || allCurrentRoles[0];
      return fallbackRole?.id;
    };

    // 1. Fetch organization types and root organization context
    const orgTypes = await this.prisma.organizationType.findMany();
    const parentType = orgTypes.find(o => o.name === 'parent') || orgTypes[0];
    const headquartersType = orgTypes.find(o => o.name === 'headquarters') || orgTypes[0];
    const dealerType = orgTypes.find(o => o.name === 'dealer') || orgTypes[0];
    const retailerType = orgTypes.find(o => o.name === 'retailer') || orgTypes[0];
    const distributorType = orgTypes.find(o => o.name === 'distributor') || orgTypes[0];

    // Find rootOrg by 'parent' type first (Flashgard HQ), not by name
    let rootOrg = await this.prisma.organization.findFirst({
      where: { organizationTypeId: parentType?.id }
    });
    if (!rootOrg) {
      // Fallback: search by name
      rootOrg = await this.prisma.organization.findFirst({
        where: { name: { contains: 'Flashgard', mode: 'insensitive' } }
      });
    }
    if (!rootOrg && parentType) {
      rootOrg = await this.prisma.organization.create({
        data: {
          name: 'Flashgard',
          organizationTypeId: parentType.id
        }
      });
    }
    // Ensure rootOrg is always at the top of the hierarchy (no parent)
    if (rootOrg && rootOrg.parentId !== null) {
      await this.prisma.organization.update({
        where: { id: rootOrg.id },
        data: { parentId: null }
      });
      rootOrg = { ...rootOrg, parentId: null };
    }

    // Migrate Users and dynamically create Organizations
    for (const userRow of usersData) {
      try {
        const legacyIdStr = String(userRow.Id || '').trim();
        const legacyCode = parseInt(userRow.Code) || null;
        const parentUserIdStr = String(userRow.ParentUserID || '').trim();
        const email = String(userRow.Email || '').trim().toLowerCase();
        const userName = String(userRow.UserName || '').trim();
        const legacyFirstName = (String(userRow.FirstName || '').trim() || userName || 'Legacy').slice(0, 100);
        const legacyLastName = (String(userRow.LastName || '').trim() || 'User').slice(0, 100);
        const passwordHash = String(userRow.PasswordHash || '').trim();
        const isActive = this.parseBit(userRow.IsActive);
        const isDeleted = this.parseBit(userRow.IsDelete);

        if (!email) {
          skippedRows++;
          failures.push({ row: userRow, error: 'Email is missing' });
          continue;
        }

        // Determine organization assignment
        let orgId = rootOrg?.id;
        const legacyRoleIds = userToRolesMap.get(legacyIdStr) || [];
        const isDealerOrRetailer = legacyRoleIds.some(lrId => {
          const role = allCurrentRoles.find((r: any) => r.legacyId === lrId);
          const name = (role?.name || '').toLowerCase();
          return name.includes('dealer') || name.includes('retailer') || name.includes('distributor') || name.includes('partner');
        }) || 
        userRow.GSTNO || 
        userRow.Address ||
        legacyLastName.trim().startsWith('-') ||
        /^\d+$/.test(legacyFirstName.trim());

        // Skip org creation for junk "NULL NULL" records
        const isNullNull = legacyFirstName.toUpperCase() === 'NULL' && legacyLastName.toUpperCase() === 'NULL';

        if (isDealerOrRetailer && !isNullNull) {
          const orgName = (`${legacyFirstName} ${legacyLastName}`.trim() || userName || email).slice(0, 255);
          let org = await this.prisma.organization.findFirst({
            where: { legacyId: legacyIdStr }
          });

          if (!org) {
            org = await this.prisma.organization.findFirst({
              where: { name: orgName, legacyId: null }
            });
          }

          let orgType = dealerType?.id;
          const isMainDealer = legacyRoleIds.some(lrId => {
            const role = allCurrentRoles.find((r: any) => r.legacyId === lrId);
            const name = (role?.name || '').toLowerCase();
            return name.includes('maindealer') || name.includes('headquarters');
          });
          const isEndUser = legacyRoleIds.some(lrId => {
            const role = allCurrentRoles.find((r: any) => r.legacyId === lrId);
            const name = (role?.name || '').toLowerCase();
            return name.includes('enduser') || name.includes('retailer');
          });
          const isDistributor = legacyRoleIds.some(lrId => {
            const role = allCurrentRoles.find((r: any) => r.legacyId === lrId);
            return (role?.name || '').toLowerCase().includes('distributor');
          });

          if (isMainDealer) {
            orgType = headquartersType?.id;
          } else if (isEndUser) {
            orgType = retailerType?.id;
          } else if (isDistributor) {
            orgType = distributorType?.id;
          } else {
            orgType = dealerType?.id;
          }

          if (!org && orgType) {
            org = await this.prisma.organization.create({
              data: {
                name: orgName,
                organizationTypeId: orgType,
                isActive: isActive,
                legacyId: legacyIdStr
              }
            });
            importedOrgs++;

            if (userRow.Address) {
              const fullAddress = String(userRow.Address).trim();
              const streetLine1 = fullAddress.slice(0, 255);
              const streetLine2 = fullAddress.length > 255 ? fullAddress.slice(255, 510) : null;
              
              await this.prisma.address.create({
                data: {
                  organizationId: org.id,
                  streetLine1,
                  streetLine2,
                  city: 'Legacy City',
                  state: 'Legacy State',
                  postalCode: String(userRow.Pincode || '000000').slice(0, 50),
                  country: 'India',
                  isPrimary: true
                }
              });
            }
          } else {
            if (org && !org.legacyId) {
              await this.prisma.organization.update({
                where: { id: org.id },
                data: { legacyId: legacyIdStr }
              });
            }
            updatedOrgs++;
          }
          orgId = org?.id;
        }

        const newUserId = this.parseOrCreateUuid(legacyIdStr);
        let user = await this.prisma.user.findFirst({
          where: { OR: [ { id: newUserId }, { email } ] }
        });

        const userRoleId = getNewRoleIdForLegacyUser(legacyIdStr);
        const parentUserId = parentUserIdStr && parentUserIdStr !== '0' ? parentUserIdStr : null;

        const userData = {
          email,
          passwordHash,
          firstName: email.slice(0, 100),
          lastName: '',
          isActive,
          isDeleted,
          legacyId: legacyCode,
          parentUserId: parentUserId,
          organizationId: orgId,
          roleId: userRoleId || null,
          createdAt: this.safeDate(userRow.CreatedDate),
          updatedAt: this.safeDate(userRow.ModifiedDate)
        };

        if (!user) {
          user = await this.prisma.user.create({
            data: {
              id: newUserId,
              ...userData
            }
          });
          importedUsers++;
        } else {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: userData
          });
          updatedUsers++;
        }

        userMap.set(legacyIdStr, user.id);
        userMap.set(email, user.id);
        if (orgId) {
          userOrgMap.set(legacyIdStr, orgId);
          userOrgMap.set(email, orgId);
        }
        if (legacyCode) {
          userLegacyCodeMap.set(legacyCode, user.id);
        }

        if (orgId && userRoleId) {
          await this.prisma.userOrganization.upsert({
            where: {
              userId_organizationId: {
                userId: user.id,
                organizationId: orgId
              }
            },
            update: {
              roleId: userRoleId,
              isPrimary: true
            },
            create: {
              userId: user.id,
              organizationId: orgId,
              roleId: userRoleId,
              isPrimary: true
            }
          });
        }
      } catch (err: any) {
        this.logger.error(`Error migrating user: ${err.message}`);
        skippedRows++;
        failures.push({ row: userRow, error: err.message });
      }
    }

    // 2nd Pass for parent-child organization hierarchy
    for (const userRow of usersData) {
      try {
        const legacyIdStr = String(userRow.Id || '').trim();
        const parentUserIdStr = String(userRow.ParentUserID || '').trim();

        if (parentUserIdStr && parentUserIdStr !== '0' && parentUserIdStr !== '-1' && parentUserIdStr !== legacyIdStr) {
          const userOrgId = userOrgMap.get(legacyIdStr);
          let parentOrgId = userOrgMap.get(parentUserIdStr);

          if (!parentOrgId && parentUserIdStr) {
            const siblings = await this.prisma.user.findMany({
              where: { parentUserId: parentUserIdStr },
              include: { role: true }
            });

            const nonEndUsers = siblings.filter(u => u.role && u.role.name !== 'EndUser' && u.role.name !== 'Operator');
            let mainUser = nonEndUsers.find(u => u.role && (u.role.name.toLowerCase().includes('warehouse') || u.role.name.toLowerCase().includes('distributor')));
            if (!mainUser) {
              mainUser = nonEndUsers.find(u => u.role && u.role.name.toLowerCase().includes('admin'));
            }
            if (!mainUser && nonEndUsers.length > 0) {
              mainUser = nonEndUsers.find(u => u.organizationId && !u.email.toLowerCase().includes('report'));
              if (!mainUser) mainUser = nonEndUsers[0];
            }

            if (mainUser && mainUser.organizationId) {
              parentOrgId = mainUser.organizationId;
            }
          }

          // Never re-parent the rootOrg ΓÇö it must always stay at the top
          if (userOrgId && parentOrgId && userOrgId !== parentOrgId && userOrgId !== rootOrg?.id) {
            await this.prisma.organization.update({
              where: { id: userOrgId },
              data: { parentId: parentOrgId }
            });
          }
        }
      } catch (err: any) {
        this.logger.warn(`Failed to link parent organization: ${err.message}`);
      }
    }



    const result = {
      importedUsers,
      updatedUsers,
      importedOrgs,
      updatedOrgs,
      skippedRows,
      failures: failures.slice(0, 1000)
    };

    const fileName = [
      usersFile && !Array.isArray(usersFile) ? (usersFile as Express.Multer.File).originalname : '',
      userRolesFile && !Array.isArray(userRolesFile) ? (userRolesFile as Express.Multer.File).originalname : ''
    ].filter(Boolean).join(', ');

    await this.logMigration({
      module: 'users',
      fileName: fileName || 'Uploaded User CSV Files',
      status: skippedRows === 0 ? 'SUCCESS' : (importedUsers + importedOrgs > 0 ? 'PARTIAL' : 'FAILED'),
      processed: usersData.length + userRolesData.length,
      created: importedUsers + importedOrgs,
      updated: updatedUsers + updatedOrgs,
      failed: skippedRows,
      details: result
    });

    return result;
  }

  async migrateLicenses(licensesFile: Express.Multer.File | any[], licenseDealersFile?: Express.Multer.File | any[], sourceName?: string) {
    let importedLicenses = 0;
    let updatedLicenses = 0;
    let skippedRows = 0;
    const failures: any[] = [];

    if (!licensesFile) {
      throw new Error('Licenses file is required');
    }

    const licensesData = Array.isArray(licensesFile) ? licensesFile : await this.parseCsvBuffer((licensesFile as Express.Multer.File).buffer);
    const licenseDealersData = licenseDealersFile ? (Array.isArray(licenseDealersFile) ? licenseDealersFile : await this.parseCsvBuffer((licenseDealersFile as Express.Multer.File).buffer)) : [];

    // Sort assignments by LicenseAssignID ascending to ensure chronological order
    licenseDealersData.sort((a, b) => {
      const idA = parseInt(a.LicenseAssignID || a.LicenseAssignId || '0') || 0;
      const idB = parseInt(b.LicenseAssignID || b.LicenseAssignId || '0') || 0;
      return idA - idB;
    });

    // Map of LicenseID -> any[] (assignment rows)
    const licenseDealerMap = new Map<string, any[]>();
    for (const ld of licenseDealersData) {
      const licId = String(ld.LicenseID || '').trim();
      if (licId) {
        if (!licenseDealerMap.has(licId)) {
          licenseDealerMap.set(licId, []);
        }
        licenseDealerMap.get(licId)!.push(ld);
      }
    }

    // Cache existing organizations and users for ownership resolution
    const orgs = await this.prisma.organization.findMany({
      select: { id: true, legacyId: true, parentId: true }
    });
    const orgMap = new Map<string, any>(); // DB ID -> org
    const orgLegacyMap = new Map<string, string>(); // legacyId -> DB Org ID
    orgs.forEach(o => {
      orgMap.set(o.id, o);
      if (o.legacyId) {
        orgLegacyMap.set(o.legacyId, o.id);
      }
    });

    const getOrgHierarchy = (orgId: string): string[] => {
      const hierarchy: string[] = [];
      let current = orgMap.get(orgId);
      while (current) {
        hierarchy.push(current.id);
        if (current.parentId && current.parentId !== current.id) {
          current = orgMap.get(current.parentId);
        } else {
          break;
        }
      }
      return hierarchy.reverse(); // Root first, leaf last
    };

    const dbUsers = await this.prisma.user.findMany({
      where: { organizationId: { not: null } },
      select: { id: true, organizationId: true }
    });
    const userOrgMap = new Map<string, string>(); // dbUserId -> DB Org ID
    dbUsers.forEach(u => {
      userOrgMap.set(u.id, u.organizationId!);
    });

    const resolveOrgId = (legacyUserId: string): string | undefined => {
      if (!legacyUserId) return undefined;
      const directOrgId = orgLegacyMap.get(legacyUserId);
      if (directOrgId) return directOrgId;
      const dbUserId = this.parseOrCreateUuid(legacyUserId);
      return userOrgMap.get(dbUserId);
    };

    // Fetch organization types and root organization context
    const orgTypes = await this.prisma.organizationType.findMany();
    const parentType = orgTypes.find(o => o.name === 'parent') || orgTypes[0];
    
    // Find rootOrg by 'parent' type first (consistent with migrateUsers)
    let rootOrg = await this.prisma.organization.findFirst({
      where: { organizationTypeId: parentType?.id }
    });
    if (!rootOrg) {
      rootOrg = await this.prisma.organization.findFirst({
        where: { name: { contains: 'Flashgard', mode: 'insensitive' } }
      });
    }
    if (!rootOrg && parentType) {
      rootOrg = await this.prisma.organization.create({
        data: {
          name: 'Flashgard',
          organizationTypeId: parentType.id
        }
      });
    }

    const batchCache = new Map<string, any>();

    for (const lic of licensesData) {
      try {
        const licenseId = String(lic.LicenseID || lic.Licenseid || '').trim();
        const licenseKey = String(lic.LicenseKey || '').trim();
        if (!licenseId || !licenseKey) {
          skippedRows++;
          failures.push({ row: lic, error: 'LicenseID or LicenseKey is missing' });
          continue;
        }

        let finalOrgId: string | undefined = undefined;
        let transferPath: string[] = [];
        let batchCreatedDate = this.safeDate(lic.CreatedDate) || new Date();

        // 1. Collect all dealer assignments
        const assignments = licenseDealerMap.get(licenseId) || [];
        
        // Use the first assignment's created date for the batch if available
        if (assignments.length > 0 && assignments[0].CreatedDate) {
          batchCreatedDate = this.safeDate(assignments[0].CreatedDate) || batchCreatedDate;
        }

        // 2. Resolve the target org
        let targetDealerOrgId: string | undefined = undefined;
        for (let i = assignments.length - 1; i >= 0; i--) {
          const ld = assignments[i];
          const dealerId = String(ld.DealerID || '').trim();
          targetDealerOrgId = resolveOrgId(dealerId);
          if (targetDealerOrgId) {
            break;
          }
        }

        if (!targetDealerOrgId) {
          const assignUserId = String(lic.AssignUserID || lic.AssignUserId || '').trim();
          const ownerId = String(lic.OwnerID || lic.OwnerId || '').trim();
          targetDealerOrgId = resolveOrgId(assignUserId) || resolveOrgId(ownerId);
        }

        if (targetDealerOrgId) {
          finalOrgId = targetDealerOrgId;
          // Build hierarchy from root down to this target org
          transferPath = getOrgHierarchy(targetDealerOrgId);
        } else if (rootOrg) {
          finalOrgId = rootOrg.id;
          transferPath = [rootOrg.id];
        }

        if (!finalOrgId || transferPath.length === 0) {
          skippedRows++;
          failures.push({ row: lic, error: 'Failed to resolve organization ownership hierarchy' });
          continue;
        }

        // The first owner is the root of the path
        const initialOwnerId = transferPath[0];

        const decodedKey = this.decodeHex(licenseKey);
        const encryptedKey = encryptLicenseKey(decodedKey);
        const licenseUuid = this.parseOrCreateUuid(licenseId);

        let existingLicense = await (this.prisma as any).orgLicense.findUnique({
          where: { id: licenseUuid }
        });
        if (!existingLicense) {
          existingLicense = await (this.prisma as any).orgLicense.findUnique({
            where: { key: encryptedKey }
          });
        }

        const createdByStr = String(lic.CreatedBy || 'SYS').trim().substring(0, 8);
        const createdDateStr = String(lic.CreatedDate || '').trim();
        let batchCode = 'LEGACY-BATCH';
        if (createdDateStr) {
          const dt = new Date(createdDateStr);
          if (!isNaN(dt.getTime())) {
            const pad = (n: number) => n.toString().padStart(2, '0');
            batchCode = `BATCH-${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}-${pad(dt.getHours())}${pad(dt.getMinutes())}${pad(dt.getSeconds())}-${createdByStr.toUpperCase()}`;
          }
        }

        let batch = batchCache.get(batchCode);
        if (!batch) {
          batch = await (this.prisma as any).orgLicenseBatch.findUnique({
            where: { batchCode }
          });
          if (!batch && rootOrg) {
            let batchTenantId = initialOwnerId;
            if (assignments.length > 0) {
              const firstAssignment = assignments[0];
              const firstDealerId = String(firstAssignment.DealerID || '').trim();
              const firstDealerOrgId = resolveOrgId(firstDealerId);
              if (firstDealerOrgId) {
                batchTenantId = firstDealerOrgId;
              }
            }

            const sysAdmin = await this.prisma.user.findFirst({
              where: { isSuperAdmin: true }
            });
            if (sysAdmin) {
              batch = await (this.prisma as any).orgLicenseBatch.create({
                data: {
                  batchCode,
                  licenseType: 'PRO',
                  totalCount: 0,
                  createdBy: sysAdmin.id,
                  tenantId: batchTenantId,
                  createdAt: batchCreatedDate
                }
              });
            }
          }
          if (batch) {
            batchCache.set(batchCode, batch);
          }
        }

        if (!batch) {
          skippedRows++;
          failures.push({ row: lic, error: `Failed to resolve or create license batch: ${batchCode}` });
          continue;
        }

        const licenseData = {
          key: encryptedKey,
          batchId: batch.id,
          status: 'ACTIVE' as const,
          ownerId: finalOrgId,
          tenantId: initialOwnerId,
          legacyId: licenseId,
          activatedAt: batchCreatedDate,
          startDate: batchCreatedDate,
          licenseName: lic.LicenseName || lic.Name || null,
          referenceName: lic.ReferenceName || null
        };

        if (!existingLicense) {
          existingLicense = await (this.prisma as any).orgLicense.create({
            data: {
              id: licenseUuid,
              ...licenseData,
              createdAt: batchCreatedDate
            }
          });
          importedLicenses++;

          // Generate Transfers!
          if (transferPath.length > 1) {
            for (let i = 0; i < transferPath.length - 1; i++) {
              const fromOrgId = transferPath[i];
              const toOrgId = transferPath[i + 1];
              
              if (fromOrgId === toOrgId) continue;
              
              await (this.prisma as any).licensingTransfer.create({
                data: {
                  fromOrgId: fromOrgId,
                  toOrgId: toOrgId,
                  status: 'APPROVED',
                  tenantId: initialOwnerId,
                  resolvedAt: batchCreatedDate,
                  createdAt: batchCreatedDate,
                  items: {
                    create: {
                      licenseId: existingLicense.id
                    }
                  }
                }
              });
            }
          }

        } else {
          existingLicense = await (this.prisma as any).orgLicense.update({
            where: { id: existingLicense.id },
            data: licenseData
          });
          updatedLicenses++;
        }

        // Create historical LicensingTransfers for this license
        for (const ld of assignments) {
          try {
            const fromId = String(ld.CreatedBy || '').trim();
            const toId = String(ld.DealerID || '').trim();
            const fromOrgId = resolveOrgId(fromId);
            const toOrgId = resolveOrgId(toId);
            const assignId = String(ld.LicenseAssignID || ld.LicenseAssignId || '').trim();
            
            if (fromOrgId && toOrgId && fromOrgId !== toOrgId && assignId) {
              const transferUuid = this.parseOrCreateUuid(`transfer-${assignId}`);
              const transferItemUuid = this.parseOrCreateUuid(`transfer-item-${assignId}`);
              const createdDate = this.safeDate(ld.CreatedDate);
              
              await (this.prisma as any).licensingTransfer.upsert({
                where: { id: transferUuid },
                update: {
                  fromOrgId,
                  toOrgId,
                  status: 'COMPLETED',
                  resolvedAt: createdDate,
                  tenantId: toOrgId
                },
                create: {
                  id: transferUuid,
                  fromOrgId,
                  toOrgId,
                  status: 'COMPLETED',
                  createdAt: createdDate,
                  resolvedAt: createdDate,
                  tenantId: toOrgId
                }
              });
              
              await (this.prisma as any).licensingTransferItem.upsert({
                where: { id: transferItemUuid },
                update: {
                  transferId: transferUuid,
                  licenseId: existingLicense.id
                },
                create: {
                  id: transferItemUuid,
                  transferId: transferUuid,
                  licenseId: existingLicense.id
                }
              });
            }
          } catch (err: any) {
            this.logger.warn(`Failed to migrate transfer for assignment ID ${ld.LicenseAssignID}: ${err.message}`);
          }
        }
      } catch (err: any) {
        this.logger.error(`Error migrating license: ${err.message}`);
        skippedRows++;
        failures.push({ row: lic, error: err.message });
      }
    }

    const result = {
      importedLicenses,
      updatedLicenses,
      skippedRows,
      failures: failures.slice(0, 1000)
    };

    const fileName = [
      licensesFile && !Array.isArray(licensesFile) ? (licensesFile as Express.Multer.File).originalname : '',
      licenseDealersFile && !Array.isArray(licenseDealersFile) ? (licenseDealersFile as Express.Multer.File).originalname : ''
    ].filter(Boolean).join(', ');

    await this.logMigration({
      module: 'licenses',
      fileName: fileName || 'Uploaded License CSV Files',
      status: skippedRows === 0 ? 'SUCCESS' : (importedLicenses > 0 ? 'PARTIAL' : 'FAILED'),
      processed: licensesData.length + licenseDealersData.length,
      created: importedLicenses,
      updated: updatedLicenses,
      failed: skippedRows,
      details: result
    });

    return result;
  }

  async migrateMobileUsers(mobileUsersFile: Express.Multer.File | any[], sourceName?: string) {
    let importedUsers = 0;
    let updatedUsers = 0;
    let importedLicenses = 0;
    let updatedLicenses = 0;
    let skippedRows = 0;
    const failures: any[] = [];

    if (!mobileUsersFile) {
      throw new Error('Mobile users file is required');
    }

    const mobileUsersData = Array.isArray(mobileUsersFile)
      ? mobileUsersFile
      : await this.parseCsvBuffer((mobileUsersFile as Express.Multer.File).buffer);

    // Cache organizations and users
    const orgs = await this.prisma.organization.findMany({
      where: { legacyId: { not: null } },
      select: { id: true, legacyId: true }
    });
    const orgLegacyMap = new Map<string, string>();
    orgs.forEach(o => {
      orgLegacyMap.set(o.legacyId!, o.id);
    });

    const dbUsers = await this.prisma.user.findMany({
      where: { organizationId: { not: null } },
      select: { id: true, organizationId: true }
    });
    const userOrgMap = new Map<string, string>();
    dbUsers.forEach(u => {
      userOrgMap.set(u.id, u.organizationId!);
    });

    const resolveOrgId = (legacyUserId: string): string | undefined => {
      if (!legacyUserId) return undefined;
      const directOrgId = orgLegacyMap.get(legacyUserId);
      if (directOrgId) return directOrgId;
      const dbUserId = this.parseOrCreateUuid(legacyUserId);
      return userOrgMap.get(dbUserId);
    };

    // Fetch organization types and root organization context
    const orgTypes = await this.prisma.organizationType.findMany();
    const parentType = orgTypes.find(o => o.name === 'parent') || orgTypes[0];
    
    let rootOrg = await this.prisma.organization.findFirst({
      where: { name: { contains: 'Flashgard', mode: 'insensitive' } }
    });
    if (!rootOrg && parentType) {
      rootOrg = await this.prisma.organization.create({
        data: {
          name: 'Flashgard',
          organizationTypeId: parentType.id
        }
      });
    }

    let licenseBatch = await (this.prisma as any).orgLicenseBatch.findUnique({
      where: { batchCode: 'LEGACY-MIGRATION' }
    });
    if (!licenseBatch && rootOrg) {
      const sysAdmin = await this.prisma.user.findFirst({
        where: { isSuperAdmin: true }
      });
      if (sysAdmin) {
        licenseBatch = await (this.prisma as any).orgLicenseBatch.create({
          data: {
            batchCode: 'LEGACY-MIGRATION',
            licenseType: 'PRO',
            totalCount: 0,
            createdBy: sysAdmin.id,
            tenantId: rootOrg.id
          }
        });
      }
    }

    // Find or create MobileUser role
    const allCurrentRoles = await (this.prisma.role as any).findMany();
    let mobileUserRole = allCurrentRoles.find((r: any) => r.name.toLowerCase() === 'mobileuser' || r.name.toLowerCase() === 'mobile user');
    if (!mobileUserRole) {
      mobileUserRole = await (this.prisma.role as any).create({
        data: {
          name: 'MobileUser',
          description: 'Legacy Mobile App User Role',
          isSystemRole: true,
          isRestricted: false,
          organizationId: null
        }
      });
    }
    const userRoleId = mobileUserRole.id;

    for (const mobileRow of mobileUsersData) {
      try {
        const legacyIdStr = String(mobileRow.MobileAppUserID || '').trim();
        const legacyCode = parseInt(legacyIdStr) || null;
        const email = String(mobileRow.Email || '').trim().toLowerCase();
        const phone = String(mobileRow.Phone || '').trim();
        const passwordHash = this.decodeHex(String(mobileRow.Password || '').trim());
        const createdDate = this.safeDate(mobileRow.CreatedDate);

        if (!email) {
          skippedRows++;
          failures.push({ row: mobileRow, error: 'Mobile user email is missing' });
          continue;
        }

        const licenseId = String(mobileRow.LicenseID || mobileRow.LicenseId || '').trim();
        let orgId: string | undefined = undefined;
        let existingLicense: any = null;

        if (licenseId) {
          const licenseUuid = this.parseOrCreateUuid(licenseId);
          existingLicense = await (this.prisma as any).orgLicense.findUnique({
            where: { id: licenseUuid }
          });
          if (existingLicense) {
            orgId = existingLicense.ownerId;
          } else {
            // Try fallback by legacyId
            existingLicense = await (this.prisma as any).orgLicense.findFirst({
              where: { legacyId: licenseId }
            });
            if (existingLicense) {
              orgId = existingLicense.ownerId;
            }
          }
        }

        // Fallback to legacy OwnerID / LoginID
        if (!orgId) {
          const legacyOwnerIdStr = String(mobileRow.OwnerID || mobileRow.LoginID || '').trim();
          orgId = resolveOrgId(legacyOwnerIdStr);
        }

        // Fallback to rootOrg
        if (!orgId) {
          orgId = rootOrg?.id;
        }

        if (!orgId) {
          skippedRows++;
          failures.push({ row: mobileRow, error: 'Failed to resolve organization' });
          continue;
        }

        // Ensure user is created in the User table
        const newUserId = this.parseOrCreateUuid(`mobile-${legacyIdStr}`);
        let user = await this.prisma.user.findFirst({
          where: { OR: [ { id: newUserId }, { email } ] }
        });

        const userData = {
          email,
          passwordHash,
          firstName: 'Mobile App',
          lastName: phone || 'User',
          isActive: true,
          isDeleted: false,
          legacyId: legacyCode,
          organizationId: orgId,
          roleId: userRoleId,
          createdAt: createdDate,
          updatedAt: createdDate
        };

        if (!user) {
          user = await this.prisma.user.create({
            data: {
              id: newUserId,
              ...userData
            }
          });
          importedUsers++;
        } else {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: {
              legacyId: legacyCode,
              passwordHash,
              organizationId: orgId,
              roleId: userRoleId
            }
          });
          updatedUsers++;
        }

        let licenseKey = String(mobileRow.LicenseKey || '').trim();

        if (licenseBatch) {
          let encryptedKey: string | null = null;
          if (licenseKey) {
            const decodedKey = this.decodeHex(licenseKey);
            encryptedKey = encryptLicenseKey(decodedKey);
          } else if (existingLicense) {
            encryptedKey = existingLicense.key;
          }

          if (encryptedKey) {
            if (!existingLicense) {
              existingLicense = await (this.prisma as any).orgLicense.findUnique({
                where: { key: encryptedKey }
              });
            }

            const licenseData: any = {
              key: encryptedKey,
              batchId: licenseBatch.id,
              status: 'ACTIVE' as const,
              ownerId: orgId,
              tenantId: orgId,
              machineId: mobileRow.MachineID || null,
              macAddress: mobileRow.BluetoothMac || null,
              activatedAt: createdDate,
              startDate: createdDate
            };

            const incomingName = mobileRow.LicenseName || mobileRow.Name;
            if (incomingName) {
              licenseData.licenseName = incomingName;
            } else if (existingLicense?.licenseName) {
              licenseData.licenseName = existingLicense.licenseName;
            } else {
              licenseData.licenseName = null;
            }

            const incomingRefName = mobileRow.ReferenceName;
            if (incomingRefName) {
              licenseData.referenceName = incomingRefName;
            } else if (existingLicense?.referenceName) {
              licenseData.referenceName = existingLicense.referenceName;
            } else {
              licenseData.referenceName = null;
            }

            if (!existingLicense) {
              existingLicense = await (this.prisma as any).orgLicense.create({
                data: {
                  ...licenseData,
                  createdAt: createdDate
                }
              });
              importedLicenses++;
            } else {
              existingLicense = await (this.prisma as any).orgLicense.update({
                where: { id: existingLicense.id },
                data: licenseData
              });
              updatedLicenses++;
            }

            // Create/Initialize Entity Wallet for the machine
            if (mobileRow.MachineID) {
              await (this.prisma as any).entityWallet.upsert({
                where: { machineId: mobileRow.MachineID },
                update: {
                  tenantId: orgId
                },
                create: {
                  machineId: mobileRow.MachineID,
                  tenantId: orgId,
                  balance: 0,
                  totalCredits: 0,
                  usedCredits: 0
                }
              });
            }
          }
        }

        // Create UserOrganization relation
        if (userRoleId) {
          await this.prisma.userOrganization.upsert({
            where: {
              userId_organizationId: {
                userId: user.id,
                organizationId: orgId
              }
            },
            update: {
              roleId: userRoleId,
              isPrimary: true
            },
            create: {
              userId: user.id,
              organizationId: orgId,
              roleId: userRoleId,
              isPrimary: true
            }
          });
        }
      } catch (err: any) {
        this.logger.error(`Error migrating mobile user: ${err.message}`);
        skippedRows++;
        failures.push({ row: mobileRow, error: err.message });
      }
    }

    const result = {
      importedUsers,
      updatedUsers,
      importedLicenses,
      updatedLicenses,
      skippedRows,
      failures: failures.slice(0, 1000)
    };

    await this.logMigration({
      module: 'mobile-users',
      fileName: sourceName || (!Array.isArray(mobileUsersFile) ? (mobileUsersFile as Express.Multer.File).originalname : 'Uploaded Mobile Users CSV File'),
      status: skippedRows === 0 ? 'SUCCESS' : (importedUsers + importedLicenses > 0 ? 'PARTIAL' : 'FAILED'),
      processed: mobileUsersData.length,
      created: importedUsers + importedLicenses,
      updated: updatedUsers + updatedLicenses,
      failed: skippedRows,
      details: result
    });

    return result;
  }

  async migrateCutCredits(dealerAssignFile: Express.Multer.File | any[], countFile?: Express.Multer.File | any[], sourceName?: string) {
    let importedCredits = 0;
    let updatedCredits = 0;
    let skippedRows = 0;
    const failures: any[] = [];

    if (!dealerAssignFile) {
      throw new Error('CutCreditAssignDealer file is required');
    }

    const assignData = Array.isArray(dealerAssignFile) ? dealerAssignFile : await this.parseCsvBuffer((dealerAssignFile as Express.Multer.File).buffer);
    const countData = countFile ? (Array.isArray(countFile) ? countFile : await this.parseCsvBuffer((countFile as Express.Multer.File).buffer)) : [];

    const countMap = new Map<string, any>();
    countData.forEach(c => {
      const dealerId = String(c.DealerID || '').trim();
      if (dealerId && !countMap.has(dealerId)) {
        countMap.set(dealerId, c);
      }
    });

    const processedDealersForCount = new Set<string>();

    const orgs = await this.prisma.organization.findMany({
      where: { legacyId: { not: null } },
      select: { id: true, legacyId: true }
    });
    const orgLegacyMap = new Map<string, string>();
    orgs.forEach(o => orgLegacyMap.set(o.legacyId!, o.id));

    const dbUsers = await this.prisma.user.findMany({
      where: { organizationId: { not: null } },
      select: { id: true, organizationId: true }
    });
    const userOrgMap = new Map<string, string>();
    dbUsers.forEach(u => userOrgMap.set(u.id, u.organizationId!));

    const resolveOrgId = (legacyUserId: string): string | undefined => {
      if (!legacyUserId) return undefined;
      const directOrgId = orgLegacyMap.get(legacyUserId);
      if (directOrgId) return directOrgId;
      const dbUserId = this.parseOrCreateUuid(legacyUserId);
      return userOrgMap.get(dbUserId);
    };

    let rootOrg = await this.prisma.organization.findFirst({
      where: { name: { contains: 'Flashgard', mode: 'insensitive' } }
    });
    if (!rootOrg) {
      const orgTypes = await this.prisma.organizationType.findMany();
      const parentType = orgTypes.find(o => o.name === 'parent') || orgTypes[0];
      if (parentType) {
        rootOrg = await this.prisma.organization.create({
          data: { name: 'Flashgard', organizationTypeId: parentType.id }
        });
      }
    }

    const sysAdmin = await this.prisma.user.findFirst({
      where: { isSuperAdmin: true }
    });

    for (const assign of assignData) {
      try {
        const legacyId = parseInt(assign.Id) || null;
        if (!legacyId) {
          skippedRows++;
          failures.push({ row: assign, error: 'Legacy Id missing' });
          continue;
        }

        const dealerId = String(assign.DealerId || assign.DealerID || '').trim();
        const ownerId = String(assign.OwnerId || assign.OwnerID || '').trim();
        
        const orgId = resolveOrgId(dealerId) || resolveOrgId(ownerId) || rootOrg?.id;
        const fromOrgId = resolveOrgId(ownerId) || rootOrg?.id;
        if (!orgId) {
          skippedRows++;
          failures.push({ row: assign, error: 'Failed to resolve organization' });
          continue;
        }

        const countInfo = countMap.get(dealerId) || {};
        const createdDate = this.safeDate(assign.CreatedDate);
        
        const allocatedCredits = parseInt(assign.CutCredits) || 0;
        
        let legacyLicenseId: string | undefined = undefined;
        if (assign.LicenseId) {
          const l = await (this.prisma as any).orgLicense.findFirst({ where: { legacyId: String(assign.LicenseId) }});
          if (l) legacyLicenseId = l.id;
        }

        const cutCreditId = this.parseOrCreateUuid(`cutcredit-${legacyId}`);
        const existingCredit = await (this.prisma as any).cutCredit.findUnique({ where: { id: cutCreditId } });
        
        const creditData = {
          planType: 'USAGE',
          credits: allocatedCredits,
          validityDays: null,
          ownerId: orgId,
          tenantId: fromOrgId,
          licenseId: legacyLicenseId || null,
          createdAt: createdDate
        };

        if (!existingCredit) {
          await this.prisma.$transaction(async (tx) => {
            const grant = await (tx as any).cutCredit.create({
              data: {
                id: cutCreditId,
                ...creditData,
                legacyCutCredit: {
                  create: {
                    legacyId,
                    legacyCountId: parseInt(countInfo.CutcreditAssignCountID) || null,
                    cutCredits: parseInt(assign.CutCredits) || null,
                    cutCreditType: assign.CutCreditType || null,
                    rate: assign.Rate ? parseFloat(assign.Rate) : null,
                    paidAmount: assign.PaidAmount ? parseFloat(assign.PaidAmount) : null,
                    isOffer: assign.IsOffer === 'true' || assign.IsOffer === '1',
                    description: assign.Description || null,
                    legacyDealerId: dealerId,
                    legacyOwnerId: ownerId,
                    legacyAssignedTo: String(assign.AssignedUserId || '').trim(),
                    totalCutcredit: parseInt(countInfo.TotalCutcredit) || null,
                    usedCutcredit: parseInt(countInfo.UsedCutcredit) || null
                  }
                }
              }
            });

            if (allocatedCredits > 0) {
              let wallet = await (tx as any).entityWallet.findUnique({ where: { orgId: orgId } });
              if (!wallet) {
                wallet = await (tx as any).entityWallet.create({
                  data: {
                    orgId: orgId,
                    tenantId: rootOrg?.id || orgId,
                    balance: 0,
                    totalCredits: 0
                  }
                });
              }

              await (tx as any).entityWallet.update({
                where: { id: wallet.id },
                data: {
                  balance: { increment: allocatedCredits },
                  totalCredits: { increment: allocatedCredits },
                  lastRechargedAt: createdDate || new Date()
                }
              });

              await (tx as any).creditTransaction.create({
                data: {
                  walletId: wallet.id,
                  amount: allocatedCredits,
                  type: 'CREDIT',
                  source: grant.id,
                  tenantId: fromOrgId,
                  isOffer: assign.IsOffer === 'true' || assign.IsOffer === '1',
                  notes: assign.Description || null
                }
              });

              // Apply aggregated used credits once per dealer
              if (countInfo.DealerID && !processedDealersForCount.has(dealerId)) {
                processedDealersForCount.add(dealerId);
                const totalUsed = parseInt(countInfo.UsedCutcredit) || 0;
                if (totalUsed > 0) {
                  await (tx as any).entityWallet.update({
                    where: { id: wallet.id },
                    data: {
                      balance: { decrement: totalUsed },
                      usedCredits: { increment: totalUsed }
                    }
                  });
                  await (tx as any).creditTransaction.create({
                    data: {
                      walletId: wallet.id,
                      amount: totalUsed,
                      type: 'DEBIT',
                      source: 'LEGACY-USAGE',
                      notes: 'Aggregated legacy usage',
                      tenantId: orgId
                    }
                  });
                }
              }
            }
          });
          importedCredits++;
        } else {
          await (this.prisma as any).cutCredit.update({
            where: { id: cutCreditId },
            data: {
              ...creditData,
              legacyCutCredit: {
                update: {
                  legacyId,
                  legacyCountId: parseInt(countInfo.CutcreditAssignCountID) || null,
                  cutCredits: parseInt(assign.CutCredits) || null,
                  cutCreditType: assign.CutCreditType || null,
                  rate: assign.Rate ? parseFloat(assign.Rate) : null,
                  paidAmount: assign.PaidAmount ? parseFloat(assign.PaidAmount) : null,
                  isOffer: assign.IsOffer === 'true' || assign.IsOffer === '1',
                  description: assign.Description || null,
                  legacyDealerId: dealerId,
                  legacyOwnerId: ownerId,
                  legacyAssignedTo: String(assign.AssignedUserId || '').trim(),
                  totalCutcredit: parseInt(countInfo.TotalCutcredit) || null,
                  usedCutcredit: parseInt(countInfo.UsedCutcredit) || null
                }
              }
            }
          });
          updatedCredits++;
        }
      } catch (err: any) {
        this.logger.error(`Error migrating cut credit: ${err.message}`);
        skippedRows++;
        failures.push({ row: assign, error: err.message });
      }
    }

    const result = {
      importedCredits,
      updatedCredits,
      skippedRows,
      failures: failures.slice(0, 1000)
    };

    await this.logMigration({
      module: 'cut-credits',
      fileName: sourceName || (!Array.isArray(dealerAssignFile) ? (dealerAssignFile as Express.Multer.File).originalname : 'Uploaded Cut Credits CSV File'),
      status: skippedRows === 0 ? 'SUCCESS' : (importedCredits > 0 ? 'PARTIAL' : 'FAILED'),
      processed: assignData.length,
      created: importedCredits,
      updated: updatedCredits,
      failed: skippedRows,
      details: result
    });

    return result;
  }

  async migrateMobileAppCuts(
    mobileCutsFile: Express.Multer.File | any[],
    sourceName?: string,
    mapsCache?: {
      orgLegacyMap: Map<string, string>;
      userLegacyMap: Map<string, string>;
      modelLegacyMap: Map<number, string>;
      modelCutFileLegacyMap: Map<number, string>;
      licenseMap: Map<string, any>;
    }
  ) {
    let importedLogs = 0;
    let skippedRows = 0;
    const failures: any[] = [];

    if (!mobileCutsFile) {
      throw new Error('MobileAppCuts file is required');
    }

    const cutsData = Array.isArray(mobileCutsFile) ? mobileCutsFile : await this.parseCsvBuffer((mobileCutsFile as Express.Multer.File).buffer);

    const orgLegacyMap: Map<string, string> = mapsCache?.orgLegacyMap || await (async () => {
      const orgs = await this.prisma.organization.findMany({
        where: { legacyId: { not: null } },
        select: { id: true, legacyId: true }
      });
      const map = new Map<string, string>();
      orgs.forEach(o => map.set(o.legacyId!.toLowerCase(), o.id));
      return map;
    })();

    const userLegacyMap: Map<string, string> = mapsCache?.userLegacyMap || await (async () => {
      const users = await this.prisma.user.findMany({
        where: { legacyId: { not: null } },
        select: { id: true, legacyId: true }
      });
      const map = new Map<string, string>();
      users.forEach(u => map.set(String(u.legacyId).toLowerCase(), u.id));
      return map;
    })();

    const modelLegacyMap: Map<number, string> = mapsCache?.modelLegacyMap || await (async () => {
      const models = await this.prisma.model.findMany({
        where: { legacyId: { not: null } },
        select: { id: true, legacyId: true }
      });
      const map = new Map<number, string>();
      models.forEach(m => map.set(m.legacyId!, m.id));
      return map;
    })();

    const modelCutFileLegacyMap: Map<number, string> = mapsCache?.modelCutFileLegacyMap || await (async () => {
      const cutFiles = await this.prisma.modelCutFile.findMany({
        where: { legacyId: { not: null } },
        select: { id: true, legacyId: true }
      });
      const map = new Map<number, string>();
      cutFiles.forEach(cf => map.set(cf.legacyId!, cf.id));
      return map;
    })();

    const licenseMap: Map<string, any> = mapsCache?.licenseMap || await (async () => {
      const licenses = await (this.prisma as any).orgLicense.findMany({
        select: { id: true, key: true, ownerId: true }
      });
      const map = new Map<string, any>();
      licenses.forEach((l: any) => map.set(l.key, { id: l.id, ownerId: l.ownerId }));
      return map;
    })();

    // Build lookup of organizationId -> mobileUserId to resolve users for cut logs
    const orgToMobileUserMap: Map<string, string> = await (async () => {
      const map = new Map<string, string>();
      const uos = await this.prisma.userOrganization.findMany({
        where: {
          role: {
            name: { equals: 'MobileUser', mode: 'insensitive' }
          }
        },
        select: {
          userId: true,
          organizationId: true
        }
      });
      uos.forEach(uo => map.set(uo.organizationId, uo.userId));

      const users = await this.prisma.user.findMany({
        where: {
          role: {
            name: { equals: 'MobileUser', mode: 'insensitive' }
          },
          organizationId: { not: null }
        },
        select: {
          id: true,
          organizationId: true
        }
      });
      users.forEach(u => map.set(u.organizationId!, u.id));
      return map;
    })();

    const batchSize = 1000;
    let batchData: any[] = [];

    for (const row of cutsData) {
      try {
        const modelLegacyId = parseInt(row.CatalogID || row.CatalogId);
        const modelId = !isNaN(modelLegacyId) ? modelLegacyMap.get(modelLegacyId) : null;

        const modelCutFileLegacyId = parseInt(row.ModelID || row.ModelId);
        const modelCutFileId = !isNaN(modelCutFileLegacyId) ? modelCutFileLegacyMap.get(modelCutFileLegacyId) : null;
        
        let licenseId = null;
        let organizationId = null;
        let userId = null;

        const rawLicenseKey = String(row.LicenseKey || '').replace(/\0/g, '').trim();
        if (rawLicenseKey) {
          const decodedKey = this.decodeHex(rawLicenseKey);
          const encryptedKey = encryptLicenseKey(decodedKey);
          const licInfo = licenseMap.get(encryptedKey);
          if (licInfo) {
            licenseId = licInfo.id;
            organizationId = licInfo.ownerId;
            if (organizationId) {
              userId = orgToMobileUserMap.get(organizationId) || null;
            }
          }
        }

        // Fallback to PromoterID mapping if userId could not be resolved via license owner organization
        if (!userId) {
          const promoterId = String(row.PromoterID || '').trim().toLowerCase();
          userId = promoterId ? userLegacyMap.get(promoterId) : null;
        }

        const brandName = row.ParentName || null;
        const modelName = row.CatalogName || null;
        const patternName = row.ModelName || null;

        const isPositive = row.IsPositiveCut === '1' || row.IsPositiveCut === 1 || row.IsPositiveCut === 'true' || row.IsPositiveCut === true;

        batchData.push({
          appUniqueId: row.AppUniqueID || null,
          licenseId: licenseId,
          modelId: modelId,
          modelCutFileId: modelCutFileId,
          organizationId: organizationId,
          userId: userId,
          brandName: brandName,
          modelName: modelName,
          patternName: patternName,
          qrCode: row.QRCode || null,
          instruction: row.Instruction || null,
          plotterId: row.PlotterID || null,
          latitude: row.Latitude ? parseFloat(row.Latitude) : null,
          longitude: row.Longitude ? parseFloat(row.Longitude) : null,
          isPositiveCut: isPositive,
          reviews: row.Reviews || null,
          createdAt: this.safeDate(row.CreatedDate) || new Date()
        });

        if (batchData.length >= batchSize) {
          await this.executeBatchRaw(batchData);
          importedLogs += batchData.length;
          batchData = [];
          
          // Let the event loop breathe to prevent OOM
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      } catch (err: any) {
        skippedRows++;
        if (failures.length < 1000) {
          failures.push({ row, error: err.message });
        }
      }
    }

    if (batchData.length > 0) {
      try {
        await this.executeBatchRaw(batchData);
        importedLogs += batchData.length;
      } catch (err: any) {
        skippedRows += batchData.length;
        if (failures.length < 1000) {
          failures.push({ row: batchData[0], error: 'Batch failed: ' + err.message });
        }
      }
    }

    const result = {
      importedLogs,
      skippedRows,
      failures: failures.slice(0, 1000)
    };

    await this.logMigration({
      module: 'mobile-app-cuts',
      fileName: sourceName || (!Array.isArray(mobileCutsFile) ? (mobileCutsFile as Express.Multer.File).originalname : 'Uploaded Mobile Cuts CSV File'),
      status: skippedRows === 0 ? 'SUCCESS' : (importedLogs > 0 ? 'PARTIAL' : 'FAILED'),
      processed: cutsData.length,
      created: importedLogs,
      updated: 0,
      failed: skippedRows,
      details: result
    });

    return result;
  }

  async migrateDealerMasterQRs(fileOrRows: Express.Multer.File | any[], sourceName?: string) {
    if (!fileOrRows) throw new Error('File or rows are required');
    const data = Array.isArray(fileOrRows) ? fileOrRows : await this.parseCsvBuffer((fileOrRows as Express.Multer.File).buffer);
    let imported = 0;
    let skipped = 0;
    const failures: any[] = [];

    const orgs = await this.prisma.organization.findMany({
      where: { legacyId: { not: null } },
      select: { id: true, legacyId: true }
    });
    const orgMap = new Map<string, string>();
    orgs.forEach(o => orgMap.set(o.legacyId!.toLowerCase(), o.id));

    const users = await this.prisma.user.findMany({
      where: { legacyId: { not: null } },
      select: { id: true, legacyId: true }
    });
    const userMap = new Map<string, string>();
    users.forEach(u => userMap.set(String(u.legacyId).toLowerCase(), u.id));

    const defaultAdmin = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { in: ['admin@flashgard.in', 'admin@flashgard.com'] } },
          { isSuperAdmin: true }
        ]
      }
    });
    const defaultAdminId = defaultAdmin?.id;

    const batchSize = 1000;
    let batchData: any[] = [];

    for (const row of data) {
      try {
        const dealerLegacyId = String(row.DealerID || '').trim().toLowerCase();
        const dealerId = orgMap.get(dealerLegacyId);
        if (!dealerId) throw new Error(`Dealer legacy ID ${dealerLegacyId} not found`);

        const ownerLegacyId = String(row.OwnerID || '').trim().toLowerCase();
        const ownerId = orgMap.get(ownerLegacyId);
        if (!ownerId) throw new Error(`Owner legacy ID ${ownerLegacyId} not found`);

        const creatorLegacyId = String(row.CreatedBy || '').trim().toLowerCase();
        let createdById = userMap.get(creatorLegacyId);
        if (!createdById) {
          if (defaultAdminId) {
            createdById = defaultAdminId;
          } else {
            throw new Error(`Creator legacy ID ${creatorLegacyId} not found and no admin fallback user exists`);
          }
        }

        const legacyId = row.MasterQRID ? parseInt(row.MasterQRID) : null;
        const masterQRCode = String(row.MasterQRCode || '').trim();
        const masterProduct = String(row.MasterProduct || '').trim();
        const force = row.Force ? parseInt(row.Force) : 30;
        const speed = row.Speed ? parseInt(row.Speed) : 10;
        const isActive = row.IsActive === '1' || row.IsActive === 'true' || row.IsActive === true;

        batchData.push({
          legacyId,
          dealerId,
          masterQRCode,
          masterProduct,
          ownerId,
          createdById,
          isActive,
          force,
          speed,
          createdAt: this.safeDate(row.Createddate) || new Date()
        });

        if (batchData.length >= batchSize) {
          await this.prisma.dealerMasterQR.createMany({
            data: batchData,
            skipDuplicates: true
          });
          imported += batchData.length;
          batchData = [];
        }
      } catch (err: any) {
        skipped++;
        if (failures.length < 1000) {
          failures.push({ row, error: err.message });
        }
      }
    }

    if (batchData.length > 0) {
      await this.prisma.dealerMasterQR.createMany({
        data: batchData,
        skipDuplicates: true
      });
      imported += batchData.length;
    }

    const result = {
      imported,
      skipped,
      failures: failures.slice(0, 1000)
    };

    await this.logMigration({
      module: 'dealer-master-qrs',
      fileName: sourceName || (!Array.isArray(fileOrRows) ? (fileOrRows as Express.Multer.File).originalname : 'Uploaded Dealer Master QRs File'),
      status: skipped === 0 ? 'SUCCESS' : (imported > 0 ? 'PARTIAL' : 'FAILED'),
      processed: data.length,
      created: imported,
      updated: 0,
      failed: skipped,
      details: result
    });

    return result;
  }

  async migrateRoles(rolesFile: Express.Multer.File | any[], sourceName?: string) {
    let importedRoles = 0;
    let updatedRoles = 0;
    let skippedRows = 0;
    const failures: any[] = [];

    if (!rolesFile) {
      throw new Error('Roles file is required');
    }

    const rolesData = Array.isArray(rolesFile) ? rolesFile : await this.parseCsvBuffer((rolesFile as Express.Multer.File).buffer);

    for (const roleRow of rolesData) {
      try {
        const legacyId = String(roleRow.Id || '').trim();
        const roleName = String(roleRow.Name || '').trim();
        if (!roleName) {
          skippedRows++;
          failures.push({ row: roleRow, error: 'Role name is missing' });
          continue;
        }

        let existingRole = await (this.prisma.role as any).findFirst({
          where: { OR: [ { legacyId }, { name: { equals: roleName, mode: 'insensitive' } } ] }
        });

        if (!existingRole) {
          existingRole = await (this.prisma.role as any).create({
            data: {
              name: roleName,
              description: `Legacy Role: ${roleName}`,
              legacyId,
              isSystemRole: false,
              isRestricted: false,
              organizationId: null
            }
          });
          importedRoles++;
        } else {
          existingRole = await (this.prisma.role as any).update({
            where: { id: existingRole.id },
            data: { legacyId }
          });
          updatedRoles++;
        }
      } catch (err: any) {
        this.logger.error(`Error migrating role: ${err.message}`);
        skippedRows++;
        failures.push({ row: roleRow, error: err.message });
      }
    }

    const result = {
      importedRoles,
      updatedRoles,
      skippedRows,
      failures: failures.slice(0, 1000)
    };

    await this.logMigration({
      module: 'roles',
      fileName: sourceName || (!Array.isArray(rolesFile) ? (rolesFile as Express.Multer.File).originalname : 'Uploaded Roles CSV File'),
      status: skippedRows === 0 ? 'SUCCESS' : (importedRoles > 0 ? 'PARTIAL' : 'FAILED'),
      processed: rolesData.length,
      created: importedRoles,
      updated: updatedRoles,
      failed: skippedRows,
      details: result
    });

    return result;
  }

  private decodeHex(input: string): string {
    if (!input) return input;
    let current = input.trim();
    
    for (let i = 0; i < 2; i++) {
      if (/^[0-9a-fA-F]+$/.test(current) && current.length % 2 === 0) {
        try {
          const decodedUtf16 = Buffer.from(current, 'hex').toString('utf16le');
          const isPrintableUtf16 = /^[\x20-\x7E]*$/.test(decodedUtf16);
          if (isPrintableUtf16 && decodedUtf16.length > 0) {
            current = decodedUtf16;
            continue;
          }

          const decodedAscii = Buffer.from(current, 'hex').toString('utf8');
          const isPrintableAscii = /^[\x20-\x7E]*$/.test(decodedAscii);
          if (isPrintableAscii && decodedAscii.length > 0) {
            current = decodedAscii;
            continue;
          }
        } catch (e) {
          break;
        }
      }
      break;
    }
    return current;
  }

  async cleanData(module: string) {
    this.logger.log(`Cleaning migration data for module: ${module}`);
    
    if (module === 'users' || module === 'all') {
      // 1. Delete licensing transfers, wallets and licenses
      await (this.prisma as any).licensingTransferItem.deleteMany({});
      await (this.prisma as any).licensingTransfer.deleteMany({});
      await this.prisma.entityWallet.deleteMany({});
      await (this.prisma as any).orgLicense.deleteMany({});
      await (this.prisma as any).orgLicenseBatch.deleteMany({});
      
      // 2. Delete user organizations (non-admin)
      const admins = await this.prisma.user.findMany({
        where: {
          OR: [
            { email: { in: ['admin@flashgard.in', 'admin@flashgard.com'] } },
            { isSuperAdmin: true }
          ]
        }
      });
      const adminIds = admins.map(a => a.id);
      
      await this.prisma.userOrganization.deleteMany({
        where: adminIds.length > 0 ? { userId: { notIn: adminIds } } : undefined
      });
      
      // 3. Delete non-admin users
      await this.prisma.user.deleteMany({
        where: adminIds.length > 0 ? { id: { notIn: adminIds } } : undefined
      });

      // 4. Delete non-root organizations
      const adminOrgIds = admins.map(a => a.organizationId).filter(Boolean) as string[];
      const rootOrgs = await this.prisma.organization.findMany({
        where: {
          OR: [
            { name: { in: ['Flashgard', 'Flashgard HQ', 'Flashgard Internal'] } },
            { id: { in: adminOrgIds } }
          ]
        }
      });
      const rootOrgIds = rootOrgs.map(org => org.id);

      if (rootOrgIds.length > 0) {
        // Nullify QR codes
        await this.prisma.qRCode.updateMany({
          where: {
            OR: [
              { assignedOrgId: { notIn: rootOrgIds } },
              { assignedDealerId: { notIn: rootOrgIds } }
            ]
          },
          data: {
            assignedOrgId: null,
            assignedDealerId: null
          }
        });

        // Delete dealer master QRs
        await this.prisma.dealerMasterQR.deleteMany({
          where: { dealerId: { notIn: rootOrgIds } }
        });

        // Delete cut credits
        await (this.prisma as any).cutCredit?.deleteMany({
          where: {
            OR: [
              { ownerId: { notIn: rootOrgIds } },
              { tenantId: { notIn: rootOrgIds } }
            ]
          }
        });

        // Delete credit transactions
        await (this.prisma as any).creditTransaction?.deleteMany({
          where: { tenantId: { notIn: rootOrgIds } }
        });

        // Delete entity wallets
        await (this.prisma as any).entityWallet?.deleteMany({
          where: {
            OR: [
              { orgId: { notIn: rootOrgIds } },
              { tenantId: { notIn: rootOrgIds } }
            ]
          }
        });

        // Delete security alerts
        await (this.prisma as any).securityAlert?.deleteMany({
          where: { tenantId: { notIn: rootOrgIds } }
        });

        // Delete licensing transfers
        await (this.prisma as any).licensingTransfer?.deleteMany({
          where: {
            OR: [
              { fromOrgId: { notIn: rootOrgIds } },
              { toOrgId: { notIn: rootOrgIds } },
              { tenantId: { notIn: rootOrgIds } }
            ]
          }
        });

        // Delete work orders & work order outputs
        const workOrdersToDelete = await this.prisma.workOrder.findMany({
          where: { orgId: { notIn: rootOrgIds } },
          select: { id: true }
        });
        const workOrderIds = workOrdersToDelete.map(w => w.id);
        if (workOrderIds.length > 0) {
          await this.prisma.workOrderOutput.deleteMany({
            where: { workOrderId: { in: workOrderIds } }
          });
          await this.prisma.workOrder.deleteMany({
            where: { id: { in: workOrderIds } }
          });
        }

        // Delete dispatch orders
        const dispatchesToDelete = await this.prisma.dispatchOrder.findMany({
          where: {
            OR: [
              { fromOrgId: { notIn: rootOrgIds } },
              { toOrgId: { notIn: rootOrgIds } }
            ]
          },
          select: { id: true }
        });
        const dispatchIds = dispatchesToDelete.map(d => d.id);
        if (dispatchIds.length > 0) {
          await this.prisma.dispatchOrderItem.deleteMany({
            where: { dispatchOrderId: { in: dispatchIds } }
          });
          await this.prisma.dispatchOrder.deleteMany({
            where: { id: { in: dispatchIds } }
          });
        }

        // Delete return requests & credit notes
        const returnsToDelete = await this.prisma.returnRequest.findMany({
          where: { requestingDealerId: { notIn: rootOrgIds } },
          select: { id: true }
        });
        const returnIds = returnsToDelete.map(r => r.id);
        if (returnIds.length > 0) {
          await this.prisma.creditNote.deleteMany({
            where: { returnRequestId: { in: returnIds } }
          });
          await this.prisma.returnRequestItem.deleteMany({
            where: { returnRequestId: { in: returnIds } }
          });
          await this.prisma.returnRequest.deleteMany({
            where: { id: { in: returnIds } }
          });
        }

        // Nullify machine cut logs references
        await this.prisma.machineCutLog.updateMany({
          where: {
            OR: [
              { userId: adminIds.length > 0 ? { notIn: adminIds } : undefined },
              { organizationId: { notIn: rootOrgIds } }
            ].filter(Boolean) as any
          },
          data: {
            userId: null,
            organizationId: null
          }
        });
      }

      await this.prisma.address.deleteMany({
        where: rootOrgIds.length > 0 ? { organizationId: { notIn: rootOrgIds } } : undefined
      });
      await this.prisma.contact.deleteMany({
        where: rootOrgIds.length > 0 ? { organizationId: { notIn: rootOrgIds } } : undefined
      });

      await this.prisma.organization.deleteMany({
        where: rootOrgIds.length > 0 ? { id: { notIn: rootOrgIds } } : undefined
      });
    }

    if (module === 'licenses' || module === 'all') {
      await (this.prisma as any).licensingTransferItem.deleteMany({});
      await (this.prisma as any).licensingTransfer.deleteMany({});
      await this.prisma.entityWallet.deleteMany({});
      await (this.prisma as any).orgLicense.deleteMany({});
      await (this.prisma as any).orgLicenseBatch.deleteMany({});
    }

    if (module === 'cut-credits' || module === 'all') {
      await (this.prisma as any).legacyCutCredit?.deleteMany({});
      
      // Cut credits no longer use licensing transfers or batches
      await (this.prisma as any).creditTransaction?.deleteMany({});
      await (this.prisma as any).entityWallet?.deleteMany({});
      await (this.prisma as any).cutCredit?.deleteMany({});
    }

    if (module === 'mobile-users' || module === 'all') {
      const mobileUserRole = await (this.prisma.role as any).findFirst({
        where: { name: { in: ['MobileUser', 'Mobile User'] } }
      });
      if (mobileUserRole) {
        await this.prisma.userOrganization.deleteMany({
          where: { roleId: mobileUserRole.id }
        });
        await this.prisma.user.deleteMany({
          where: { roleId: mobileUserRole.id }
        });
      }
      await (this.prisma as any).orgLicense.updateMany({
        data: {
          machineId: null,
          macAddress: null
        }
      });
      await this.prisma.entityWallet.deleteMany({});
    }

    if (module === 'roles' || module === 'all') {
      await (this.prisma as any).role.deleteMany({
        where: { legacyId: { not: null } }
      });
    }

    if (module === 'catalog' || module === 'all') {
      await this.prisma.modelCutFile.deleteMany({});
      await this.prisma.model.deleteMany({});
      await this.prisma.brand.deleteMany({});
      await (this.prisma as any).modelCategory.deleteMany({});
    }

    if (module === 'skins' || module === 'all') {
      await (this.prisma as any).cutPattern.deleteMany({});
    }

    if (module === 'mobile-app-cuts' || module === 'all') {
      await this.prisma.machineCutLog.deleteMany({});
    }

    if (module === 'dealer-master-qrs' || module === 'all') {
      await this.prisma.dealerMasterQR.deleteMany({});
    }

    if (module === 'plotter-masters' || module === 'all') {
      await (this.prisma as any).plotterMasterLegacy.deleteMany({});
      await (this.prisma as any).plotterMaster.deleteMany({});
    }

    if (module === 'materials' || module === 'all') {
      await (this.prisma as any).material.deleteMany({});
      await (this.prisma as any).filmCategory.deleteMany({});
      await (this.prisma as any).materialCategory.deleteMany({});
      await (this.prisma as any).productType.deleteMany({});
    }

    // Delete matching migration logs
    await (this.prisma as any).migrationLog.deleteMany({
      where: module === 'all' ? undefined : { module }
    });

    return { success: true, message: `Successfully cleaned ${module} migration data.` };
  }

  async dbConnect(credentials: any) {
    const config = {
      user: credentials.user,
      password: credentials.password,
      server: credentials.server || credentials.host,
      database: credentials.database,
      port: parseInt(credentials.port || '1433'),
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    };
    try {
      const pool = await sql.connect(config);
      const result = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
      await pool.close();
      return { tables: result.recordset.map(r => r.TABLE_NAME) };
    } catch (err: any) {
      throw new BadRequestException('Database connection failed: ' + err.message);
    }
  }

  async dbRun(credentials: any, moduleType: string, tableMap: Record<string, string>) {
    const config = {
      user: credentials.user,
      password: credentials.password,
      server: credentials.server || credentials.host,
      database: credentials.database,
      port: parseInt(credentials.port || '1433'),
      options: {
        encrypt: false,
        trustServerCertificate: true
      },
      requestTimeout: 300000 // 5 minutes
    };
    const pool = await sql.connect(config);
    try {
      if (moduleType === 'catalog') {
        const rows = (await pool.request().query("SELECT * FROM [" + tableMap.file1 + "]")).recordset;
        return await this.migrateCatalog(rows, "MSSQL: " + tableMap.file1);
      } else if (moduleType === 'skins') {
        const rows = (await pool.request().query("SELECT * FROM [" + tableMap.file1 + "]")).recordset;
        return await this.migrateSkins(rows, "MSSQL: " + tableMap.file1);
      } else if (moduleType === 'roles') {
        const rows = (await pool.request().query("SELECT * FROM [" + tableMap.file1 + "]")).recordset;
        return await this.migrateRoles(rows, "MSSQL: " + tableMap.file1);
      } else if (moduleType === 'designs') {
        const models = await this.prisma.model.findMany({ where: { legacyId: { not: null } } });
        const modelCache = new Map<number, string>();
        models.forEach(m => modelCache.set(m.legacyId!, m.id));

        const cutPatterns = await (this.prisma as any).cutPattern.findMany();
        const cutPatternCache = new Map<string, string>();
        const cutPatternLegacyCache = new Map<number, string>();
        cutPatterns.forEach((cp: any) => {
            cutPatternCache.set(cp.name.toLowerCase(), cp.id);
            if (cp.legacyId) cutPatternLegacyCache.set(cp.legacyId, cp.id);
        });

        const existingFiles = await this.prisma.modelCutFile.findMany({
            select: { id: true, modelId: true, cutPatternId: true }
        });
        const existingFileMap = new Map<string, string>();
        existingFiles.forEach(f => existingFileMap.set(`${f.modelId}_${f.cutPatternId}`, f.id));

        const mapsCache = {
            modelCache,
            cutPatternCache,
            cutPatternLegacyCache,
            existingFileMap,
            skipLog: true
        };

        const colCheck = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '" + tableMap.file1 + "' AND COLUMN_NAME IN ('ModelMasterID', 'ModelID', 'ID')");
        const orderCol = colCheck.recordset.length > 0 ? colCheck.recordset[0].COLUMN_NAME : 'ModelID';

        let offset = 0;
        const limit = 1000;
        let hasMore = true;
        let totalImported = 0;
        let totalExisting = 0;
        let totalSkipped = 0;
        let totalDecryptionFailed = 0;
        let processedRows = 0;
        const allFailures: any[] = [];

        while (hasMore) {
          this.logger.log(`Fetching chunk for designs: OFFSET ${offset} LIMIT ${limit}`);
          let rows: any = (await pool.request().query(`SELECT * FROM [${tableMap.file1}] ORDER BY [${orderCol}] OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`)).recordset;

          if (rows.length === 0) {
            hasMore = false;
            break;
          }

          const result = await this.migrateDesigns(rows, rows.length, mapsCache);
          totalImported += result.importedFiles;
          totalExisting += result.existingFiles;
          totalSkipped += result.skippedRows;
          totalDecryptionFailed += result.decryptionFailed;
          processedRows += rows.length;

          if (allFailures.length < 1000) {
            allFailures.push(...result.failures.slice(0, 1000 - allFailures.length));
          }

          rows = [];
          offset += limit;

          await new Promise(resolve => setTimeout(resolve, 300));
          if ((global as any).gc) {
            try {
              (global as any).gc();
            } catch (e) {}
          }
        }

        const summaryResult = {
          importedFiles: totalImported,
          existingFiles: totalExisting,
          skippedRows: totalSkipped,
          decryptionFailed: totalDecryptionFailed,
          totalModelRows: processedRows,
          failures: allFailures.slice(0, 1000)
        };

        await this.logMigration({
          module: 'designs',
          fileName: "MSSQL Connection",
          status: (totalSkipped + totalDecryptionFailed) === 0 ? 'SUCCESS' : (totalImported + totalExisting > 0 ? 'PARTIAL' : 'FAILED'),
          processed: processedRows,
          created: totalImported,
          updated: totalExisting,
          failed: totalSkipped + totalDecryptionFailed,
          details: summaryResult
        });

        return summaryResult;
      } else if (moduleType === 'mobile-users') {
        const rows = (await pool.request().query("SELECT * FROM [" + tableMap.file1 + "]")).recordset;
        return await this.migrateMobileUsers(rows, "MSSQL: " + tableMap.file1);
      } else if (moduleType === 'users') {
        const userRows = (await pool.request().query("SELECT * FROM [" + tableMap.file1 + "]")).recordset;
        const roleRows = tableMap.file2 ? (await pool.request().query("SELECT * FROM [" + tableMap.file2 + "]")).recordset : [];
        return await this.migrateUsers(userRows, roleRows, "MSSQL: " + tableMap.file1);
      } else if (moduleType === 'licenses') {
        const licenseRows = (await pool.request().query("SELECT * FROM [" + tableMap.file1 + "]")).recordset;
        const assignRows = tableMap.file2 ? (await pool.request().query("SELECT * FROM [" + tableMap.file2 + "]")).recordset : [];
        return await this.migrateLicenses(licenseRows, assignRows, "MSSQL: " + tableMap.file1);
      } else if (moduleType === 'cut-credits') {
        const assignRows = (await pool.request().query("SELECT * FROM [" + tableMap.file1 + "]")).recordset;
        const countRows = tableMap.file2 ? (await pool.request().query("SELECT * FROM [" + tableMap.file2 + "]")).recordset : [];
        return await this.migrateCutCredits(assignRows, countRows, "MSSQL: " + tableMap.file1);
      } else if (moduleType === 'mobile-app-cuts') {
        // Pre-fetch maps cache once at service level before chunk loop
        const orgs = await this.prisma.organization.findMany({
          where: { legacyId: { not: null } },
          select: { id: true, legacyId: true }
        });
        const orgLegacyMap = new Map<string, string>();
        orgs.forEach(o => orgLegacyMap.set(o.legacyId!.toLowerCase(), o.id));

        const users = await this.prisma.user.findMany({
          where: { legacyId: { not: null } },
          select: { id: true, legacyId: true }
        });
        const userLegacyMap = new Map<string, string>();
        users.forEach(u => userLegacyMap.set(String(u.legacyId).toLowerCase(), u.id));

        const models = await this.prisma.model.findMany({
          where: { legacyId: { not: null } },
          select: { id: true, legacyId: true }
        });
        const modelLegacyMap = new Map<number, string>();
        models.forEach(m => modelLegacyMap.set(m.legacyId!, m.id));

        const licenses = await (this.prisma as any).orgLicense.findMany({
          select: { id: true, key: true, ownerId: true }
        });
        const licenseMap = new Map<string, any>();
        licenses.forEach((l: any) => licenseMap.set(l.key, { id: l.id, ownerId: l.ownerId }));

        const cutFiles = await this.prisma.modelCutFile.findMany({
          where: { legacyId: { not: null } },
          select: { id: true, legacyId: true }
        });
        const modelCutFileLegacyMap = new Map<number, string>();
        cutFiles.forEach(cf => modelCutFileLegacyMap.set(cf.legacyId!, cf.id));

        const mapsCache = {
          orgLegacyMap,
          userLegacyMap,
          modelLegacyMap,
          modelCutFileLegacyMap,
          licenseMap
        };

        let offset = 0;
        const limit = 10000;
        let hasMore = true;
        let totalImported = 0;
        let totalSkipped = 0;
        const allFailures: any[] = [];

        while (hasMore) {
          this.logger.log(`Fetching chunk for mobile-app-cuts: OFFSET ${offset} LIMIT ${limit}`);
          let rows: any = (await pool.request().query(`SELECT * FROM [${tableMap.file1}] ORDER BY MobileAppCutsID OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`)).recordset;
          
          if (rows.length === 0) {
            hasMore = false;
            break;
          }
          
          const result = await this.migrateMobileAppCuts(rows, `MSSQL: ${tableMap.file1} (OFFSET ${offset})`, mapsCache);
          totalImported += result.importedLogs;
          totalSkipped += result.skippedRows;
          
          if (allFailures.length < 1000) {
            allFailures.push(...result.failures.slice(0, 1000 - allFailures.length));
          }
          
          // Clear rows array to free memory
          rows = [];
          
          offset += limit;
          
          // Let garbage collector run between chunks
          await new Promise(resolve => setTimeout(resolve, 500));
          if ((global as any).gc) {
            try {
              (global as any).gc();
            } catch (e) {
              this.logger.warn('Failed to call global.gc() manually: ' + e.message);
            }
          }
        }
        
        return { 
          importedLogs: totalImported, 
          skippedRows: totalSkipped, 
          failures: allFailures 
        };
      } else if (moduleType === 'dealer-master-qrs') {
        const rows = (await pool.request().query("SELECT * FROM [" + tableMap.file1 + "]")).recordset;
        return await this.migrateDealerMasterQRs(rows, "MSSQL: " + tableMap.file1);
      } else if (moduleType === 'plotter-masters') {
        const rows = (await pool.request().query("SELECT * FROM [" + tableMap.file1 + "]")).recordset;
        return await this.migratePlotters(rows, "MSSQL: " + tableMap.file1);
      } else if (moduleType === 'materials') {
        const productTypes = (await pool.request().query("SELECT * FROM [" + tableMap.file1 + "]")).recordset;
        const categories = (await pool.request().query("SELECT * FROM [" + tableMap.file2 + "]")).recordset;
        const filmCategories = (await pool.request().query("SELECT * FROM [" + tableMap.file3 + "]")).recordset;
        const displayMaster = (await pool.request().query("SELECT * FROM [" + tableMap.file4 + "]")).recordset;
        return await this.migrateMaterialsSystem(
          productTypes,
          categories, // catsData is double-used as products since categories and products are both in MaterialMaster in MSSQL
          filmCategories,
          categories,
          displayMaster,
          "MSSQL Connection"
        );
      } else {
        throw new BadRequestException('Unsupported module type for DB migration: ' + moduleType);
      }
    } finally {
      await pool.close();
    }
  }

  async migratePlotters(fileOrRows: Express.Multer.File | any[], sourceName?: string) {
    if (!fileOrRows) throw new Error('File or rows are required');
    const data = Array.isArray(fileOrRows) ? fileOrRows : await this.parseCsvBuffer((fileOrRows as Express.Multer.File).buffer);
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const failures: any[] = [];

    for (const row of data) {
      try {
        const legacyId = String(row.PlotterID || '').trim();
        if (!legacyId) {
          skipped++;
          failures.push({ row, error: 'PlotterID is required' });
          continue;
        }

        const plotterName = String(row.PlotterName || '').trim();
        const cutPointX = row.CutPointX ? parseFloat(row.CutPointX) : null;
        const cutPointY = row.CutPointY ? parseFloat(row.CutPointY) : null;

        // Suggested new fields:
        const manufacturer = String(row.Manufacturer || '').trim() || null;
        const connectionType = String(row.ConnectionType || '').trim() || null;
        const description = String(row.Description || '').trim() || null;
        const maxSpeed = row.MaxSpeed ? parseInt(row.MaxSpeed) : null;
        const maxForce = row.MaxForce ? parseInt(row.MaxForce) : null;
        const status = String(row.Status || 'ACTIVE').trim();

        // Legacy configuration parameters
        const scaleX = row.scale_x ? parseFloat(row.scale_x) : null;
        const scaleY = row.scale_y ? parseFloat(row.scale_y) : null;
        const displayX = row.display_x ? parseFloat(row.display_x) : null;
        const displayY = row.display_y ? parseFloat(row.display_y) : null;
        const scale90X = row.scale_90_x ? parseFloat(row.scale_90_x) : null;
        const scale90Y = row.scale_90_y ? parseFloat(row.scale_90_y) : null;
        const display90X = row.display_90_x ? parseFloat(row.display_90_x) : null;
        const display90Y = row.display_90_y ? parseFloat(row.display_90_y) : null;

        const supportGpgl = this.parseBit(row.SupportGPGL);
        const isRegistrationMarkSupport = this.parseBit(row.IsRegistrationMarkSupport);
        const isMovable = this.parseBit(row.IsMovable);
        const isLpgl = this.parseBit(row.IsLPGL);
        const isActive = this.parseBit(row.IsActive);
        const isDelete = this.parseBit(row.IsDelete);
        const isAndroid = this.parseBit(row.IsAndroid);

        const plotterType = String(row.PlotterType || '').trim() || null;
        const searchKeyword = String(row.SearchKeyword || '').trim() || null;
        const languageType = String(row.LanguageType || '').trim() || null;
        const driverType = String(row.DriverType || '').trim() || null;
        const endPoint = String(row.EndPoint || '').trim() || null;

        const basePenUp = row.BasePen_UP ? parseInt(row.BasePen_UP) : null;
        const basePenDown = row.BasePen_DOWN ? parseInt(row.BasePen_DOWN) : null;
        const targetPenUp = row.TargetPen_UP ? parseInt(row.TargetPen_UP) : null;
        const targetPenDown = row.TargetPen_DOWN ? parseInt(row.TargetPen_DOWN) : null;

        const baseXYSeparator = String(row.BaseXYSeperator || '').trim() || null;
        const xySeparator = String(row.XYSeperator || '').trim() || null;
        const startString = String(row.StartString || '').trim() || null;
        const endString = String(row.EndString || '').trim() || null;

        // Find or Create PlotterMaster
        let plotter = await (this.prisma as any).plotterMaster.findUnique({
          where: { legacyId }
        });

        if (!plotter) {
          plotter = await (this.prisma as any).plotterMaster.create({
            data: {
              legacyId,
              plotterName,
              cutPointX,
              cutPointY,
              manufacturer,
              connectionType,
              description,
              maxSpeed,
              maxForce,
              status
            }
          });
          imported++;
        } else {
          plotter = await (this.prisma as any).plotterMaster.update({
            where: { id: plotter.id },
            data: {
              plotterName,
              cutPointX,
              cutPointY,
              manufacturer,
              connectionType,
              description,
              maxSpeed,
              maxForce,
              status
            }
          });
          updated++;
        }

        // Upsert PlotterMasterLegacy
        await (this.prisma as any).plotterMasterLegacy.upsert({
          where: { plotterMasterId: plotter.id },
          update: {
            scaleX,
            scaleY,
            displayX,
            displayY,
            scale90X,
            scale90Y,
            display90X,
            display90Y,
            supportGpgl,
            isRegistrationMarkSupport,
            isMovable,
            isLpgl,
            isActive,
            isDelete,
            plotterType,
            searchKeyword,
            languageType,
            driverType,
            endPoint,
            basePenUp,
            basePenDown,
            targetPenUp,
            targetPenDown,
            baseXYSeparator,
            xySeparator,
            startString,
            endString,
            isAndroid
          },
          create: {
            plotterMasterId: plotter.id,
            scaleX,
            scaleY,
            displayX,
            displayY,
            scale90X,
            scale90Y,
            display90X,
            display90Y,
            supportGpgl,
            isRegistrationMarkSupport,
            isMovable,
            isLpgl,
            isActive,
            isDelete,
            plotterType,
            searchKeyword,
            languageType,
            driverType,
            endPoint,
            basePenUp,
            basePenDown,
            targetPenUp,
            targetPenDown,
            baseXYSeparator,
            xySeparator,
            startString,
            endString,
            isAndroid
          }
        });

      } catch (err: any) {
        skipped++;
        failures.push({ row, error: err.message });
      }
    }

    const result = {
      imported,
      updated,
      skipped,
      failures: failures.slice(0, 1000)
    };

    await this.logMigration({
      module: 'plotter-masters',
      fileName: sourceName || (!Array.isArray(fileOrRows) ? (fileOrRows as Express.Multer.File).originalname : 'Uploaded Plotter Master File'),
      status: skipped === 0 ? 'SUCCESS' : (imported + updated > 0 ? 'PARTIAL' : 'FAILED'),
      processed: data.length,
      created: imported,
      updated,
      failed: skipped,
      details: result
    });

    return result;
  }

  async migrateMaterialsSystem(
    productTypesFile: Express.Multer.File | any[],
    categoriesFile: Express.Multer.File | any[],
    filmCategoriesFile: Express.Multer.File | any[],
    productsFile: Express.Multer.File | any[],
    displayMasterFile: Express.Multer.File | any[],
    sourceName?: string
  ) {
    const pTypesData = Array.isArray(productTypesFile) ? productTypesFile : await this.parseCsvBuffer((productTypesFile as Express.Multer.File).buffer);
    const catsData = Array.isArray(categoriesFile) ? categoriesFile : await this.parseCsvBuffer((categoriesFile as Express.Multer.File).buffer);
    const filmCatsData = Array.isArray(filmCategoriesFile) ? filmCategoriesFile : await this.parseCsvBuffer((filmCategoriesFile as Express.Multer.File).buffer);
    const prodsData = Array.isArray(productsFile) ? productsFile : await this.parseCsvBuffer((productsFile as Express.Multer.File).buffer);
    const displaysData = Array.isArray(displayMasterFile) ? displayMasterFile : await this.parseCsvBuffer((displayMasterFile as Express.Multer.File).buffer);

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const failures: any[] = [];

    // 1. Migrate Product Types
    const productTypeMap = new Map<number, string>(); // legacyId -> DB UUID
    for (const row of pTypesData) {
      try {
        const legacyId = parseInt(row.ProductTypeID);
        if (isNaN(legacyId)) throw new Error('Invalid ProductTypeID');
        const name = String(row.ProductTypeName || '').trim();
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const isActive = row.IsActive !== undefined ? this.parseBit(row.IsActive) : true;
        const isDeleted = row.IsDeleted !== undefined ? this.parseBit(row.IsDeleted) : false;

        const record = await (this.prisma as any).productType.upsert({
          where: { legacyId },
          update: { name, slug, isActive, isDeleted },
          create: { legacyId, name, slug, isActive, isDeleted }
        });
        productTypeMap.set(legacyId, record.id);
        imported++;
      } catch (err: any) {
        skipped++;
        failures.push({ row, error: `ProductType Error: ${err.message}` });
      }
    }

    // 2. Migrate Material Categories (MaterialMaster where ParentID = -1)
    const materialCategoryMap = new Map<number, string>(); // legacyId -> DB UUID
    // We filter catsData for ParentID = -1 (or parentId === '-1')
    const categoryRows = catsData.filter(row => String(row.ParentID).trim() === '-1');
    for (const row of categoryRows) {
      try {
        const legacyId = parseInt(row.MaterialID);
        if (isNaN(legacyId)) throw new Error('Invalid MaterialID');
        const name = String(row.MaterialName || row.Name || '').trim();
        const description = String(row.Description || '').trim() || null;
        const isActive = row.IsActive !== undefined ? this.parseBit(row.IsActive) : true;
        const isDeleted = row.IsDelete !== undefined ? this.parseBit(row.IsDelete) : false;

        // Determine productTypeId. Legacy ProductTypeMaster records map to categories somehow?
        // Let's check ProductTypeID or default to first productType if missing.
        const ptLegacyId = parseInt(row.ProductTypeID);
        let productTypeId = !isNaN(ptLegacyId) ? productTypeMap.get(ptLegacyId) : null;
        if (!productTypeId && productTypeMap.size > 0) {
          productTypeId = Array.from(productTypeMap.values())[0];
        }
        if (!productTypeId) throw new Error('No valid ProductType found for category');

        const record = await (this.prisma as any).materialCategory.upsert({
          where: { legacyId },
          update: { name, description, isActive, isDeleted, productTypeId },
          create: { legacyId, name, description, isActive, isDeleted, productTypeId }
        });
        materialCategoryMap.set(legacyId, record.id);
        imported++;
      } catch (err: any) {
        skipped++;
        failures.push({ row, error: `MaterialCategory Error: ${err.message}` });
      }
    }

    // 3. Migrate Film Categories (ReportCategoryMaster)
    // FilmCategory needs materialCategoryId.
    // In legacy schema, ProductDisplayMaster maps MaterialID (product) to ReportCategoryID (film category).
    // A product (MaterialMaster where ParentID != -1) has a ParentID pointing to the MaterialCategory.
    // So we can establish: MaterialCategory (ParentID) -> Material (MaterialID) -> ProductDisplayMaster -> ReportCategoryID (Film Category)
    const filmCategoryMap = new Map<number, string>(); // legacyId -> DB UUID
    
    // Create maps from displaysData and catsData (product rows) to help trace category
    const productToCategoryLegacyIdMap = new Map<number, number>();
    catsData.forEach(row => {
      const parentId = parseInt(row.ParentID);
      const materialId = parseInt(row.MaterialID);
      if (!isNaN(parentId) && parentId !== -1 && !isNaN(materialId)) {
        productToCategoryLegacyIdMap.set(materialId, parentId);
      }
    });

    const filmCatToMaterialCatMap = new Map<number, number>(); // ReportCategoryID -> MaterialCategory legacy ID
    displaysData.forEach(row => {
      const materialId = parseInt(row.MaterialID);
      const reportCatId = parseInt(row.ReportCategoryID);
      if (!isNaN(materialId) && !isNaN(reportCatId)) {
        const matCatLegacyId = productToCategoryLegacyIdMap.get(materialId);
        if (matCatLegacyId) {
          filmCatToMaterialCatMap.set(reportCatId, matCatLegacyId);
        }
      }
    });

    for (const row of filmCatsData) {
      try {
        const legacyId = parseInt(row.ReportCategoryID);
        if (isNaN(legacyId)) throw new Error('Invalid ReportCategoryID');
        const name = String(row.ReportCategoryName || row.Name || '').trim();
        const isActive = row.IsActive !== undefined ? this.parseBit(row.IsActive) : true;

        // Resolve materialCategoryId
        const matCatLegacyId = filmCatToMaterialCatMap.get(legacyId);
        let materialCategoryId = matCatLegacyId ? materialCategoryMap.get(matCatLegacyId) : null;
        if (!materialCategoryId && materialCategoryMap.size > 0) {
          materialCategoryId = Array.from(materialCategoryMap.values())[0];
        }
        if (!materialCategoryId) throw new Error('No valid MaterialCategory found for FilmCategory');

        const record = await (this.prisma as any).filmCategory.upsert({
          where: { legacyId },
          update: { name, isActive, materialCategoryId },
          create: { legacyId, name, isActive, materialCategoryId }
        });
        filmCategoryMap.set(legacyId, record.id);
        imported++;
      } catch (err: any) {
        skipped++;
        failures.push({ row, error: `FilmCategory Error: ${err.message}` });
      }
    }

    // 4. Migrate Materials (MaterialMaster where ParentID != -1)
    const materialMap = new Map<number, string>(); // legacyId -> DB UUID
    const productRows = catsData.filter(row => String(row.ParentID).trim() !== '-1');
    
    // Create map from displayMaster (MaterialID -> ReportCategoryID) to link product to FilmCategory
    const productToFilmCatLegacyIdMap = new Map<number, number>();
    displaysData.forEach(row => {
      const materialId = parseInt(row.MaterialID);
      const reportCatId = parseInt(row.ReportCategoryID);
      if (!isNaN(materialId) && !isNaN(reportCatId)) {
        productToFilmCatLegacyIdMap.set(materialId, reportCatId);
      }
    });

    for (const row of productRows) {
      try {
        const legacyId = parseInt(row.MaterialID);
        if (isNaN(legacyId)) throw new Error('Invalid MaterialID');
        const name = String(row.MaterialName || row.Name || '').trim();
        const thickness = row.Thickness ? parseFloat(row.Thickness) : null;
        const layers = row.Layers ? parseInt(row.Layers) : 1;
        const minSpeed = row.MinSpeed ? parseInt(row.MinSpeed) : null;
        const minForce = row.MinForce ? parseInt(row.MinForce) : null;
        const isActive = row.IsActive !== undefined ? this.parseBit(row.IsActive) : true;
        const isDeleted = row.IsDelete !== undefined ? this.parseBit(row.IsDelete) : false;

        // Resolve filmCategoryId
        const filmCatLegacyId = productToFilmCatLegacyIdMap.get(legacyId);
        let filmCategoryId = filmCatLegacyId ? filmCategoryMap.get(filmCatLegacyId) : null;
        if (!filmCategoryId && filmCategoryMap.size > 0) {
          filmCategoryId = Array.from(filmCategoryMap.values())[0];
        }
        if (!filmCategoryId) throw new Error('No valid FilmCategory found for Material');

        const record = await (this.prisma as any).material.upsert({
          where: { legacyId },
          update: { name, thickness, layers, minSpeed, minForce, isActive, isDeleted, filmCategoryId },
          create: { legacyId, name, thickness, layers, minSpeed, minForce, isActive, isDeleted, filmCategoryId }
        });
        materialMap.set(legacyId, record.id);
        imported++;
      } catch (err: any) {
        skipped++;
        failures.push({ row, error: `Material Error: ${err.message}` });
      }
    }

    const result = {
      imported,
      updated,
      skipped,
      failures: failures.slice(0, 1000)
    };

    await this.logMigration({
      module: 'materials',
      fileName: sourceName || 'Uploaded Materials System Files',
      status: skipped === 0 ? 'SUCCESS' : (imported > 0 ? 'PARTIAL' : 'FAILED'),
      processed: pTypesData.length + catsData.length + filmCatsData.length + prodsData.length + displaysData.length,
      created: imported,
      updated,
      failed: skipped,
      details: result
    });

    return result;
  }
}

