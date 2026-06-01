import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { saveHpglAsJpg } from '../utils/hpgl-parser';
import { normalizeHpgl } from '../utils/hpgl-normalizer';
import * as path from 'path';
import * as crypto from 'crypto';

const ENCRYPTION_KEY = 'flashgard-secure-plt-data-key-32'; // Must be 32 chars
const IV_LENGTH = 16; 

@Injectable()
export class ModelCutFilesService {
  constructor(private prisma: PrismaService) {}

  private encrypt(data: Buffer): Buffer {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    // Prepend IV for decryption later
    return Buffer.concat([iv, encrypted]);
  }

  private decrypt(data: Buffer): Buffer {
    const iv = data.slice(0, IV_LENGTH);
    const encrypted = data.slice(IV_LENGTH);
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  async normalize(id: string) {
    const file = await (this.prisma as any).modelCutFile.findUnique({
      where: { id },
    });

    if (!file) throw new NotFoundException('File not found');

    try {
      // 1. Decrypt existing data
      const decrypted = this.decrypt(file.encryptedPltData);
      const pltString = decrypted.toString('utf-8');

      // 2. Normalize
      console.log(`[ModelCutFiles] Normalizing file ID: ${id}...`);
      const normalizedPlt = normalizeHpgl(pltString);

      // 3. Generate new preview JPG
      const fileName = `${Date.now()}-${file.modelId}-${file.cutPatternId}.jpg`;
      const outputDir = path.join(process.cwd(), 'uploads', 'designs');
      const designFilePath = await saveHpglAsJpg(normalizedPlt, outputDir, fileName);

      // 4. Update database
      const binaryData = this.encrypt(Buffer.from(normalizedPlt, 'utf-8'));
      return await (this.prisma as any).modelCutFile.update({
        where: { id },
        data: {
          encryptedPltData: binaryData,
          designFilePath: designFilePath, // Note: the field is 'designFilePath' in the schema check I just did
        },
      });
    } catch (err) {
      console.error('[ModelCutFiles] Error normalizing file:', err);
      throw err;
    }
  }

  async upload(file: any, modelId: string, cutPatternId: string) {
    return this.create({
      modelId,
      cutPatternId,
      encryptedPltData: file.buffer, // create expects Buffer or base64 string
    });
  }

  async create(data: any) {
    const rawData = typeof data.encryptedPltData === 'string' 
      ? Buffer.from(data.encryptedPltData, 'base64') 
      : data.encryptedPltData;

    let designFilePath = null;
    let processedData = rawData;
    
    try {
      const pltString = rawData.toString('utf-8');
      console.log('[ModelCutFiles] Received data length:', rawData.length);
      
      // Check if it's PLT/HPGL data
      if (pltString.includes('PU') || pltString.includes('PD') || pltString.includes('IN;')) {
          console.log('[ModelCutFiles] PLT detected, normalizing...');
          const normalizedPlt = normalizeHpgl(pltString);
          processedData = Buffer.from(normalizedPlt, 'utf-8');

          console.log('[ModelCutFiles] Generating JPG preview...');
          const fileName = `${Date.now()}-${data.modelId}-${data.cutPatternId}.jpg`;
          const outputDir = path.join(process.cwd(), 'uploads', 'designs');
          designFilePath = await saveHpglAsJpg(normalizedPlt, outputDir, fileName);
      }
    } catch (err) {
      console.error('[ModelCutFiles] Error processing PLT:', err);
    }

    // Now encrypt the processed (normalized) data for database storage
    const binaryData = this.encrypt(processedData);

    return (this.prisma as any).modelCutFile.create({
      data: {
        modelId: data.modelId,
        cutPatternId: data.cutPatternId,
        encryptedPltData: binaryData,
        encryptionKeyId: data.encryptionKeyId || null,
        designFilePath: designFilePath,
      },
    });
  }

  async findAll(modelId?: string, skip: number = 0, take: number = 50, search?: string) {
    const where: any = {};
    if (modelId) where.modelId = modelId;
    
    if (search) {
      where.OR = [
        { model: { name: { contains: search, mode: 'insensitive' } } },
        { cutPattern: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [items, total] = await Promise.all([
      (this.prisma as any).modelCutFile.findMany({
        where,
        skip: Number(skip),
        take: Number(take),
        include: {
          model: {
            include: {
              brand: true,
              category: true
            }
          },
          cutPattern: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).modelCutFile.count({ where })
    ]);

    return { items, total };
  }

  async findOne(id: string) {
    const item = await (this.prisma as any).modelCutFile.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException(`ModelCutFile with ID ${id} not found`);
    return item;
  }

  async remove(id: string) {
    return (this.prisma as any).modelCutFile.delete({
      where: { id },
    });
  }
}
