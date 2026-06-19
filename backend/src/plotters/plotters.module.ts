import { Module } from '@nestjs/common';
import { PlottersService } from './plotters.service';
import { PlottersController } from './plotters.controller';
import { PlotterDevicesService } from './plotter-devices.service';
import { PlotterDevicesController } from './plotter-devices.controller';

@Module({
  controllers: [PlottersController, PlotterDevicesController],
  providers: [PlottersService, PlotterDevicesService],
  exports: [PlottersService, PlotterDevicesService],
})
export class PlottersModule {}
