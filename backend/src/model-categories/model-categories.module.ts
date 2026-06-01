import { Module } from '@nestjs/common';
import { ModelCategoriesService } from './model-categories.service';
import { ModelCategoriesController } from './model-categories.controller';

@Module({
  controllers: [ModelCategoriesController],
  providers: [ModelCategoriesService],
  exports: [ModelCategoriesService],
})
export class ModelCategoriesModule {}
