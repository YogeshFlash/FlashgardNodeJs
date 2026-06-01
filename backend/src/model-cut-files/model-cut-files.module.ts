import { Module } from '@nestjs/common';
import { ModelCutFilesService } from './model-cut-files.service';
import { ModelCutFilesController } from './model-cut-files.controller';

@Module({
  controllers: [ModelCutFilesController],
  providers: [ModelCutFilesService],
  exports: [ModelCutFilesService],
})
export class ModelCutFilesModule {}
