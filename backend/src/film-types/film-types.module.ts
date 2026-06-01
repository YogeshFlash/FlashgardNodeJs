import { Module } from '@nestjs/common';
import { FilmTypesService } from './film-types.service';
import { FilmTypesController } from './film-types.controller';

@Module({
  controllers: [FilmTypesController],
  providers: [FilmTypesService],
  exports: [FilmTypesService],
})
export class FilmTypesModule {}
