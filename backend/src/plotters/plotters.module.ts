import { Module } from '@nestjs/common';
import { PlottersService } from './plotters.service';
import { PlottersController } from './plotters.controller';

@Module({
  controllers: [PlottersController],
  providers: [PlottersService],
  exports: [PlottersService],
})
export class PlottersModule {}
