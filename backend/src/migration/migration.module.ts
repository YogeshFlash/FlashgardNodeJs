import { Module } from '@nestjs/common';
import { MigrationController } from './migration.controller';
import { MigrationService } from './migration.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      limits: {
        fileSize: 1024 * 1024 * 1024, // 1GB
        fieldSize: 1024 * 1024 * 1024, // 1GB
      },
    }),
  ],
  controllers: [MigrationController],
  providers: [MigrationService]
})
export class MigrationModule {}
