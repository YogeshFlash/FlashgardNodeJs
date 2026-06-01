import { Module } from '@nestjs/common';
import { CutCreditsService } from './cut-credits.service';
import { CutCreditsController } from './cut-credits.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CutCreditsController],
  providers: [CutCreditsService],
  exports: [CutCreditsService],
})
export class CutCreditsModule {}
