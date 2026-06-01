import * as fs from 'fs';
import { Injectable, ForbiddenException, NotFoundException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { InventoryException } from './inventory.exception';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private orgsService: OrganizationsService,
    private auditLogsService: AuditLogsService
  ) {}

  async isHQUser(user: any): Promise<boolean> {
    if (user.isSuperAdmin) return true;
    if (!user.organizationId) return false;

    const org = await (this.prisma as any).organization.findUnique({
      where: { id: user.organizationId },
      include: { organizationType: true },
    });

    if (!org) return false;
    return !org?.parentId || org?.organizationType?.name === 'parent' || org?.organizationType?.name === 'internal';
  }

  /**
   * For SuperAdmins who have no organizationId in the JWT (global context),
   * fall back to the first root-level org in the database so DB writes succeed.
   */
  private async resolveOrgId(user: any): Promise<string> {
    if (user.organizationId) return user.organizationId;

    if (user.isSuperAdmin) {
      const rootOrg = await (this.prisma as any).organization.findFirst({
        where: { parentId: null, isDeleted: false },
        orderBy: { createdAt: 'asc' },
      });
      if (rootOrg) return rootOrg.id;
      throw new InventoryException(
        'NO_ORG_FOUND',
        'No root organization exists. Please create an organization first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    throw new InventoryException(
      'ORG_ID_REQUIRED',
      'No organization assigned to user.',
      HttpStatus.BAD_REQUEST,
    );
  }

  private async generateBatchCode(filmTypeId: string, offset: number = 0, tx?: any): Promise<string> {
    const prismaClient = tx || this.prisma;
    const filmType = await (prismaClient as any).filmType.findUnique({ where: { id: filmTypeId } });
    if (!filmType) throw new InventoryException('FILM_TYPE_NOT_FOUND', 'Film type not found');

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const count = await (prismaClient as any).filmBatch.count({
      where: {
        filmTypeId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const sequence = (count + 1 + offset).toString().padStart(3, '0');
    // Slugify film type name (remove spaces, uppercase)
    const filmTypeName = filmType.name.replace(/\s+/g, '').toUpperCase();
    
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `FG-${filmTypeName}-${dateStr}-${sequence}-${randomSuffix}`;
  }

  private extractNumeric(str: string | null | undefined): number {
    if (!str) return 0;
    const match = str.match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : 0;
  }

  private calculateConsumption(wo: any, outputs: any[]): number {
    const src = wo.sourceFilmBatch;
    let totalConsumed = 0;

    if (wo.workOrderType === 'SLITTING') {
      const sourceArea = (src.rollLength || 0) * (src.rollWidth || 0);
      if (sourceArea <= 0) return 0;

      for (const output of outputs) {
        const outputArea = (output.rollLength || 0) * (output.rollWidth || 0);
        if (outputArea <= 0) continue;
        const unitsPerSource = sourceArea / outputArea;
        totalConsumed += Number(output.quantity) / unitsPerSource;
      }
    } else {
      // REPACKAGING
      const sourcePackCount = this.extractNumeric(src.packSize);
      if (sourcePackCount <= 0) return 0;

      for (const output of outputs) {
        const outputPackCount = this.extractNumeric(output.packSize);
        // Total pieces produced = quantity * outputPackCount
        // Total source units (e.g. boxes) consumed = Total pieces / sourcePackCount
        totalConsumed += (Number(output.quantity) * outputPackCount) / sourcePackCount;
      }
    }

    // Round to 2 decimal places as requested
    return Math.round(totalConsumed * 100) / 100;
  }

  // --- INWARD PROCUREMENT ---

  async createBulkInward(data: any, user: any) {
    if (!(await this.isHQUser(user))) {
      throw new InventoryException('UNAUTHORIZED_ACCESS', 'Only HQ users can log inward procurement.', HttpStatus.FORBIDDEN);
    }

    const orgId = await this.resolveOrgId(user);
    const batchCode = await this.generateBatchCode(data.filmTypeId);

    try {
      return await (this.prisma as any).filmBatch.create({
        data: {
          batchCode,
          filmTypeId: data.filmTypeId,
          vendorId: data.vendorId,
          orgId,
          quantity: data.quantity,
          packSize: data.packSize,
          batchType: 'BULK_RECEIVED',
          status: 'BULK_RECEIVED',
          arrivalDate: data.arrivalDate ? new Date(data.arrivalDate) : new Date(),
          notes: data.notes,
        },
      });
    } catch (e: any) {
      console.error('[BULK INWARD ERROR]', e.message, 'Code:', e.code, 'Meta:', JSON.stringify(e.meta));
      throw e;
    }
  }

  // --- INWARD RECEIPTS ---
  
  private async generateReceiptCode(): Promise<string> {
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const count = await (this.prisma as any).inwardReceipt.count({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const sequence = (count + 1).toString().padStart(3, '0');
    return `RC-${dateStr}-${sequence}`;
  }

  async findAllInwardReceipts(query: any, user: any) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    
    // Check HQ
    const orgId = await this.resolveOrgId(user);

          const [items, total] = await Promise.all([
      (this.prisma as any).inwardReceipt.findMany({
        where: {
          orgId,
          isDeleted: false,
          ...(query.receiptCode ? { receiptCode: { contains: query.receiptCode, mode: 'insensitive' } } : {}),
          ...(query.invoiceNumber ? { invoiceNumber: { contains: query.invoiceNumber, mode: 'insensitive' } } : {}),
        },
        include: {
          vendor: true,
          filmBatches: {
            where: { isDeleted: false }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: Number(skip),
        take: Number(limit),
      }),
      (this.prisma as any).inwardReceipt.count({
        where: {
          orgId,
          isDeleted: false,
          ...(query.receiptCode ? { receiptCode: { contains: query.receiptCode, mode: 'insensitive' } } : {}),
          ...(query.invoiceNumber ? { invoiceNumber: { contains: query.invoiceNumber, mode: 'insensitive' } } : {}),
        }
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createInwardReceipt(data: any, user: any) {
    if (!(await this.isHQUser(user))) {
      throw new InventoryException('UNAUTHORIZED_ACCESS', 'Only HQ users can create inward receipts.', HttpStatus.FORBIDDEN);
    }
    const orgId = await this.resolveOrgId(user);
    const receiptCode = await this.generateReceiptCode();

    return (this.prisma as any).inwardReceipt.create({
      data: {
        receiptCode,
        vendorId: data.vendorId,
        orgId,
        invoiceNumber: data.invoiceNumber,
        receivedDate: data.receivedDate ? new Date(data.receivedDate) : new Date(),
        notes: data.notes,
      }
    });
  }

  async deleteInwardReceipt(id: string, user: any) {
    if (!(await this.isHQUser(user))) {
      throw new InventoryException('UNAUTHORIZED_ACCESS', 'Only HQ users can delete inward receipts.', HttpStatus.FORBIDDEN);
    }
    
    // Soft delete
    return (this.prisma as any).inwardReceipt.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });
  }

  async createInwardProcurement(data: any, user: any) {
    if (!(await this.isHQUser(user))) {
      throw new InventoryException('UNAUTHORIZED_ACCESS', 'Only HQ users can log inward procurement.', HttpStatus.FORBIDDEN);
    }

    const orgId = await this.resolveOrgId(user);
    const { inwardReceiptId, notes, items } = data;

    let vendorId: string;
    let arrivalDate: Date;

    if (inwardReceiptId) {
      const receipt = await (this.prisma as any).inwardReceipt.findUnique({
        where: { id: inwardReceiptId }
      });
      if (!receipt) throw new InventoryException('RECEIPT_NOT_FOUND', 'Inward Receipt not found', HttpStatus.NOT_FOUND);
      vendorId = receipt.vendorId;
      arrivalDate = receipt.receivedDate;
    } else {
      // Legacy support or fallback if needed, though UI won't send it.
      vendorId = data.vendorId;
      arrivalDate = data.arrivalDate ? new Date(data.arrivalDate) : new Date();
      if (!vendorId) throw new InventoryException('INVALID_INPUT', 'Vendor or Inward Receipt is required.');
    }

    if (!items || !items.length) {
      throw new InventoryException('INVALID_INPUT', 'At least one batch item is required.');
    }

    try {
      return await (this.prisma as any).$transaction(async (tx: any) => {
        const results = [];
        const typeOffsets: Record<string, number> = {};

        for (const item of items) {
          const currentOffset = typeOffsets[item.filmTypeId] || 0;
          const batchCode = await this.generateBatchCode(item.filmTypeId, currentOffset, tx);
          typeOffsets[item.filmTypeId] = currentOffset + 1;
          
          // 1. Create Film Batch
          const batch = await tx.filmBatch.create({
            data: {
              batchCode,
              filmTypeId: item.filmTypeId,
              vendorId,
              orgId,
              inwardReceiptId,
              quantity: item.quantity,
              packSize: item.packSize,
              rollLength: item.rollLength ? Number(item.rollLength) : null,
              rollWidth: item.rollWidth ? Number(item.rollWidth) : null,
              batchType: item.type, // RAW_MATERIAL or BULK_RECEIVED
              status: item.type,
              arrivalDate,
              notes: item.notes || notes,
            },
          });

          // 2. Auto-create Work Order
          if (item.type === 'RAW_MATERIAL') {
            await tx.workOrder.create({
              data: {
                workOrderType: 'SLITTING',
                sourceBatchId: batch.id,
                orgId,
                status: 'OPEN',
                inputQuantity: item.quantity,
                createdBy: user.userId,
                notes: `Auto-created from Raw Inward: ${batchCode}`,
              },
            });
          } else if (item.type === 'BULK_RECEIVED') {
            await tx.workOrder.create({
              data: {
                workOrderType: 'REPACKAGING',
                sourceBatchId: batch.id,
                orgId,
                status: 'OPEN',
                inputQuantity: item.quantity,
                createdBy: user.userId,
                notes: `Auto-created from Bulk Inward: ${batchCode}`,
              },
            });
          }

          results.push(batch);
        }

        return {
          message: `${results.length} batches logged successfully.`,
          batchCodes: results.map(r => r.batchCode),
          items: results.map(r => ({ id: r.id, batchCode: r.batchCode })),
        };
      });
    } catch (e: any) {
      console.error('[INWARD PROCUREMENT ERROR]', e.message);
      throw e;
    }
  }

  async createRawInward(data: any, user: any) {
    if (!(await this.isHQUser(user))) {
      throw new InventoryException('UNAUTHORIZED_ACCESS', 'Only HQ users can log inward procurement.', HttpStatus.FORBIDDEN);
    }

    const orgId = await this.resolveOrgId(user);
    const batchCode = await this.generateBatchCode(data.filmTypeId);

    try {
      return await (this.prisma as any).$transaction(async (tx: any) => {
        const batch = await tx.filmBatch.create({
          data: {
            batchCode,
            filmTypeId: data.filmTypeId,
            vendorId: data.vendorId,
            orgId,
            quantity: data.quantity,
            packSize: data.packSize,
            batchType: 'RAW_MATERIAL',
            status: 'RAW_MATERIAL',
            arrivalDate: data.arrivalDate ? new Date(data.arrivalDate) : new Date(),
            notes: data.notes,
          },
        });

        await tx.workOrder.create({
          data: {
            workOrderType: 'SLITTING',
            sourceBatchId: batch.id,
            orgId,
            status: 'OPEN',
            inputQuantity: data.quantity,
            createdBy: user.userId,
            notes: `Auto-created from Raw Inward: ${batchCode}`,
          },
        });

        return batch;
      });
    } catch (e: any) {
      console.error('[RAW INWARD ERROR]', e.message, 'Code:', e.code, 'Meta:', JSON.stringify(e.meta));
      throw e;
    }
  }

  // --- BATCH MANAGEMENT ---

  async findAllBatches(query: any, user: any) {
    const { page = 1, limit = 20, status, type, filmTypeId, vendorId, search, inwardReceiptId } = query;
    const skip = (page - 1) * limit;
    
    const allowedOrgIds = await this.orgsService.getAllowedOrgIds(user);

    const where: any = {};
    if (status) where.status = status;
    if (type) where.batchType = type;
    if (filmTypeId) where.filmTypeId = filmTypeId;
    if (vendorId) where.vendorId = vendorId;
    if (search) {
      where.batchCode = { contains: search, mode: 'insensitive' };
    }
    if (inwardReceiptId) {
      where.inwardReceiptId = inwardReceiptId;
    }

    if (allowedOrgIds !== null) {
      where.orgId = { in: allowedOrgIds };
    }

    const [items, total] = await Promise.all([
      (this.prisma as any).filmBatch.findMany({
        where,
        include: {
          filmType: true,
          vendor: true,
          organization: true,
          inwardReceipt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: Number(skip),
        take: Number(limit),
      }),
      (this.prisma as any).filmBatch.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneBatch(id: string) {
    const batch = await (this.prisma as any).filmBatch.findUnique({
      where: { id },
      include: {
        filmType: true,
        vendor: true,
        organization: true,
        parentBatch: true,
        childBatches: {
          include: {
            filmType: true,
          }
        },
        qrCodes: {
          select: {
            id: true,
            status: true,
          }
        }
      },
    });

    if (!batch) throw new InventoryException('BATCH_NOT_FOUND', 'Batch not found', HttpStatus.NOT_FOUND);

    // Aggregate QR Summary
    const qrSummary = batch.qrCodes.reduce((acc: any, qr: any) => {
      acc[qr.status] = (acc[qr.status] || 0) + 1;
      acc.total = (acc.total || 0) + 1;
      return acc;
    }, {});

    return {
      ...batch,
      qrSummary,
    };
  }

  async updateBatch(id: string, data: any, user: any) {
    if (!(await this.isHQUser(user))) {
      throw new InventoryException('UNAUTHORIZED_ACCESS', 'Only HQ users can update batches.', HttpStatus.FORBIDDEN);
    }
    const batch = await (this.prisma as any).filmBatch.findUnique({ where: { id } });
    if (!batch) throw new InventoryException('BATCH_NOT_FOUND', 'Batch not found', HttpStatus.NOT_FOUND);

    const updatedBatch = await (this.prisma as any).filmBatch.update({
      where: { id },
      data: {
        notes: data.notes !== undefined ? data.notes : batch.notes,
        packSize: data.packSize !== undefined 
          ? data.packSize 
          : (batch.batchType === 'RAW_MATERIAL' && data.rollLength && data.rollWidth 
              ? `${data.rollLength}m x ${data.rollWidth}m` 
              : batch.packSize),
        arrivalDate: data.arrivalDate ? new Date(data.arrivalDate) : batch.arrivalDate,
        quantity: data.quantity !== undefined ? Number(data.quantity) : batch.quantity,
        rollLength: data.rollLength !== undefined ? Number(data.rollLength) : batch.rollLength,
        rollWidth: data.rollWidth !== undefined ? Number(data.rollWidth) : batch.rollWidth,
      },
      include: { filmType: true, vendor: true },
    });

    // Sync input quantity to associated OPEN work orders if quantity changed
    if (data.quantity !== undefined) {
      await (this.prisma as any).workOrder.updateMany({
        where: {
          sourceBatchId: id,
          status: 'OPEN'
        },
        data: {
          inputQuantity: Number(data.quantity)
        }
      });
    }

    return updatedBatch;
  }

  async deleteBatch(id: string, user: any) {
    if (!(await this.isHQUser(user))) {
      throw new InventoryException('UNAUTHORIZED_ACCESS', 'Only HQ users can delete batches.', HttpStatus.FORBIDDEN);
    }
    const batch = await (this.prisma as any).filmBatch.findUnique({ where: { id } });
    if (!batch) throw new InventoryException('BATCH_NOT_FOUND', 'Batch not found', HttpStatus.NOT_FOUND);

    // Only allow deletion of batches that haven't been dispatched or processed
    const nonDeletable = ['IN_TRANSIT', 'AT_DISTRIBUTOR', 'AT_RETAILER', 'QR_APPLIED'];
    if (nonDeletable.includes(batch.status)) {
      throw new InventoryException('CANNOT_DELETE', `Cannot delete a batch with status "${batch.status}".`, HttpStatus.BAD_REQUEST);
    }

    // Soft delete
    return (this.prisma as any).filmBatch.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async restoreBatch(id: string, user: any) {
    if (!(await this.isHQUser(user))) {
      throw new InventoryException('UNAUTHORIZED_ACCESS', 'Only HQ users can restore batches.', HttpStatus.FORBIDDEN);
    }
    const batch = await (this.prisma as any).filmBatch.findUnique({ where: { id } });
    if (!batch) throw new InventoryException('BATCH_NOT_FOUND', 'Batch not found', HttpStatus.NOT_FOUND);

    return (this.prisma as any).filmBatch.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
    });
  }

  async purgeBatch(id: string, user: any) {
    if (!(await this.isHQUser(user))) {
      throw new InventoryException('UNAUTHORIZED_ACCESS', 'Only Super Admin can permanently delete batches.', HttpStatus.FORBIDDEN);
    }
    if (!user.isSuperAdmin) {
      throw new InventoryException('UNAUTHORIZED_ACCESS', 'Only Super Admin can permanently delete batches.', HttpStatus.FORBIDDEN);
    }
    
    // First remove QR codes if any, or other direct children that aren't cascading
    await (this.prisma as any).qRCode.deleteMany({ where: { batchId: id } });
    
    return (this.prisma as any).filmBatch.delete({
      where: { id },
    });
  }


  // --- WORK ORDERS ---

  async findAllWorkOrders(query: any, user: any) {
    const { page = 1, limit = 20, status, type, search } = query;
    const skip = (page - 1) * limit;
    const allowedOrgIds = await this.orgsService.getAllowedOrgIds(user);

    const where: any = {};
    if (status) where.status = status;
    if (type) where.workOrderType = type;
    if (search) {
      where.sourceFilmBatch = {
        batchCode: { contains: search, mode: 'insensitive' }
      };
    }
    if (allowedOrgIds !== null) where.orgId = { in: allowedOrgIds };

    const [items, total] = await Promise.all([
      (this.prisma as any).workOrder.findMany({
        where,
        include: {
          sourceFilmBatch: { include: { filmType: true } },
          creator: { select: { firstName: true, lastName: true, email: true } },
          outputs: { include: { filmType: true, outputBatch: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: Number(skip),
        take: Number(limit),
      }),
      (this.prisma as any).workOrder.count({ where }),
    ]);

    return {
      items,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
    };
  }

  async findOneWorkOrder(id: string, user: any) {
    const allowedOrgIds = await this.orgsService.getAllowedOrgIds(user);
    const wo = await (this.prisma as any).workOrder.findUnique({
      where: { id },
      include: {
        sourceFilmBatch: { include: { filmType: true } },
        creator: { select: { firstName: true, lastName: true, email: true } },
        outputs: { include: { filmType: true, outputBatch: true } }
      },
    });

    if (!wo) throw new InventoryException('WORK_ORDER_NOT_FOUND', 'Work order not found', HttpStatus.NOT_FOUND);
    if (allowedOrgIds !== null && !allowedOrgIds.includes(wo.orgId)) {
      throw new InventoryException('UNAUTHORIZED_ACCESS', 'You do not have access to this work order.', HttpStatus.FORBIDDEN);
    }

    return wo;
  }

  // Adds multiple output entries — can be called multiple times while WO is OPEN or IN_PROGRESS
  async addWorkOrderOutput(id: string, data: any, user: any) {
    try {
      if (!(await this.isHQUser(user))) {
        throw new InventoryException('UNAUTHORIZED_ACCESS', 'Only HQ users can record work order outputs.', HttpStatus.FORBIDDEN);
      }

      const wo = await (this.prisma as any).workOrder.findUnique({
        where: { id },
        include: { sourceFilmBatch: true },
      });

      if (!wo) throw new InventoryException('WORK_ORDER_NOT_FOUND', 'Work order not found', HttpStatus.NOT_FOUND);
      if (wo.status === 'CLOSED') throw new InventoryException('ALREADY_CLOSED', 'Work order is already finalized.');

      const sourceBatch = wo.sourceFilmBatch;
      const { outputs, sourceUnitsConsumed } = data;
      
      if (!Array.isArray(outputs) || outputs.length === 0) {
        throw new InventoryException('INVALID_INPUT', 'At least one output entry is required.');
      }

      const totalToDecrement = sourceUnitsConsumed !== undefined 
        ? Number(sourceUnitsConsumed) 
        : this.calculateConsumption(wo, outputs);

      // Final safety check to prevent DB errors
      const safeDecrement = isNaN(totalToDecrement) || !isFinite(totalToDecrement) ? 0 : totalToDecrement;

      // Validate against remaining source batch quantity
      if (sourceBatch.quantity < safeDecrement) {
        throw new InventoryException('INSUFFICIENT_QUANTITY', `Only ${sourceBatch.quantity} units remain in source batch.`);
      }

      return await (this.prisma as any).$transaction(async (tx: any) => {
        // Decrement source batch
        await tx.filmBatch.update({
          where: { id: sourceBatch.id },
          data: { quantity: { decrement: safeDecrement } },
        });

        const typeOffsets: Record<string, number> = {};

        for (const output of outputs) {
          if (!output.filmTypeId || !output.quantity) continue;
          
          const currentOffset = typeOffsets[output.filmTypeId] || 0;
          const outputPackSize = output.packSize || (output.rollLength && output.rollWidth ? `${output.rollLength}m x ${output.rollWidth}m` : '');
          const childBatchCode = await this.generateBatchCode(output.filmTypeId, currentOffset, tx);
          
          typeOffsets[output.filmTypeId] = currentOffset + 1;
          
          const childBatch = await tx.filmBatch.create({
            data: {
              batchCode: childBatchCode,
              filmTypeId: output.filmTypeId,
              vendorId: sourceBatch.vendorId,
              orgId: sourceBatch.orgId,
              inwardReceiptId: sourceBatch.inwardReceiptId,
              parentBatchId: sourceBatch.id,
              quantity: Number(output.quantity),
              packSize: outputPackSize,
              rollLength: output.rollLength ? Number(output.rollLength) : null,
              rollWidth: output.rollWidth ? Number(output.rollWidth) : null,
              batchType: 'WORK_ORDER_OUTPUT',
              status: 'PACKAGED',
            },
          });

          await tx.workOrderOutput.create({
            data: {
              workOrderId: wo.id,
              outputBatchId: childBatch.id,
              filmTypeId: output.filmTypeId,
              deviceModel: output.deviceModel || 'N/A',
              packSize: outputPackSize,
              quantity: Number(output.quantity),
            },
          });
        }

        // Compute running totals
        const allOutputs = await tx.workOrderOutput.findMany({ where: { workOrderId: wo.id } });
        const runningOutputTotal = allOutputs.reduce((s: number, o: any) => s + Number(o.quantity), 0);

        return await tx.workOrder.update({
          where: { id: wo.id },
          data: {
            status: 'IN_PROGRESS',
            outputQuantity: runningOutputTotal,
          },
        });
      });

      // Fetch the updated work order with all inclusions for the response
      return await this.findOneWorkOrder(id, user);
    } catch (e: any) {
      const errLog = `[${new Date().toISOString()}] ADD_WO_OUTPUT_ERROR: ${e.message}\n${e.stack}\n`;
      fs.appendFileSync('inventory_errors.log', errLog);
      console.error('[ADD_WORK_ORDER_OUTPUT_ERROR]', e);
      if (e instanceof InventoryException) throw e;
      throw new InventoryException('INTERNAL_ERROR', e.message || 'Failed to record work order output');
    }
  }

  // Finalizes and locks the work order — calculates remaining quantity as wastage
  async finalizeWorkOrder(id: string, user: any) {
    if (!(await this.isHQUser(user))) {
      throw new InventoryException('UNAUTHORIZED_ACCESS', 'Only HQ users can finalize work orders.', HttpStatus.FORBIDDEN);
    }

    const wo = await (this.prisma as any).workOrder.findUnique({
      where: { id },
      include: { sourceFilmBatch: true },
    });

    if (!wo) throw new InventoryException('WORK_ORDER_NOT_FOUND', 'Work order not found', HttpStatus.NOT_FOUND);
    if (wo.status === 'CLOSED') throw new InventoryException('ALREADY_CLOSED', 'Work order is already finalized.');
    if (wo.outputQuantity == null || wo.outputQuantity === 0) {
      throw new InventoryException('NO_OUTPUTS', 'Record at least one output before finalizing.');
    }

    const sourceBatch = wo.sourceFilmBatch;
    // Remaining source quantity is wastage
    const wastage = sourceBatch.quantity;

    return (this.prisma as any).$transaction(async (tx: any) => {
      // If any source material remains, it's wasted — zero it out
      if (wastage > 0) {
        await (tx.filmBatch as any).update({
          where: { id: sourceBatch.id },
          data: { quantity: 0 },
        });
      }

      await (tx.auditLog as any).create({
        data: {
          userId: user.id,
          action: 'STATUS_CHANGE',
          entity: 'WorkOrder',
          entityId: wo.id,
          details: { old_status: wo.status, new_status: 'CLOSED', wastage_units: wastage },
        },
      });

      return (tx.workOrder as any).update({
        where: { id: wo.id },
        data: {
          status: 'CLOSED',
          wastageQuantity: wastage,
          closedAt: new Date(),
        },
        include: { outputs: { include: { outputBatch: true } } },
      });
    });
  }

  // Legacy one-shot close — kept for backward compat, now delegates to add+finalize flow
  async closeWorkOrder(id: string, data: any, user: any) {
    await this.addWorkOrderOutput(id, { output: data.outputs?.[0] }, user);
    return this.finalizeWorkOrder(id, user);
  }
  // --- QR CODES ---

  async generateQRCodes(batchId: string, data: { individualCount: number, masterBoxCount: number }, user: any) {
    if (!(await this.isHQUser(user))) {
      throw new InventoryException('UNAUTHORIZED_ACCESS', 'Only HQ users can generate QR codes.', HttpStatus.FORBIDDEN);
    }

    const { individualCount = 0, masterBoxCount = 0 } = data;
    const totalRequested = individualCount + masterBoxCount;

    if (totalRequested <= 0) {
      throw new InventoryException('INVALID_REQUEST', 'Requested QR count must be greater than 0');
    }

    const batch = await (this.prisma as any).filmBatch.findUnique({
      where: { id: batchId },
      include: { filmType: true },
    });

    if (!batch) {
      throw new InventoryException('BATCH_NOT_FOUND', 'Batch not found', HttpStatus.NOT_FOUND);
    }

    if (batch.status !== 'PACKAGED' && batch.status !== 'QR_APPLIED') {
      throw new InventoryException('INVALID_STATUS', 'QR generation is only allowed for PACKAGED or QR_APPLIED batches');
    }

    if (!batch.filmType.requiresQr) {
      return { success: true, message: 'QR not required for this SKU' };
    }

    const todayDateStr = new Date().toISOString().split('T')[0];
    const todayDate = new Date(todayDateStr);

    return (this.prisma as any).$transaction(async (tx: any) => {
      const dailyLog = await tx.qRDailyLog.findUnique({
        where: { date: todayDate }
      });

      const existingTotal = dailyLog ? dailyLog.totalGenerated : 0;
      const HARD_LIMIT = 1000000;

      if (existingTotal + totalRequested > HARD_LIMIT) {
        throw new InventoryException(
          'DAILY_CAP_REACHED', 
          `Daily QR generation limit reached. Remaining quota: ${HARD_LIMIT - existingTotal}`, 
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      // Generate UUIDs isn't supported out of the box with default createMany returning IDs in all DBs,
      // but Prisma can insert them defaults.
      const qrRecords: any[] = [];
      const now = new Date();
      const masterInfo: { id: string, seq: number }[] = [];

      // Get existing counts for this batch to continue numbering
      const existingMasters = await tx.qRCode.count({
        where: { filmBatchId: batch.id, qrType: 'MASTER_BOX' }
      });
      const existingStandalones = await tx.qRCode.count({
        where: { filmBatchId: batch.id, qrType: 'INDIVIDUAL', parentId: null }
      });

      // Generate Master Boxes with predefined UUIDs
      for (let i = 0; i < masterBoxCount; i++) {
        const mId = crypto.randomUUID();
        const currentMasterSeq = existingMasters + i + 1;
        masterInfo.push({ id: mId, seq: currentMasterSeq });
        qrRecords.push({
          id: mId,
          qrType: 'MASTER_BOX',
          filmBatchId: batch.id,
          filmTypeId: batch.filmTypeId,
          status: 'CREATED',
          generatedAt: now,
          sequenceNumber: `B${currentMasterSeq}`,
        });
      }

      // Distribute Individuals among Master Boxes
      const unitsPerBox = masterBoxCount > 0 ? Math.ceil(individualCount / masterBoxCount) : 0;
      
      for (let i = 0; i < individualCount; i++) {
        // If master boxes exist, assign parentId based on distribution
        const parentIdx = masterBoxCount > 0 ? Math.floor(i / unitsPerBox) : -1;
        const parent = parentIdx >= 0 ? masterInfo[Math.min(parentIdx, masterInfo.length - 1)] : null;
        const parentId = parent ? parent.id : null;

        let sequenceNumber = '';
        if (parent) {
          // Format as B[MasterNo]-[IndividualNo]
          const childNum = (i % unitsPerBox) + 1;
          sequenceNumber = `B${parent.seq}-${childNum}`;
        } else {
          // Standalone
          sequenceNumber = `${existingStandalones + i + 1}`;
        }

        qrRecords.push({
          qrType: 'INDIVIDUAL',
          filmBatchId: batch.id,
          filmTypeId: batch.filmTypeId,
          status: 'CREATED',
          parentId: parentId,
          generatedAt: now,
          sequenceNumber,
        });
      }

      // Chunk inserts for large numbers
      const chunkSize = 10000;
      for (let i = 0; i < qrRecords.length; i += chunkSize) {
        const chunk = qrRecords.slice(i, i + chunkSize);
        await tx.qRCode.createMany({ data: chunk });
      }

      if (dailyLog) {
        await tx.qRDailyLog.update({
          where: { id: dailyLog.id },
          data: { totalGenerated: { increment: totalRequested } }
        });
      } else {
        await tx.qRDailyLog.create({
          data: {
            date: todayDate,
            totalGenerated: totalRequested
          }
        });
      }

      if (batch.status !== 'QR_APPLIED') {
        await tx.filmBatch.update({
          where: { id: batch.id },
          data: { status: 'QR_APPLIED' }
        });

        await (tx.auditLog as any).create({
          data: {
            userId: user.id,
            action: 'STATUS_CHANGE',
            entity: 'FilmBatch',
            entityId: batch.id,
            details: { old_status: batch.status, new_status: 'QR_APPLIED', qrs_generated: totalRequested },
          },
        });
      }

      return {
        date: todayDateStr,
        total_generated: totalRequested,
        remaining_quota: HARD_LIMIT - (existingTotal + totalRequested),
        qr_details: {
          status: 'CREATED',
          batch: batch.batchCode,
          film_type: batch.filmType.name,
          device_model: null,
          assigned_dealer: null
        }
      };
    }, {
      // Increase timeout for large inserts
      timeout: 30000
    });
  }

  async getBatchQRCodes(batchId: string) {
    const qrs = await (this.prisma as any).qRCode.findMany({
      where: { filmBatchId: batchId, parentId: null },
      include: {
        children: {
          orderBy: { generatedAt: 'asc' }
        }
      },
      orderBy: { generatedAt: 'asc' },
    });

    // Handle potential snake_case from direct DB mapping in some environments
    return qrs.map((qr: any) => ({
      ...qr,
      sequenceNumber: qr.sequenceNumber || qr.sequence_number,
      children: qr.children?.map((c: any) => ({
        ...c,
        sequenceNumber: c.sequenceNumber || c.sequence_number
      }))
    }));
  }
  // --- DISPATCH & TRANSFERS ---

  private async getOrgType(orgId: string): Promise<string | null> {
    const org = await (this.prisma as any).organization.findUnique({
      where: { id: orgId },
      include: { organizationType: true },
    });
    return org?.organizationType?.name || null;
  }

  async createDispatch(data: any, user: any) {
    const { toOrgId, items, notes } = data; // items: Array<{ batchId: string, quantity: number }>
    const fromOrgId = user.organizationId;
    
    if (!fromOrgId) {
      throw new InventoryException('UNAUTHORIZED', 'User has no organization assigned', HttpStatus.UNAUTHORIZED);
    }

    const fromOrgType = await this.getOrgType(fromOrgId);
    const toOrgType = await this.getOrgType(toOrgId);

    // Validation Rules
    const isHQ = fromOrgType === 'parent' || fromOrgType === 'internal';
    const isDist = fromOrgType === 'distributor';

    if (isHQ && toOrgType !== 'distributor') {
      throw new InventoryException('INVALID_TRANSFER', 'HQ can only dispatch to Distributors');
    }
    if (isDist && toOrgType !== 'dealer' && toOrgType !== 'retailer') {
      throw new InventoryException('INVALID_TRANSFER', 'Distributors can only dispatch to Dealers or Retailers');
    }

    return (this.prisma as any).$transaction(async (tx: any) => {
      // 1. Fetch all selected QRs with their children if they are Master Boxes
      const selectedQrs = await tx.qRCode.findMany({
        where: { id: { in: data.qrIds } },
        include: { children: true }
      });

      if (selectedQrs.length === 0) {
        throw new InventoryException('NO_ITEMS', 'No valid QR codes selected for dispatch');
      }

      // 2. Expand hierarchy: If a master is selected, we move its children too
      const allQrIdsToMove = new Set<string>();
      selectedQrs.forEach((qr: any) => {
        allQrIdsToMove.add(qr.id);
        if (qr.children) {
          qr.children.forEach((c: any) => allQrIdsToMove.add(c.id));
        }
      });

      const finalQrs = await tx.qRCode.findMany({
        where: { id: { in: Array.from(allQrIdsToMove) } },
        include: { filmBatch: { include: { filmType: true } } }
      });

      // 3. Create Dispatch Order
      const dispatchOrder = await tx.dispatchOrder.create({
        data: {
          fromOrgId,
          toOrgId,
          dispatchDate: new Date(),
          status: 'DISPATCHED',
          createdBy: user.userId,
          notes,
        },
      });

      // 4. Group by Batch to create transit batches
      const qrsByBatch = finalQrs.reduce((acc: any, qr: any) => {
        const bid = qr.filmBatchId;
        if (!acc[bid]) acc[bid] = { batch: qr.filmBatch, qrs: [] };
        acc[bid].qrs.push(qr);
        return acc;
      }, {});

      for (const batchId of Object.keys(qrsByBatch)) {
        const { batch, qrs } = qrsByBatch[batchId];
        
        // Quantity to move: count of INDIVIDUAL units (not master boxes)
        const individualQrs = qrs.filter((q: any) => q.qrType === 'INDIVIDUAL');
        const quantityToMove = individualQrs.length || qrs.length;

        // 1. Deduct from source
        await tx.filmBatch.update({
          where: { id: batch.id },
          data: { quantity: { decrement: quantityToMove } },
        });

        // 2. Create Transit Batch (Child)
        const transitBatch = await tx.filmBatch.create({
          data: {
            batchCode: batch.batchCode,
            filmTypeId: batch.filmTypeId,
            vendorId: batch.vendorId,
            orgId: fromOrgId,
            parentBatchId: batch.id,
            quantity: quantityToMove,
            packSize: batch.packSize,
            batchType: batch.batchType,
            status: 'IN_TRANSIT',
          },
        });

        // 3. Update QRs status and link to transit batch
        await tx.qRCode.updateMany({
          where: { id: { in: qrs.map((q: any) => q.id) } },
          data: { 
            status: 'IN_TRANSIT',
            filmBatchId: transitBatch.id
          },
        });

        // 4. Create Dispatch Order Item
        await tx.dispatchOrderItem.create({
          data: {
            dispatchOrderId: dispatchOrder.id,
            filmBatchId: transitBatch.id,
            quantityDispatched: quantityToMove,
            quantityReceived: 0,
          },
        });

        // 5. Audit Log
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'STATUS_CHANGE',
            entity: 'FilmBatch',
            entityId: transitBatch.id,
            details: { old_status: batch.status, new_status: 'IN_TRANSIT', dispatchId: dispatchOrder.id, qrsMoved: qrs.length },
          },
        });
      }

      return dispatchOrder;
    });
  }

  async receiveDispatch(id: string, data: any, user: any) {
    const { receivedItems } = data; // Array<{ itemId: string, receivedQuantity: number }>
    const toOrgId = user.organizationId;

    const dispatch = await (this.prisma as any).dispatchOrder.findUnique({
      where: { id },
      include: { items: { include: { filmBatch: { include: { filmType: true } } } } },
    });

    if (!dispatch) throw new InventoryException('DISPATCH_NOT_FOUND', 'Dispatch order not found', HttpStatus.NOT_FOUND);
    if (dispatch.toOrgId !== toOrgId) {
      throw new InventoryException('UNAUTHORIZED', 'Only the receiving organization can accept this dispatch', HttpStatus.FORBIDDEN);
    }
    if (dispatch.status === 'RECEIVED') {
      throw new InventoryException('ALREADY_RECEIVED', 'This dispatch order has already been processed');
    }

    const toOrgType = await this.getOrgType(toOrgId);
    const targetStatus = toOrgType === 'distributor' ? 'AT_DISTRIBUTOR' : 'AT_RETAILER';

    return (this.prisma as any).$transaction(async (tx: any) => {
      for (const receiveItem of receivedItems) {
        const item = dispatch.items.find((i: any) => i.id === receiveItem.itemId);
        if (!item) continue;

        const batch = item.filmBatch;

        // Update Batch ownership and status
        await tx.filmBatch.update({
          where: { id: batch.id },
          data: {
            orgId: toOrgId,
            status: targetStatus,
            quantity: receiveItem.receivedQuantity, // Credit what was actually received
          },
        });

        // Update Item quantities
        await tx.dispatchOrderItem.update({
          where: { id: item.id },
          data: { quantityReceived: receiveItem.receivedQuantity },
        });

        // Update QRs status if they were in transit
        if (batch.filmType.requiresQr) {
          const finalQrStatus = (toOrgType === 'dealer' || toOrgType === 'retailer') ? 'ASSIGNED' : 'CREATED';
          await tx.qRCode.updateMany({
            where: { filmBatchId: batch.id, status: 'IN_TRANSIT' },
            data: { 
              status: finalQrStatus,
              assignedOrgId: toOrgId
            },
          });
        }

        // Audit Log
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'STATUS_CHANGE',
            entity: 'FilmBatch',
            entityId: batch.id,
            details: { 
              old_status: 'IN_TRANSIT', 
              new_status: targetStatus, 
              received_quantity: receiveItem.receivedQuantity,
              discrepancy: item.quantityDispatched - receiveItem.receivedQuantity
            },
          },
        });
      }

      return tx.dispatchOrder.update({
        where: { id },
        data: { status: 'RECEIVED' },
      });
    });
  }

  async findAllDispatches(query: any, user: any) {
    const { page = 1, limit = 20, status, fromOrgId, toOrgId } = query;
    const skip = (page - 1) * limit;
    
    // Scoping: Only see dispatches where user's org is sender or receiver
    const orgId = user.organizationId;
    const where: any = {};
    if (status) where.status = status;
    
    if (user.isSuperAdmin) {
      if (fromOrgId) where.fromOrgId = fromOrgId;
      if (toOrgId) where.toOrgId = toOrgId;
    } else {
      where.OR = [
        { fromOrgId: orgId },
        { toOrgId: orgId }
      ];
      if (fromOrgId) where.fromOrgId = fromOrgId;
      if (toOrgId) where.toOrgId = toOrgId;
    }

    const [items, total] = await Promise.all([
      (this.prisma as any).dispatchOrder.findMany({
        where,
        include: {
          fromOrganization: true,
          toOrganization: true,
          creator: { select: { firstName: true, lastName: true } },
          items: { include: { filmBatch: { include: { filmType: true } } } }
        },
        orderBy: { createdAt: 'desc' },
        skip: Number(skip),
        take: Number(limit),
      }),
      (this.prisma as any).dispatchOrder.count({ where }),
    ]);

    return {
      items,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
    };
  }
}
