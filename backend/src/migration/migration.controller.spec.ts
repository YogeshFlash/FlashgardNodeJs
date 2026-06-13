import { Test, TestingModule } from '@nestjs/testing';
import { MigrationController } from './migration.controller';
import { MigrationService } from './migration.service';

describe('MigrationController', () => {
  let controller: MigrationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MigrationController],
      providers: [
        {
          provide: MigrationService,
          useValue: {
            migrateCatalog: jest.fn(),
            migrateSkins: jest.fn(),
            migrateRoles: jest.fn(),
            migrateUsers: jest.fn(),
            migrateLicenses: jest.fn(),
            migrateMobileUsers: jest.fn(),
            migrateCutCredits: jest.fn(),
            migrateDesigns: jest.fn(),
            migrateLocalDesigns: jest.fn(),
            generateAllImages: jest.fn(),
            generateImageForModel: jest.fn(),
            generateImageForCutFile: jest.fn(),
            getLogs: jest.fn(),
            downloadLogsCsv: jest.fn(),
            downloadFailuresCsv: jest.fn(),
            cleanData: jest.fn(),
            dbConnect: jest.fn(),
            dbRun: jest.fn()
          }
        }
      ]
    }).compile();

    controller = module.get<MigrationController>(MigrationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

