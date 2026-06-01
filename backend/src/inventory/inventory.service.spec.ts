import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { InventoryException } from './inventory.exception';
import { HttpStatus } from '@nestjs/common';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: PrismaService;

  const mockPrisma: any = {
    organization: {
      findUnique: jest.fn(),
    },
    filmType: {
      findUnique: jest.fn(),
    },
    filmBatch: {
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    workOrder: {
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    workOrderOutput: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    qRDailyLog: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    qRCode: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    dispatchOrder: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    dispatchOrderItem: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  mockPrisma.$transaction = jest.fn((callback) => callback(mockPrisma));

  const mockOrgsService = {
    getAllowedOrgIds: jest.fn(),
  };

  const mockAuditLogsService = {
    createLog: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OrganizationsService, useValue: mockOrgsService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
      ],
    }).compile();
    
    jest.clearAllMocks();

    service = module.get<InventoryService>(InventoryService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('closeWorkOrder', () => {
    const mockUser = { id: 'user-1', isSuperAdmin: true, organizationId: 'org-1' };
    const mockWO = {
      id: 'wo-1',
      status: 'OPEN',
      workOrderType: 'SLITTING',
      inputQuantity: 100,
      orgId: 'org-1',
      sourceFilmBatch: {
        id: 'batch-1',
        status: 'RAW_MATERIAL',
        quantity: 150,
        vendorId: 'vendor-1',
        orgId: 'org-1',
      },
    };

    it('should throw if user is not HQ', async () => {
      // isSuperAdmin false, not HQ
      const nonHQUser = { id: 'u2', isSuperAdmin: false, organizationId: 'org-2' };
      mockPrisma.organization.findUnique.mockResolvedValue({ parentId: 'some-parent' });
      
      await expect(service.closeWorkOrder('wo-1', {}, nonHQUser))
        .rejects.toThrow(InventoryException);
    });

    it('should throw if work order is already closed', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue({ ...mockWO, status: 'CLOSED' });
      
      await expect(service.closeWorkOrder('wo-1', { outputs: [] }, mockUser))
        .rejects.toThrow(/already closed/);
    });

    it('should throw if source batch quantity is insufficient', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue({ 
        ...mockWO, 
        inputQuantity: 200, 
        sourceFilmBatch: { ...mockWO.sourceFilmBatch, quantity: 150 }
      });
      
      try {
        await service.closeWorkOrder('wo-1', { outputs: [] }, mockUser);
        fail('Should have thrown InventoryException');
      } catch (e: any) {
        expect(e).toBeInstanceOf(InventoryException);
        expect(e.getResponse().error_code).toBe('INSUFFICIENT_QUANTITY');
      }
    });

    it('should successfully close work order and create child batches', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWO);
      mockPrisma.organization.findUnique.mockResolvedValue({ parentId: null }); // HQ
      mockPrisma.filmType.findUnique.mockResolvedValue({ name: 'Alpha Clear' });
      mockPrisma.filmBatch.count.mockResolvedValue(0);
      mockPrisma.filmBatch.create.mockResolvedValue({ id: 'child-1' });

      const outputs = [
        { filmTypeId: 'ft-1', deviceModel: 'iPhone 15', packSize: 10, quantity: 90 }
      ];

      // Mock update to return the updated record
      mockPrisma.workOrder.update.mockResolvedValue({
        status: 'CLOSED',
        wastageQuantity: 10,
      });

      const result = await service.closeWorkOrder('wo-1', { outputs }, mockUser);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.status).toBe('CLOSED');
      expect(result.wastageQuantity).toBe(10);
    });
  });

  describe('generateQRCodes', () => {
    const mockUser = { id: 'u1', isSuperAdmin: true, organizationId: 'org-1' };

    it('should return 200 with message if requiresQr is false', async () => {
      mockPrisma.filmBatch.findUnique.mockResolvedValue({
        id: 'batch-1',
        status: 'PACKAGED',
        filmType: { requiresQr: false },
      });

      const result = await service.generateQRCodes('batch-1', { individualCount: 10, masterBoxCount: 0 }, mockUser);
      expect(result).toEqual({ success: true, message: 'QR not required for this SKU' });
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw DAILY_CAP_REACHED if limit exceeded', async () => {
      mockPrisma.filmBatch.findUnique.mockResolvedValue({
        id: 'batch-1',
        status: 'PACKAGED',
        filmType: { requiresQr: true },
      });

      mockPrisma.$transaction.mockImplementationOnce(async (cb: any) => {
        // Mock daily log check inside transaction
        mockPrisma.qRDailyLog.findUnique = jest.fn().mockResolvedValue({ totalGenerated: 999900 });
        return cb(mockPrisma);
      });

      try {
        await service.generateQRCodes('batch-1', { individualCount: 200, masterBoxCount: 0 }, mockUser);
        fail('Should have thrown InventoryException');
      } catch (e: any) {
        expect(e).toBeInstanceOf(InventoryException);
        expect(e.getResponse().error_code).toBe('DAILY_CAP_REACHED');
      }
    });

    it('should generate QRs successfully', async () => {
      mockPrisma.filmBatch.findUnique.mockResolvedValue({
        id: 'batch-1',
        batchCode: 'BATCH-001',
        status: 'PACKAGED',
        filmType: { name: 'Alpha Clear', requiresQr: true },
        filmTypeId: 'ft-1',
      });

      mockPrisma.qRCode = { createMany: jest.fn() };
      mockPrisma.qRDailyLog = {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
      };

      mockPrisma.$transaction.mockImplementationOnce(async (cb: any) => {
        return cb(mockPrisma);
      });

      const result = await service.generateQRCodes('batch-1', { individualCount: 100, masterBoxCount: 10 }, mockUser);
      
      expect(mockPrisma.qRDailyLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ totalGenerated: 110 })
      }));
      expect(mockPrisma.qRCode.createMany).toHaveBeenCalled();
      expect(result.total_generated).toBe(110);
    });
  });

  describe('createDispatch', () => {
    const mockUser = { id: 'u1', organizationId: 'org-1' };
    
    it('should throw if invalid transfer (HQ to Dealer)', async () => {
      mockPrisma.organization.findUnique.mockResolvedValueOnce({ name: 'org-1', organizationType: { name: 'parent' } }); // From HQ
      mockPrisma.organization.findUnique.mockResolvedValueOnce({ name: 'org-2', organizationType: { name: 'dealer' } }); // To Dealer
      
      await expect(service.createDispatch({ toOrgId: 'org-2', items: [] }, mockUser))
        .rejects.toThrow('HQ can only dispatch to Distributors');
    });

    it('should successfully create dispatch and update batches', async () => {
      mockPrisma.organization.findUnique.mockResolvedValueOnce({ name: 'org-1', organizationType: { name: 'parent' } }); // HQ
      mockPrisma.organization.findUnique.mockResolvedValueOnce({ name: 'org-2', organizationType: { name: 'distributor' } }); // To Dist
      
      const mockBatch = { id: 'b1', batchCode: 'B1', quantity: 100, filmType: { requiresQr: false } };
      mockPrisma.filmBatch.findUnique.mockResolvedValue(mockBatch);
      mockPrisma.dispatchOrder.create.mockResolvedValue({ id: 'd1' });
      mockPrisma.filmBatch.create.mockResolvedValue({ id: 'b-transit' });

      const result = await service.createDispatch({ 
        toOrgId: 'org-2', 
        items: [{ batchId: 'b1', quantity: 50 }] 
      }, mockUser);

      expect(mockPrisma.filmBatch.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'b1' },
        data: { quantity: { decrement: 50 } }
      }));
      expect(mockPrisma.filmBatch.create).toHaveBeenCalled();
      expect(result.id).toBe('d1');
    });
  });

  describe('receiveDispatch', () => {
    const mockUser = { id: 'u1', organizationId: 'org-dist' };
    const mockDispatch = {
      id: 'd1',
      toOrgId: 'org-dist',
      status: 'DISPATCHED',
      items: [
        { 
          id: 'di1', 
          filmBatch: { id: 'b-transit', filmType: { requiresQr: false }, quantity: 50 },
          quantityDispatched: 50
        }
      ]
    };

    it('should successfully receive items and update batch ownership', async () => {
      mockPrisma.dispatchOrder.findUnique.mockResolvedValue(mockDispatch);
      mockPrisma.organization.findUnique.mockResolvedValue({ organizationType: { name: 'distributor' } });
      mockPrisma.dispatchOrder.update.mockResolvedValue({ status: 'RECEIVED' });

      const result = await service.receiveDispatch('d1', {
        receivedItems: [{ itemId: 'di1', receivedQuantity: 48 }]
      }, mockUser);

      expect(mockPrisma.filmBatch.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'b-transit' },
        data: { orgId: 'org-dist', status: 'AT_DISTRIBUTOR', quantity: 48 }
      }));
      expect(mockPrisma.dispatchOrder.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'd1' },
        data: { status: 'RECEIVED' }
      }));
    });
  });
});
