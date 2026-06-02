import * as sql from 'mssql';
import { Injectable, Logger } from '@nestjs/common';
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
                        data: { name: row.Name, parentId: parentId, legacyId, legacyParentId, sortOrder: 0 } 
                    });
                    importedCategories++;
                } else {
                    await (this.prisma as any).modelCategory.update({ 
                        where: { id: category.id }, 
                        data: { legacyId, legacyParentId } 
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
                            const existingBrand = await this.prisma.brand.findFirst({ where: { legacyId: legacyParentId } });
                            if (existingBrand) {
                                brandId = existingBrand.id;
                                brandDbMap.set(parentCatalogID, brandId);
                                // We might not know the categoryId for this brand easily here, 
                                // but the brand relation is often enough or we can fetch it.
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
                            imageUrl: row.ImageUrl && row.ImageUrl !== 'NULL' ? `https://flash-buk-01.s3.ap-south-1.amazonaws.com/ScratchGardImages/Uploads/Owner/Catalog/${row.ImageUrl}` : null
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
                            imageUrl: row.ImageUrl && row.ImageUrl !== 'NULL' ? `https://flash-buk-01.s3.ap-south-1.amazonaws.com/ScratchGardImages/Uploads/Owner/Catalog/${row.ImageUrl}` : null
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

  // 3. Migrate Designs (Link Designs to existing Models via legacyId)
  async migrateDesigns(inputStream: Readable, totalBytes?: number) {
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

    let importedFiles = 0;
    let existingFiles = 0;
    let skippedRows = 0;
    let decryptionFailed = 0;
    let processedRows = 0;
    const failures: any[] = [];

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

    for await (const row of csvStream) {
        try {
            processedRows++;
            
            // Validate row has minimum expected columns
            if (!row || Object.keys(row).length < 6) {
                skippedRows++;
                continue;
            }

            if (processedRows % 500 === 0) {
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

            const legacyModelSkinId = parseInt(row[5]?.trim()) || 0;
            let cutPatternId = legacyModelSkinId > 0 ? cutPatternLegacyCache.get(legacyModelSkinId) : null;
            
            // FALLBACK: Match by Name if ID matching fails (Source IDs are inconsistent)
            if (!cutPatternId) {
                const skinName = (row[2] || '').trim();
                cutPatternId = cutPatternCache.get(skinName.toLowerCase());
            }
            
            if (!cutPatternId) {
                const skinName = (row[2] || '').trim();
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
            if (!instructionHex) { 
                skippedRows++; 
                failures.push({ 
                    model: row[1], 
                    pattern: row[2], 
                    error: 'Missing PLT data (column 5)' 
                });
                continue; 
            }

            const decryptedPlt = this.getDecryptedModel(instructionHex);
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

            const legacyId = parseInt(row[0]?.trim());
            const legacyParentId = legacyCatalogID; // The model ID is the parent for the cut file
            const existingFile = await this.prisma.modelCutFile.findFirst({
                where: { modelId, cutPatternId: cutPatternId! }
            });

            if (!existingFile) {
                await this.prisma.modelCutFile.create({
                    data: { modelId, cutPatternId: cutPatternId!, encryptedPltData: encryptedPlt, legacyId, legacyParentId, legacyModelSkinId }
                });
                importedFiles++;
            } else {
                await this.prisma.modelCutFile.update({
                    where: { id: existingFile.id },
                    data: { legacyId, legacyParentId, legacyModelSkinId }
                });
                existingFiles++;
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

    const result = { 
        importedFiles, 
        existingFiles, 
        skippedRows, 
        decryptionFailed, 
        totalModelRows: processedRows,
        failures: failures.slice(0, 1000)
    };

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
    const usersData = usersFile ? this.parseUsersCsvRobustly((usersFile as Express.Multer.File).buffer) : [];
    const userRolesData = userRolesFile ? await this.parseCsvBuffer((userRolesFile as Express.Multer.File).buffer) : [];

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
    const dealerType = orgTypes.find(o => o.name === 'dealer') || orgTypes.find(o => o.name === 'retailer') || orgTypes[0];
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
          const isDistributor = legacyRoleIds.some(lrId => {
            const role = allCurrentRoles.find((r: any) => r.legacyId === lrId);
            return (role?.name || '').toLowerCase().includes('distributor');
          });
          if (isDistributor) orgType = distributorType?.id;

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

          // Never re-parent the rootOrg — it must always stay at the top
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

    const licensesData = await this.parseCsvBuffer((licensesFile as Express.Multer.File).buffer);
    const licenseDealersData = licenseDealersFile ? await this.parseCsvBuffer((licenseDealersFile as Express.Multer.File).buffer) : [];

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
      where: { legacyId: { not: null } },
      select: { id: true, legacyId: true }
    });
    const orgLegacyMap = new Map<string, string>(); // legacyId -> DB Org ID
    orgs.forEach(o => {
      orgLegacyMap.set(o.legacyId!, o.id);
    });

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

        let orgId: string | undefined = undefined;

        // 1. Check dealer assignments from LicenseAssignDealer (latest assignment first)
        const assignments = licenseDealerMap.get(licenseId) || [];
        for (let i = assignments.length - 1; i >= 0; i--) {
          const ld = assignments[i];
          const dealerId = String(ld.DealerID || '').trim();
          const dealerOrgId = resolveOrgId(dealerId);
          if (dealerOrgId) {
            orgId = dealerOrgId;
            break;
          }
        }

        // 2. Check AssignUserID / OwnerID from LicenseMaster
        if (!orgId) {
          const assignUserId = String(lic.AssignUserID || lic.AssignUserId || '').trim();
          const ownerId = String(lic.OwnerID || lic.OwnerId || '').trim();
          orgId = resolveOrgId(assignUserId) || resolveOrgId(ownerId);
        }

        // 3. Fallback to rootOrg
        if (!orgId) {
          orgId = rootOrg?.id;
        }

        if (!orgId) {
          skippedRows++;
          failures.push({ row: lic, error: 'Failed to resolve organization ownership' });
          continue;
        }

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

        const licenseName = String(lic.LicenseName || lic.Licensename || '').trim();
        const batchIdx = licenseName.lastIndexOf('_');
        const batchCode = batchIdx !== -1 && /^\d+$/.test(licenseName.substring(batchIdx + 1)) 
          ? licenseName.substring(0, batchIdx) 
          : (licenseName || 'LEGACY-MIGRATION');

        let batch = batchCache.get(batchCode);
        if (!batch) {
          batch = await (this.prisma as any).orgLicenseBatch.findUnique({
            where: { batchCode }
          });
          if (!batch && rootOrg) {
            let batchTenantId = orgId;
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
                  createdAt: this.safeDate(lic.CreatedDate)
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
          ownerId: orgId,
          tenantId: orgId,
          legacyId: licenseId,
          activatedAt: this.safeDate(lic.CreatedDate),
          startDate: this.safeDate(lic.CreatedDate)
        };

        if (!existingLicense) {
          existingLicense = await (this.prisma as any).orgLicense.create({
            data: {
              id: licenseUuid,
              ...licenseData,
              createdAt: this.safeDate(lic.CreatedDate)
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

    const mobileUsersData = await this.parseCsvBuffer((mobileUsersFile as Express.Multer.File).buffer);

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

            const licenseData = {
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

  async migrateRoles(rolesFile: Express.Multer.File | any[], sourceName?: string) {
    let importedRoles = 0;
    let updatedRoles = 0;
    let skippedRows = 0;
    const failures: any[] = [];

    if (!rolesFile) {
      throw new Error('Roles file is required');
    }

    const rolesData = await this.parseCsvBuffer((rolesFile as Express.Multer.File).buffer);

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
      server: credentials.host,
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
      return result.recordset.map(r => r.TABLE_NAME);
    } catch (err: any) {
      throw new Error('Database connection failed: ' + err.message);
    }
  }

  async dbRun(credentials: any, moduleType: string, tableMap: Record<string, string>) {
    const config = {
      user: credentials.user,
      password: credentials.password,
      server: credentials.host,
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
        throw new Error('Direct DB migration for designs is not supported. Use Local Scan instead.');
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
      } else {
        throw new Error('Unsupported module type for DB migration: ' + moduleType);
      }
    } finally {
      await pool.close();
    }
  }
}
