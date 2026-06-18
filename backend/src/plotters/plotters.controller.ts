import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { PlottersService } from './plotters.service';

@Controller('plotters')
export class PlottersController {
  constructor(private readonly plottersService: PlottersService) {}

  @Post()
  create(@Body() data: any, @Req() req: any) {
    return this.plottersService.create(data, req.user);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('currentOwnerId') currentOwnerId?: string,
    @Query('currentLicenseId') currentLicenseId?: string,
    @Req() req?: any
  ) {
    return this.plottersService.findAll(
      { search, status, supplierId, currentOwnerId, currentLicenseId },
      req.user
    );
  }

  @Get('masters')
  findAllMasters() {
    return this.plottersService.findAllMasters();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.plottersService.findOne(id, req.user);
  }

  @Patch(':id/qa')
  updateQA(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.plottersService.updateQA(id, data, req.user);
  }

  @Patch(':id/distribute')
  distribute(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.plottersService.distribute(id, data, req.user);
  }

  @Patch(':id/assign')
  assignLicense(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.plottersService.assignLicense(id, data, req.user);
  }

  @Patch(':id/decommission')
  decommission(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.plottersService.decommission(id, data, req.user);
  }

  @Get(':id/logs')
  getLogs(@Param('id') id: string, @Req() req: any) {
    return this.plottersService.getLogs(id, req.user);
  }
}
