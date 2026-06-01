import { Module } from '@nestjs/common';
import { CutPatternsService } from './cut-patterns.service';
import { CutPatternsController } from './cut-patterns.controller';

@Module({
  controllers: [CutPatternsController],
  providers: [CutPatternsService],
  exports: [CutPatternsService],
})
export class CutPatternsModule {}
