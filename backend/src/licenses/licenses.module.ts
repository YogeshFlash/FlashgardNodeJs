import { Module } from '@nestjs/common';
import { LicensesService } from './licenses.service';
import { LicensesController } from './licenses.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BackgroundTasksService } from './background-tasks.service';

@Module({
  imports: [PrismaModule],
  controllers: [LicensesController],
  providers: [LicensesService, BackgroundTasksService],
  exports: [LicensesService],
})
export class LicensesModule {}
