import { Test, TestingModule } from '@nestjs/testing';
import { MigrationService } from './migration.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MigrationService', () => {
  let service: MigrationService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      organization: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'org-1', legacyId: 'dealer-legacy-1' }
        ]),
        findFirst: jest.fn().mockResolvedValue({ id: 'root-org-id', name: 'Flashgard' }),
        create: jest.fn(),
        update: jest.fn()
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue({ id: 'admin-id', isSuperAdmin: true })
      },
      cutCredit: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _sum: { credits: 100 } }),
        deleteMany: jest.fn()
      },
      legacyCutCredit: {
        deleteMany: jest.fn()
      },
      entityWallet: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'wallet-1' }),
        update: jest.fn(),
        deleteMany: jest.fn()
      },
      creditTransaction: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn()
      },
      organizationType: {
        findMany: jest.fn().mockResolvedValue([{ id: 'parent-type-id', name: 'parent' }])
      },
      orgLicense: {
        findFirst: jest.fn().mockResolvedValue(null)
      },
      migrationLog: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([])
      },
      $transaction: jest.fn(async (cb) => {
        return await cb(mockPrisma);
      })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MigrationService,
        {
          provide: PrismaService,
          useValue: mockPrisma
        }
      ],
    }).compile();

    service = module.get<MigrationService>(MigrationService);
    (service as any).logMigration = jest.fn().mockResolvedValue({});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('migrateCutCredits', () => {
    it('should correctly migrate assignments and recalculate wallets based on multi-type count data', async () => {
      const dealerAssignRows = [
        {
          Id: '101',
          CutCredits: '100',
          CutCreditType: 'TypeA',
          DealerId: 'dealer-legacy-1',
          OwnerId: 'owner-legacy-1',
          CreatedDate: '2026-01-01T12:00:00Z',
          IsDeleted: '0'
        },
        {
          Id: '102',
          CutCredits: '50',
          CutCreditType: 'TypeB',
          DealerId: 'dealer-legacy-1',
          OwnerId: 'owner-legacy-1',
          CreatedDate: '2026-01-02T12:00:00Z',
          IsDeleted: '0'
        },
        {
          Id: '103',
          CutCredits: '20',
          CutCreditType: 'TypeA',
          DealerId: 'dealer-legacy-1',
          OwnerId: 'owner-legacy-1',
          CreatedDate: '2026-01-03T12:00:00Z',
          IsDeleted: '1' // Deleted - should be skipped
        }
      ];

      const countRows = [
        {
          CutcreditAssignCountID: '501',
          CutCreditType: 'TypeA',
          DealerID: 'dealer-legacy-1',
          TotalCutcredit: '120',
          UsedCutcredit: '40',
          RemainingCutcredit: '80',
          CreatedDate: '2026-01-01T12:00:00Z'
        },
        {
          CutcreditAssignCountID: '502',
          CutCreditType: 'TypeB',
          DealerID: 'dealer-legacy-1',
          TotalCutcredit: '50',
          UsedCutcredit: '10',
          RemainingCutcredit: '40',
          CreatedDate: '2026-01-02T12:00:00Z'
        }
      ];

      mockPrisma.cutCredit.aggregate.mockResolvedValue({ _sum: { credits: 150 } });

      const result = await service.migrateCutCredits(dealerAssignRows, countRows, 'Test Source');

      expect(result.importedCredits).toBe(2);
      expect(result.skippedRows).toBe(0);

      expect(mockPrisma.cutCredit.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.entityWallet.update).toHaveBeenCalled();

      expect(mockPrisma.entityWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: expect.objectContaining({
          totalCredits: 150,
          usedCredits: 50,
          balance: 100,
          tenantId: 'org-1'
        })
      });

      expect(mockPrisma.creditTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: -50,
            type: 'DEBIT',
            source: 'LEGACY-USAGE-org-1'
          })
        })
      );
    });
  });
});

