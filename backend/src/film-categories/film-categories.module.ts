import { Module } from '@nestjs/common';
import { FilmCategoriesService } from './film-categories.service';
import { FilmCategoriesController } from './film-categories.controller';

@Module({
  controllers: [FilmCategoriesController],
  providers: [FilmCategoriesService],
})
export class FilmCategoriesModule {}
